import {Client} from './client';
import {Player} from './player';

import fs = require('fs');
import {Game} from './game';
import {GameFactory} from './gamefactory';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as compression from 'compression';
import * as basicAuth from 'express-basic-auth';
import {Bracket} from './bracket';

const adminAuth = basicAuth({
    challenge: false,
    users: {
        // Why did the scarecrow get a promotion? Because he was
        // 'admin': 'Outstanding in his field',
    },
});

/**
 * This is the main HTTP server that manages connected players and games.
 *
 * Routes:
 *   POST /players - register a new player
 *     body: {name:'BenBot'}
 *     response: {token:'89ur3ofd'}
 *   DELETE /players (auth token)
 *   GET /players
 *   GET /players (game auth token, for use while waiting for players to join)
 *     response: Array of players invited to join this game
 *
 *   POST /games - Set up a new game
 *     body: {
 *       name:'Round 4',
 *       players: [player names], //If specified, games starts when these exact
 *                                //players join. If not, game is open to any
 *                                //player and must be started manually.
 *     }
 *     response: {name:'final calculated name', token:'y9278539'}
 *   GET /games (auth token)
 *     response: Array of strings, names of all games eligible to join
 *
 * This is the endpoint that actually interacts with the game itself, and
 * the initial POST to this endpoint is "joining" the specified game.
 * The initial POST to this endpoint by the game's own auth token starts the
 * game as soon as it is eligible to be started.
 *   POST /games/<gamename> (auth token)
 *     body: {game-specific inputs, such as move data} response:
 *     {game-specific game state}
 */
class Lobby {
    private readonly express = express();
    private clients = new Map<string, Client>(); // Token => Client

