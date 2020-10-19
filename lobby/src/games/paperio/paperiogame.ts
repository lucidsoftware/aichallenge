import {binarySearch} from '../../lib/array';
import {Box, clip, inBox} from '../../lib/math';

class Player<T extends {name: string, lastMoveTime: number}> {
    // ID is used in serialized game state
    // Key is used to look up a player based on some external state, like a
    // network client
    private static nextId = 1;
    public readonly id = Player.nextId++;

    constructor(
        public readonly key: T,
    ) {
    }

    public pos = {x: 0, y: 0};
    public dir = {x: 1, y: 0};
    public score = 0;

    public bounds: Box;

    public serialize(skipPos?: boolean, includLastPlayed = false) {
        const data: any = {
            name: this.key.name,
            score: this.score,
            id: this.id,
        };
        if (!skipPos) {
            data.pos = this.pos;
            data.dir = this.dir;
        }
        if (includLastPlayed) {
            data.lastPlayed = this.key.lastMoveTime;
        }
        return data;
    }
}

class Space {
    // Player ID who owns this space
    p?: number;
    // Player ID whose tail is on this space
    t?: number;

    toString() {
        return `${this.p ? this.p : ''},${this.t ? this.t : ''}`;
    }

    toJSON() {
        return this.toString();
    }
}

export class PaperIOState<T extends {name: string, lastMoveTime: number, movesMissed: number}> {
    private board: Space[][] = [];
    private players = new Map<number, Player<T>>(); // keyed by ID

    private w = 162;
    private h = 108;

    private gameDeadline: number;
    public over = false;

    private readonly MAX_PERCENT_CAPTURE = 0.2;

    constructor(
        public readonly name: string,
        playerKeys: T[],
        private persistent: boolean,
    ) {
        for (let y = 0; y < this.h; y++) {
            const row = [];
            for (let x = 0; x < this.w; x++) {
                row.push(new Space());
            }
            this.board.push(row);
        }

        if (persistent) {
            this.gameDeadline = Date.now() + 1000 * 60 * 2;
        }

        playerKeys.forEach((key, idx) => {
            const player = new Player(key);
            this.players.set(player.id, player);

            const theta = idx / playerKeys.length * Math.PI * 2;

            player.pos = {
                x: Math.round(this.w / 2 + this.w / 3 * Math.cos(theta)),
                y: Math.round(this.h / 2 + this.h / 3 * Math.sin(theta)),
            };

            for (let y = player.pos.y - 2; y <= player.pos.y + 2; y++) {
                for (let x = player.pos.x - 2; x <= player.pos.x + 2; x++) {
                    this.setPlayer(this.board[y][x], player);
                }
            }
        });
    };

    public addPlayer(playerKey: T) {
        const player = new Player(playerKey);

        const padding = 30;
        let attempt = 0;

        const isClear = (x: number, y: number) => {
            for (let i = 0; i < 11; i++) {
                for (let j = 0; j < 11; j++) {
                    if (!this.isEmpty(x + i - 5, y + j - 5)) {
                        return false;
                    }
                }
            }
            return true;
        };

        const setPos = (x: number, y: number) => {
            player.pos = {x, y};

            for (let y = player.pos.y - 2; y <= player.pos.y + 2; y++) {
                for (let x = player.pos.x - 2; x <= player.pos.x + 2; x++) {
                    this.setPlayer(this.board[y][x], player);
                }
            }
            this.players.set(player.id, player);
        };
        while (true) {
            attempt++;
            if (attempt == 300) {
                for (let y = padding; y < this.h - padding; y++) {
                    for (let x = padding; x < this.w - padding; x++) {
                        if (isClear(x, y)) {
                            setPos(x, y);
                            return;
                        }
                    }
                }
                console.log('making room for more players');
                for (let y = 0; y < this.h; y++) {
                    for (let x = 0; x < this.w; x++) {
                        const space = this.board[y][x];
                        this.setPlayer(space, undefined);
                        space.t = undefined;
                    }
                }
                this.players.forEach(player => {
                    for (let y = player.pos.y - 2; y <= player.pos.y + 2; y++) {
                        for (let x = player.pos.x - 2; x <= player.pos.x + 2; x++) {
                            if (x >= 0 && y >= 0 && x < this.w && y < this.h) {
                                this.setPlayer(this.board[y][x], player);
                            }
                        }
                    }
                });
            }
            if (attempt == 600) {
                // this probably won't happen, but just in case.
                console.log('killing all players to make room for new player');
                this.players.forEach(player => this.kill(player));
            }
            const x = Math.floor(Math.random() * (this.w - padding * 2)) + padding;
            const y = Math.floor(Math.random() * (this.h - padding * 2)) + padding;

            if (isClear(x, y)) {
                setPos(x, y);
                return;
            }
        }
    }

