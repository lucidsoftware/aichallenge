import http = require('http');
import readline = require('readline');

class AuthError extends Error {}

function fullBody(req: http.IncomingMessage): Promise<string> {
    return new Promise(done => {
        let body = '';
        req.on('readable', () => {
            const part = req.read();
            if (part !== null) {
                body += part;
            }
        });
        req.on('end', () => {
            done(body);
        });
    });
}

function joinLobby(host: string, port: number, name: string, persistent: boolean, count = 0):
    Promise<{name: string, token: string}> {
    return new Promise<{name: string, token: string}>((done, fail) => {
        const req =
            http.request({host, port, path: '/players', method: 'POST', headers: {'Content-Type': 'application/json'}});
        req.write(JSON.stringify({name, persistent}));
        req.end();
        req.on('response', async (res: http.IncomingMessage) => {
            if (res.statusCode === 201) {
                done(JSON.parse(await fullBody(res)));
            } else if (count < 50) {
                console.log('Failed to connect. Retrying...');
                await sleep(1000);
                done(await joinLobby(host, port, name, persistent, count + 1));
            } else {
                fail(new Error('Failed to connect'));
            }
        });
        req.on('error', async err => {
            if (count < 50) {
                console.log('Failed to connect. Retrying...');
                await sleep(1000);
                done(await joinLobby(host, port, name, persistent, count + 1));
            } else {
                fail(err);
            }
        });
    });
}

function listGames(host: string, port: number, token: string): Promise<{name: string}[]> {
    return new Promise<{name: string}[]>((done, fail) => {
        const req = http.request({
            host,
            port,
            path: '/games',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
            }
        });
        req.end();
        req.on('response', async (res: http.IncomingMessage) => {
            if (res.statusCode === 200) {
                done(JSON.parse(await fullBody(res)));
            } else if (res.statusCode === 403 || res.statusCode === 401) {
                fail(new AuthError());
            } else {
                fail(new Error('Failed to list games'));
            }
        });
        req.on('error', fail);
    });
}

export interface PlayerData {
    id: number;
    name: string;
    score: number;
    pos?: {x: number, y: number};
    dir?: {x: number, y: number};
}

export interface LocationData {
    owner?: number;
    tail?: number;
}

export interface BoardData {
    boardWidth: number;
    boardHeight: number;
    viewOrigin: {x: number, y: number};
    board: LocationData[][];
    players: PlayerData[];
    over?: boolean;
}

function sendMove(host: string, port: number, token: string, gameName: string, data: {x: number, y: number}[]):
    Promise<BoardData> {
    return new Promise<BoardData>((done, fail) => {
        const req = http.request({
            host,
            port,
            path: '/games/' + encodeURIComponent(gameName),
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
            }
        });
        req.write(JSON.stringify(data));
        req.end();
        req.on('response', async (res: http.IncomingMessage) => {
            if (res.statusCode === 200) {
                const raw = JSON.parse(await fullBody(res));
                raw.board = !raw.over && raw.board && raw.board.map((row: string[]) => row.map(space => {
                    const [owner, tail] = space.split(',').map(i => parseInt(i, 10)).map(i => isNaN(i) ? undefined : i);
                    return {owner, tail};
                }));
                done(raw);
            } else {
                console.log(res);
                fail(new Error('Failed to send move'));
            }
        });
        req.on('error', fail);
    });
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function question(prompt: string): Promise<string> {
    return new Promise<string>(done => {
        rl.question(prompt, done);
    });
}

async function sleep(ms: number) {
    return new Promise(done => setTimeout(done, ms));
}

async function joinFirstAvailableGame(host: string, port: number, token: string): Promise<string> {
    console.log('Checking for available games...');
    let games: {name: string}[] = [];
    while (games.length == 0) {
        games = await listGames(host, +port, token);
        if (games.length == 0) {
            await sleep(1000);
        }
    }

    console.log('Auto-joining game ' + games[0].name);
    return games[0].name;
}

const [nodePath, jsPath, host, port, name, persistent] = process.argv;

export interface Bot { getMoves(data: BoardData): {x: number, y: number}[]; }

export async function play(botConstructor: new (state: BoardData, name: string, playerId: number) => Bot) {
    // Register the player, get a bearer token
    let player = await joinLobby(host, +port, name, !!persistent);
    console.log('Player name assigned: ' + player.name);

    while (true) {
        // Poll for games we're eligible for. As soon as any appear, offer the list
        // to the user to select one to join, along with an option to refresh the
        // list.
        try {
            const gameName = await joinFirstAvailableGame(host, +port, player.token);

            let state = await sendMove(host, +port, player.token, gameName, []);

            if (state.over) {
                continue;
            }

            let playerId = -1;
            state.players.forEach(p => {
                if (player.name == p.name) {
                    playerId = p.id;
                }
            });
            const bot = new botConstructor(state, player.name, playerId);
            while (true) {
                const moves = bot.getMoves(state);
                state = await sendMove(host, +port, player.token, gameName, moves);
                if (state.over) {
                    console.log('Game over');
                    break;
                }
            }
        } catch (e) {
            if (e instanceof AuthError || (e instanceof Error && (e as any).code === 'ECONNREFUSED')) {
                console.log('Server connection lost. Reconnecting...');
                player = await joinLobby(host, +port, name, !!persistent);
                console.log('Player name assigned: ' + player.name);
            } else {
                console.log('Error playing game. Back to lobby.');
                console.error(e);
            }
        }
    }
}
