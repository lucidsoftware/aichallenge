import {Game} from '../game';
import {InputWaiter} from '../lib/inputwaiter';
import {Player} from '../player';

import {PaperIOState} from './paperio/paperiogame';

export class PaperIO extends Game {
    // min/max milliseconds to wait per batch of moves from each bot
    private inputWaiter = new InputWaiter(40, 500);
    private firstTurn = true;

    // Call this to send current status to the game visualization
    public statusCallback: ((data: string) => void)|undefined;

    public static readonly MOVES_PER_TURN = 5;

    // Call these to send current status to the bots
    private playerStatusCallbacks = new Map<Player, ((data: string) => void)>();

    private game: PaperIOState<Player>;
    private moveQueues = new Map<Player, {x: number, y: number}[]>();
    protected moveHistory: {[index: string]: ({x: number, y: number}|null)[]} = {}; // JSONable

    private moveStartTime = Date.now();

    constructor(
        name: string,
        usedNames: Set<string>,
        _requestedPlayers?: string[],
        persistent?: boolean,
    ) {
        super(name, usedNames, _requestedPlayers, persistent);
    };

    protected initialize(): void {
        super.initialize();

        this.game = new PaperIOState(this.name, this.players, this.persistent);
        this.waitForInput();
    }

    protected addPlayer(p: Player): Promise<string> {
        this.game.addPlayer(p);
        return Promise.resolve(this.game.playerStatusString(p));
    }

    private waitForInput() {
        const start = Date.now();
        // console.log(Date.now(), 'Waiting for input');
        this.moveStartTime = Date.now();
        this.players.forEach(p => {
            if(p.lastMoveTime == Infinity) {
                p.movesMissed++;
            } else {
                p.movesMissed = 0;
            }
            p.lastMoveTime = Infinity;
        });
        this.players.forEach(p => p.lastMoveTime = Infinity);
        this.inputWaiter.waitForInput().then(() => {
            const time = Date.now() - start;
            // console.log(time);
            // // Kill whatever bots failed to respond in time.
            // this.players.forEach(player => {
            //   // First, remove them from the game state itself
            //   this.game.killByKey(player);

            //   // Then remove them from this game client
            //   this.remove(player);
            // });

            this.runQueuedMoves();
        });
    }

    public remove(player: Player) {
        const idx = this.players.indexOf(player);
        if (idx != -1) {
            this.game.killByKey(player);

            this.players.splice(idx, 1);
            player.lastKilled = Date.now();
            console.log('Player ' + player.name + ' removed from game ' + this.name);
            const cb = this.playerStatusCallbacks.get(player);
            if (cb) {
                cb(JSON.stringify(this.game.statusString()));
            }

            if (player.game === this) {
                player.game = undefined;
            }
        }
    }

    // Run the moves from whatever bots responded in time. Send each of them the
    // current status, and reset the deadline for the next move.
    private runQueuedMoves() {
        // console.log(Date.now(), 'Running queued moves, ' +
        //                             this.playerStatusCallbacks.size +
        //                             ' players sent moves');
        const history: string[] = [];
        const hasPlayers = this.players.length > 0;

        if (!this.firstTurn && hasPlayers) {
            for (let turn = 0; turn < PaperIO.MOVES_PER_TURN && !this.over; turn++) {
                this.players.forEach(player => {
                    let queueHistory = this.moveHistory[player.name];
                    if (!queueHistory) {
                        queueHistory = [];
                        this.moveHistory[player.name] = queueHistory;
                    }

                    const queue = this.moveQueues.get(player);
                    if (queue && queue.length > 0) {
                        const move = queue.shift()!;
                        this.game.setDirByKey(player, move);
                        queueHistory.push(move);
                    } else {
                        queueHistory.push(null);
                    }
                });

                this.game.turn();
                history.push(this.game.statusString());
                this.history.push(history[history.length - 1]);
            }
        }
        this.firstTurn = false;

        if (this.game.over || this.over) {
            console.log(Date.now(), 'Game over');

            // Game's over, send everyone a game over status, and boot all the bots
            // from the game.
            this.over = true;

            const lastStatus = this.history[this.history.length - 1];
            if (this.statusCallback) {
                this.statusCallback(lastStatus);
            }

            this.playerStatusCallbacks.forEach(cb => cb(lastStatus));

            this.players.slice().forEach(player => this.remove(player));

            this.saveHistory();
        } else {
            // console.log(Date.now(),
            //             'Queued turns complete, sending status to players');

            // Game's still running. Send dead players a game over status and remove
            // them, and send live players their local status.
            if (this.statusCallback) {
                if (history.length > 0) {
                    this.statusCallback(JSON.stringify(history));
                } else {
                    this.statusCallback(JSON.stringify([this.game.statusString()]));
                }
            }

            // Slice because we're removing players mid-loop.
            this.players.slice().forEach(p => {
                const cb = this.playerStatusCallbacks.get(p);
                if (cb) {
                    // console.log('Sending status to ' + p.name);
                    cb(this.game.playerStatusString(p));
                }

                if (!this.game.playerStillAlive(p)) {
                    this.remove(p);
                }
            });

            this.waitForInput();
        }

        this.playerStatusCallbacks.clear();
        this.statusCallback = undefined;
    }

    // For the visualization, not the players
    public status(): Promise<string> {
        if (this.over || (this.players.length == 0 && !this.persistent)) {
            return Promise.resolve(this.history[this.history.length - 1]);
        } else {
            return new Promise<string>(done => this.statusCallback = done);
        }
    };

    private isLegalDir(dir: any) {
        return dir && (typeof dir === 'object') &&
            ((dir.x == -1 && dir.y == 0) || (dir.x == 0 && dir.y == -1) || (dir.x == 1 && dir.y == 0) ||
             (dir.x == 0 && dir.y == 1));
    }

    public processInput(p: Player, input: any|null): Promise<string> {
        // console.log(Date.now(), 'Got input for ' + p.name);
        if (Array.isArray(input)) {
            const moves = input.filter(one => this.isLegalDir(one));
            if (moves.length > PaperIO.MOVES_PER_TURN) {
                moves.length = PaperIO.MOVES_PER_TURN;
            }
            this.moveQueues.set(p, moves);
        }

        p.lastMoveTime = Date.now() - this.moveStartTime;

        const promise = new Promise<string>(done => this.playerStatusCallbacks.set(p, done));

        if (this.playerStatusCallbacks.size === this.players.length && this.players.length > 0) {
            this.inputWaiter.allInputArrived();
        } else {
            // console.log(
            //     Date.now(),
            //     'Waiting for moves from ' +
            //         this.players.filter(p => !this.playerStatusCallbacks.has(p))
            //             .map(p => p.name)
            //             .join(', '));
        }

        return promise;
    };
}