    constructor(port: number) {
        console.log('Listening on port ' + port);

        this.express.use(compression());
        this.express.use(express.static('../tournament/dist'));
        this.express.use(express.static('res'));
        this.express.use(express.static('../sdks'));

        this.express.get('/', (req: express.Request, res: express.Response) => res.redirect('/tournament'));

        this.express.post('/players', bodyParser.json(), this.registerPlayer.bind(this)); // Access: Public
        this.express.get('/players', this.listPlayers.bind(this)); // Access: Public
        this.express.delete('/players', this.leave.bind(this)); // Access: Players

        this.express.post('/games', bodyParser.json(), this.registerGame.bind(this)); // Access: Admin
        this.express.get('/games', this.listGames.bind(this)); // Access: Players
        this.express.post('/games/:gameName', bodyParser.json(), this.processMove.bind(this)); // Access: Game/player
        this.express.get('/games/:gameName/history', this.getHistory.bind(this)); // Access: Public
        this.express.get('/historicalgames', this.getHistoricalGames.bind(this)); // Access: Public
        this.express.get('/history/:gameName', this.getGameHistory.bind(this)); // Access: Public

        this.express.get('/brackets/:name', this.getBracket.bind(this)); // Access: Public
        this.express.post(
            '/brackets/:name/slots/:id', bodyParser.json(), this.updateBracketSlot.bind(this)
        ); // Access: Admin

        this.express.use((req, res) => {
            res.status(404).send(
                '<html><body>wtfmate<br/><iframe width="560" height="315" src="https://www.youtube.com/embed/kCpjgl2baLs" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></body></html>'
            );
        });
        this.express.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
            console.error(err.stack);
            res.status(500).send('Something broke!');
        });

        this.express.listen(port);

        setInterval(() => this.evictClients(), 500);
    }

    private evictClients() {
        const players = this.players();
        const evictDeadline = Date.now() - 5000;
        players.forEach(player => {
            if (!player.game && player.lastSeen < evictDeadline) {
                console.log('evicting player', player.name);
                this.deletePlayer(player);
            }
        });

        this.games().forEach(game => {
            if (!game.started && game.lastSeen < evictDeadline) {
                console.log('game abandoned', game.name);
                this.deleteGame(game);
            }

            if (game.over && game.lastSeen < evictDeadline) {
                console.log('deleting game', game.name);
                this.deleteGame(game);
            }
        });
    }

    private authenticate(req: express.Request, res?: express.Response): Client|undefined {
        if (req.headers.authorization) {
            if (req.headers.authorization.startsWith('Bearer ')) {
                const token = req.headers.authorization.substr('Bearer '.length);
                const client = this.clients.get(token);
                if (client) {
                    const ip = req.connection.remoteAddress || '';
                    if (client.ip && client.ip != ip) {
                        if (res) {
                            res.sendStatus(401);
                        }
                        return undefined;
                    }
                    //   console.log('Found client ' + client.name + ' for bearer token '
                    //   +
                    //               token);
                    return client;
                }
            }
        }
        if (res) {
            res.sendStatus(401);
        }
        return undefined;
    }

    private async registerPlayer(req: express.Request, res: express.Response) {
        console.log('Registering player with content', req.body);
        if (!req.body.name) {
            res.status(400).send('Error');
        } else {
            // Only one persistent player per remote IP address to ensure there's space in the game for everyone.
            // Exception for local connections, for debugging.
            const ip = req.connection.remoteAddress || '';
            console.log('Player connected from IP', ip);
            if (req.body.persistent && ip && ip != req.connection.localAddress) {
                for (let [key, old] of this.clients) {
                    if (old instanceof Player && old.ip === ip && old.persistent) {
                        // Boot this old player to make space for the new one.
                        console.log('Duplicate persistent players; removing ' + old.name);
                        this.deletePlayer(old);
                    }
                }
            }

            const player = new Player(
                req.body.name,
                new Set(this.players().map(p => p.name)),
                !!req.body.persistent,
                ip,
            );
            this.clients.set(player.token, player);

            res.status(201).send(player.serialize(true));
        }
    }

    private async listPlayers(req: express.Request, res: express.Response) {
        let players = this.players().map(p => p.serialize());
        const client = this.authenticate(req);
        if (client instanceof Game) {
            client.lastSeen = Date.now();
            if (client.persistent) {
                players = [];
            } else {
                if (client.requestedPlayers.size > 0) {
                    players = players.filter(p => client.requestedPlayers.has(p.name));
                }
                players.forEach(p => {
                    if (p.game === client.name) {
                        p.joined = true;
                    }
                });
            }
        }
        res.status(200).send(players);
    }

    private async leave(req: express.Request, res: express.Response) {
        const player = this.authenticate(req, res);
        if (player instanceof Player) {
            this.deletePlayer(player);
            res.sendStatus(204);
        } else if (player) {
            res.sendStatus(403);
        }
    }

    private async registerGame(req: express.Request, res: express.Response) {
        console.log('Registering game with content', req.body);
        if (!req.body.name) {
            res.status(400).send('Error');
        } else {
            const currentGames = this.games().map(g => g.name);
            const savedGames = await this.listHistoricalGames();
            const usedNames = new Set<string>([...currentGames, ...savedGames]);
            if (req.body.persistent) {
                if (this.games().some(g => !g.over && g.persistent)) {
                    res.status(400).send(JSON.stringify({error: 'Already have a running persistent game'}));
                    return;
                }
            }
            const game = GameFactory.create(
                req.body.name,
                usedNames,
                req.body.players,
                !!req.body.persistent,
            );
            this.clients.set(game.token, game);
            res.status(201).send(game.serialize(true));
        }
    }

    private listHistoricalGames(): Promise<string[]> {
        return new Promise(resolve => {
            fs.readdir('.', (err, files) => {
                const gameLogs = files.filter(f => f.endsWith('.log.gz'));
                const times = new Map<string, number>();
                if (gameLogs.length == 0) {
                    resolve([]);
                } else {
                    gameLogs.forEach(log => {
                        fs.stat(log, (err, stats) => {
                            times.set(log, stats.mtime.getTime());
                            if (times.size == gameLogs.length) {
                                gameLogs.sort((a, b) => {
                                    return (times.get(b) || 0) - (times.get(a) || 0);
                                });
                                const names = gameLogs.map(g => g.slice('game-'.length, -('.log.gz'.length)));
                                resolve(names);
                            }
                        });
                    });
                }

            });
        });
    }

    private async listGames(req: express.Request, res: express.Response) {
        const player = this.authenticate(req, res);
        if (player instanceof Player) {
            player.markSeen();
            res.status(200).send(this.games().filter(g => g.eligibleToJoin(player)).map(g => g.serialize()));
        } else if (player) {
            res.sendStatus(403);
        }
    }

    private async getHistoricalGames(req: express.Request, res: express.Response) {
        const names = await this.listHistoricalGames();
        res.status(200).send(JSON.stringify(names));
    }

    private async getGameHistory(req: express.Request, res: express.Response) {
        const name = req.params.gameName;
        const fileName = 'game-' + name + '.log.gz';
        console.log('getting game history for ' + name);
        fs.stat(fileName, (err, stat) => {
            if (err) {
                res.sendStatus(404);
            } else {
                this.sendGzipFile(res, fileName);
            }
        });
    }

    private async getBracket(req: express.Request, res: express.Response) {
        const bracket = new Bracket(req.params.name);
        await bracket.load();
        res.status(200).send(bracket);
    }

    private ubsPromise: Promise<any> = Promise.resolve();
    private updateBracketSlot(req: express.Request, res: express.Response) {
        this.ubsPromise = this.ubsPromise.then(() => this._updateBracketSlot(req, res));
    }

    private async _updateBracketSlot(req: express.Request, res: express.Response) {
        const bracket = new Bracket(req.params.name);
        await bracket.load();

        const slot = bracket.getSlot(parseInt(req.params.id));
        if (slot) {
            if (req.body.hasOwnProperty('winner')) {
                slot.winner = req.body.winner;
            }

            if (req.body.hasOwnProperty('player')) {
                slot.player = req.body.player;
            }

            await bracket.save();

            res.sendStatus(204);
        } else {
            res.sendStatus(404);
        }
    }

    private sendGzipFile(res: express.Response, filename: string) {
        res.set('Content-Encoding', 'gzip');
        res.set('Content-Type', 'application/json');
        res.status(200).download(filename);
    }

    private async getHistory(req: express.Request, res: express.Response) {
        const client = this.authenticate(req, res);
        if (client instanceof Game && client.name === req.params.gameName) {
            this.sendGzipFile(res, client.saveHistoryFilename());
        } else if (client) {
            res.sendStatus(403);
        }
    }

    private async processMove(req: express.Request, res: express.Response) {
        const client = this.authenticate(req, res);
        if (client) {
            const gameName = req.params.gameName;
            const game = this.games().find(g => g.name === gameName);
            if (game) {
                if (!game.started) {
                    if (client instanceof Player) {
                        if (game.eligibleToJoin(client)) {
                            // Wait to end response until game starts
                            res.status(200).send(await game.join(client));
                        } else {
                            res.sendStatus(403);
                        }
                    } else if (client instanceof Game) {
                        // Start game as soon as eligible, then end response
                        res.status(200).send(await game.start());
                    }
                } else if (client instanceof Player) {
                    client.markSeen();
                    if (!game.over && game.players.indexOf(client) === -1 && game.eligibleToJoin(client)) {
                        res.status(200).send(await game.join(client));
                    } else if (game.players.indexOf(client) === -1 || game.over) {
                        res.status(200).send({over: true});
                    } else {
                        res.status(200).send(await game.processInput(client, req.body));
                    }
                } else if (client instanceof Game) {
                    res.status(200).send(await game.status());
                }
            } else {
                res.sendStatus(404);
            }
        }
    }

    private players(): Player[] {
        return Array.from(this.clients.values()).filter(p => p instanceof Player) as Player[];
    }

    private games(): Game[] {
        return Array.from(this.clients.values()).filter(p => p instanceof Game) as Game[];
    }

    private deletePlayer(player: Player) {
        if (player.game) {
            player.game.remove(player);
        }
        this.clients.delete(player.token);
    }
    private deleteGame(game: Game) {
        if (game.players.length == 0) {
            this.clients.delete(game.token);
        } else {
            console.log('ending game');
            game.end();
        }
    }
}

const [nodePath, jsPath, port] = process.argv;

new Lobby(parseInt(port || '8080', 10));