    private isEmpty(x: number, y: number): boolean {
        return this.board[y][x].p === undefined && this.board[y][x].t === undefined;
    }

    private playerById(id: number|undefined): Player<T>|undefined {
        if (id === undefined) {
            return undefined;
        }
        return this.players.get(id);
    }

    public turn() {
        if (!this.gameDeadline) {
            this.gameDeadline = Date.now() + 1000 * 60 * 2;
        }

        if (Date.now() >= this.gameDeadline) {
            this.shutdown();
        }

        if (this.players.size == 0) {
            return;
        }

        if (this.over) {
            return;
        }

        const toKill = new Set<Player<T>>();

        const playersByPosition = new Map<Space, Player<T>[]>();

        // Process players in order of their score. Highest scoring player goes first.
        const sortedPlayers = [...this.players.values()].sort((p1, p2) => {
            return p2.score - p1.score;
        });

        sortedPlayers.forEach(player => {
            const nextPos = {x: player.pos.x + player.dir.x, y: player.pos.y + player.dir.y};

            const from = this.board[player.pos.y][player.pos.x];
            const to = (nextPos.y >= 0 && nextPos.y < this.h) ? this.board[nextPos.y][nextPos.x] : undefined;

            // If the space they're moving onto is off the board, kill them.
            if (to === undefined) {
                console.log('Player ' + player.key.name + ' off board');
                toKill.add(player);
            } else {
                if (!playersByPosition.has(to)) {
                    playersByPosition.set(to, []);
                }
                playersByPosition.get(to)!.push(player);

                // If the space they're moving onto is their own non-tail, and they're
                // not already on their own non-tail, then fill space for them.
                if (to.p == player.id && from.t == player.id) {
                    this.claim(player, nextPos);
                } else if (to.p != player.id) {
                    // If the space they're moving onto is not their own, make it their tail.
                    // to.t = player.id;
                }

                this.move(player);
            }
        });

        // Kill any players that colided with another player while not in their safe zone.
        playersByPosition.forEach((players, space) => {
            if (players.length > 1) {
                let count = 0;
                players.forEach(player => {
                    if (space.p != player.id) {
                        count++;
                        console.log(
                            'Player ' + player.key.name +
                            ' was outside of safe zone and hit the head of another player at ' + player.pos.x + ',' +
                            player.pos.y
                        );
                        toKill.add(player);
                    }
                });
            }
        });

        sortedPlayers.forEach(player => {
            // If the space they're moving onto is someone's tail, kill that player.
            const pos = this.board[player.pos.y][player.pos.x];
            if (pos.t && pos.t != player.id) {
                const tail = this.playerById(pos.t)!;
                console.log(
                    'Player ' + player.key.name + ' hit tail of player ' + tail.key.name + ' at ' + player.pos.x + ',' +
                    player.pos.y
                );
                toKill.add(tail);
            }
            if (pos.p != player.id) {
                pos.t = player.id;
            }
        });

        // Check for players that had their entire area captured
        sortedPlayers.forEach(player => {
            if (player.score == 0) {
                console.log('Player ' + player.key.name + ' entire area was claimed');
                toKill.add(player);
            }
            if (player.key.movesMissed >= 5) {
                console.log('Player ' + player.key.name + ' missed 5 moves in a row, killing');
                toKill.add(player);
            }
        });

        if (toKill.size === this.players.size && !this.persistent) {
            // Ended in a tie
            this.shutdown();
        } else {
            toKill.forEach(p => this.kill(p));

            if (this.players.size < 2 && !this.persistent) {
                this.shutdown();
            }
        }
    }

