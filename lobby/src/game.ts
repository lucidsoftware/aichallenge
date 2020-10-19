import {Client} from './client';
import {Player} from './player';
import fs = require('fs');
import * as zlib from 'zlib';
import streamify = require('stream-array');
import Stringify = require('streaming-json-stringify');

export abstract class Game extends Client {
    public readonly requestedPlayers = new Set(this._requestedPlayers || []);
    public readonly open = this.requestedPlayers.size == 0;
    public readonly players: Player[] = [];
    public started = false;
    public over = false;
    protected history: string[] = [];
    protected moveHistory: any;

    private playerStartPromises = new Map<Player, (status: string) => void>();

    private startDate = new Date();

    constructor(
        name: string,
        usedNames: Set<string>,
        private readonly _requestedPlayers?: string[],
        public readonly persistent: boolean = true,
    ) {
        super(name, usedNames, persistent, '');
    }

    /**
     * A player has joined this game. Return a promise of their view of the game,
     * which resolves as soon as the game starts.
     */
    public join(player: Player): Promise<string> {
        if (this.eligibleToJoin(player)) {
            console.log('Player ' + player.name + ' joined game ' + this.name);
            this.players.push(player);
            player.game = this;
            if (this.started && this.persistent) {
                return this.addPlayer(player);
            } else {
                const promise = new Promise<string>(done => {
                    this.playerStartPromises.set(player, done);
                });
                return promise;
            }
        } else {
            return Promise.reject('Invalid player');
        }
    }

    public saveHistoryFilename() {
        return './game-' + this.sanitizeForSave(this.name) + '.log.gz';
    }

    public saveMoveHistoryFilename() {
        return './game-' + this.sanitizeForSave(this.name) + '.moves.json';
    }

    protected saveHistory() {
        if (this.over) {
            const out = fs.createWriteStream(this.saveHistoryFilename());
            const gzip = zlib.createGzip();
            streamify(this.history).pipe(new Stringify()).pipe(gzip).pipe(out).on('finish', () => {
                // Keep only final state in memory
                this.history = [this.history[this.history.length - 1]];
            });

            if (this.moveHistory) {
                fs.writeFile(this.saveMoveHistoryFilename(), JSON.stringify(this.moveHistory), () => {
                    this.moveHistory = null;
                });
            }
        }
    }

    /**
     * The Game client has asked for this game to start. As soon as it is
     * eligible, start and return the current status string.
     */
    public start(): Promise<string> {
        console.log('Game ' + this.name + ' now starting');
        this.initialize();
        this.started = true;

        this.playerStartPromises.forEach((done, player) => {
            this.processInput(player, null).then(done);
        });
        return this.status();
    }

    public end(): void {
        if (!this.started) {
            this.over = true;
            this.playerStartPromises.forEach(done => {
                done(JSON.stringify({over: true}));
            });
            this.players.forEach(p => {
                p.markSeen();
                p.game = undefined;
            });
            this.players.length = 0;
        }
    };

    public eligibleToJoin(p: Player): boolean {
        if (this.persistent) {
            return p.persistent && (Date.now() - p.lastKilled > 5000);
        }
        if (p.persistent) {
            return false;
        }
        return !this.started && !this.over && (this.open || this.requestedPlayers.has(p.name));
    }

    protected initialize(): void {
        console.log('Starting game ' + this.name);
    }

    protected abstract addPlayer(p: Player): Promise<string>;
    public abstract remove(player: Player): void;

    // The user has sent this input. Deal with it, and respond with the current
    // game state as this player should see it, when they should see it.
    public abstract processInput(p: Player, input: any|null): Promise<string>;

    // The game visualization has asked for the status of the game. Respond when
    // appropriate with sufficient information to render the game state.
    public abstract status(): Promise<string>;
}