    public playerStatusString(key: T) {
        const player = this.playerByKey(key);
        if (player) {
            const radius = Math.round(12 + player.score / (this.w * this.h) * 100);

            const bb = clip(
                {
                    x: player.pos.x - radius,
                    y: player.pos.y - radius,
                    w: 2 * radius + 1,
                    h: 2 * radius + 1,
                },
                {
                    x: 0,
                    y: 0,
                    w: this.w,
                    h: this.h,
                },
            );

            const data: any = {
                boardWidth: this.w,
                boardHeight: this.h,
                viewOrigin: {x: bb.x, y: bb.y},
                board: this.board.slice(bb.y, bb.y + bb.h).map(row => row.slice(bb.x, bb.x + bb.w)),
                players: Array.from(this.players.values()).map(p => p.serialize(!inBox(p.pos, bb)))
            };

            if (this.over) {
                data.over = true;
            }

            return JSON.stringify(data);
        } else {
            return JSON.stringify({over: true});
        }
    }

    private compressBoard(): string {
        const board: string[] = [];
        let current = this.board[0][0].toString();
        let currentIdx = 0;
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                if (x == 0 && y == 0) {
                    continue;
                }
                const next = this.board[y][x].toString();
                if (next != current) {
                    board.push((y * this.w + x - currentIdx) + ';' + current);
                    current = next;
                    currentIdx = y * this.w + x;
                }
            }
        }
        board.push((this.w * this.h - currentIdx) + ';' + current);
        return board.join('!');
    }

    public statusString() {
        const data: any = {
            board: this.compressBoard(),
            players: Array.from(this.players.values()).map(p => p.serialize(false, true)),
            timeLeft: this.gameDeadline - Date.now(),
            width: this.w,
            height: this.h,
        };

        if (this.over) {
            data.over = true;
        }

        return JSON.stringify(data);
    }

    private move(player: Player<T>) {
        player.pos.x += player.dir.x;
        player.pos.y += player.dir.y;
    }

    private kill(player: Player<T>) {
        console.log('Player ' + player.key.name + ' killed in game ' + this.name);
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                const space = this.board[y][x];
                if (space.p === player.id) {
                    this.setPlayer(space, undefined);
                }
                if (space.t === player.id) {
                    space.t = undefined;
                }
            }
        }

        this.players.delete(player.id);
    }

    private playerByKey(key: T) {
        for (let [id, player] of this.players) {
            if (player.key === key) {
                return player;
            }
        }
        return undefined;
    }

    public playerStillAlive(key: T) {
        return !!this.playerByKey(key);
    }

    public killByKey(key: T) {
        const player = this.playerByKey(key);
        if (player) {
            this.kill(player);
        }
    }

    public setDirByKey(key: T, dir: {x: number, y: number}) {
        const player = this.playerByKey(key);
        if (player) {
            player.dir = dir;
        }
    }

    private setPlayer(piece: Space, player: Player<T>|undefined) {
        if (player) {
            player.score++;
        }

        const oldPlayer = this.playerById(piece.p);
        if (oldPlayer) {
            oldPlayer.score--;
        }

        piece.p = player && player.id;
    }

    private claim(player: Player<T>, nextPos: {x: number, y: number}) {
        // The user is about to re-enter their safe zone at nextPos.
        const doCapture = this.fillEnclosedAreas(player, nextPos);

        this.board.forEach((row, y) => {
            row.forEach((space, x) => {
                if (space.t === player.id) {
                    this.setPlayer(space, doCapture ? player : undefined);
                    space.t = undefined;
                }
            });
        });
    }

    // Scan the board for areas enclosed by the given player's ID. Fill those
    // areas in completely. Once the region containing "pos" is filled, we can
    // stop. Returns whether or not filling area was successful.
    private fillEnclosedAreas(player: Player<T>, pos: {x: number, y: number}): boolean {
        // Y => [X]
        let verticalEdges: number[][] = [];
        const w = this.w;
        const h = this.h;
        const board = this.board;
        const id = player.id;

        function addVerticalEdge(x: number, y: number) {
            if (!(y in verticalEdges)) {
                verticalEdges[y] = [];
            }
            const verticalEdge = verticalEdges[y];

            const index = binarySearch(verticalEdge, x, 0, verticalEdge.length);
            verticalEdge.splice(index, 0, x);
        }

        function get(x: number, y: number): number|undefined {
            if (x < 0 || y < 0 || x >= w || y >= h) {
                return undefined;
            }

            let source = board[y][x].p;
            if (source !== player.id && board[y][x].t === player.id) {
                source = player.id;
            }
            if (source == undefined) {
                return source;
            }
            const xs = verticalEdges[y];
            if (xs) {
                for (let i = 0; i < xs.length; i += 2) {
                    if (x >= xs[i] && x < xs[i + 1]) {
                        // Inside a poly we've already found
                        return undefined;
                    } else if (x < xs[i + 1]) {
                        // Past our X; this array is sorted.
                        break;
                    }
                }
            }
            return source;
        }

        const spacesToClaim: Space[] = [];

        function fillPoly(startX: number, startY: number) {
            // The current vertex we're looking at
            let pos = [startX, startY];

            // The direction we're going
            let dir = [1, 0];

            // Determine if the edge we're pointing at is in
            // fact an outer edge of our polygon. Winding order
            // is clockwise around the polygon in a left-handed
            // coordinate system (default for canvases).
            function getValInsideNextEdge() {
                if (dir[0] == 1 && dir[1] == 0) {
                    return get(pos[0], pos[1]);
                } else if (dir[0] == 0 && dir[1] == 1) {
                    return get(pos[0] - 1, pos[1]);
                } else if (dir[0] == -1 && dir[1] == 0) {
                    return get(pos[0] - 1, pos[1] - 1);
                } else if (dir[0] == 0 && dir[1] == -1) {
                    return get(pos[0], pos[1] - 1);
                }

                return undefined;
            }

            function getValOutsideNextEdge() {
                if (dir[0] == 1 && dir[1] == 0) {
                    return get(pos[0], pos[1] - 1);
                } else if (dir[0] == 0 && dir[1] == 1) {
                    return get(pos[0], pos[1]);
                } else if (dir[0] == -1 && dir[1] == 0) {
                    return get(pos[0] - 1, pos[1]);
                } else if (dir[0] == 0 && dir[1] == -1) {
                    return get(pos[0] - 1, pos[1] - 1);
                }

                return undefined;
            }

            function rotate() {
                dir = [-dir[1], dir[0]];
            }
            const polyVerticalEdges: [number, number][] = [];
            do {
                // Make sure we're pointed along the edge
                while (getValInsideNextEdge() != id || getValOutsideNextEdge() == id) {
                    rotate();
                }
                if (dir[1] == 1) {
                    polyVerticalEdges.push([pos[0], pos[1]]);
                } else if (dir[1] == -1) {
                    polyVerticalEdges.push([pos[0], pos[1] - 1]);
                }

                pos[0] += dir[0];
                pos[1] += dir[1];
            } while (pos[0] != startX || pos[1] != startY);
            polyVerticalEdges.forEach(data => addVerticalEdge(data[0], data[1]));
        }

        for (var y = 0; y < this.h; y++) {
            for (var x = 0; x < this.w; x++) {
                if (get(x, y) == id) {
                    fillPoly(x, y);
                    if (get(pos.x, pos.y) === undefined) {
                        // We've now found the region that surrounds "pos". Fill based on
                        // vertical edges, and return.
                        verticalEdges.forEach((edges, y) => {
                            for (let i = 0; i < edges.length; i += 2) {
                                for (let x = edges[i]; x < edges[i + 1]; x++) {
                                    if (this.board[y][x].p !== player.id && this.board[y][x].p !== player.id) {
                                        spacesToClaim.push(this.board[y][x]);
                                    }
                                }
                            }
                        });
                    }
                }
            }
        }

        if (spacesToClaim.length <= this.w * this.h * this.MAX_PERCENT_CAPTURE) {
            spacesToClaim.forEach(space => {
                this.setPlayer(space, player);
            });
            return true;
        }
        return false;
    }

    protected shutdown() {
        console.log('Game ' + this.name + ' over');
        for (let row of this.board) {
            for (let piece of row) {
                piece.t = undefined;
            }
        }
        this.over = true;
    }
}
