import * as sdk from './sdk';

declare type Point = {x: number, y: number};

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle<G extends any[]>(a: G) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a as G;
}

class MyBot implements sdk.Bot {
    private board: sdk.LocationData[][];

    private biasDir = 0;
    private aggressiveDist = 10;

    constructor(
        private data: sdk.BoardData,
        private readonly playerName: string,
        private readonly playerId: number,
    ) {
        this.board = [];
        for (let i = 0; i < this.data.boardHeight; i++) {
            this.board[i] = [];
            for (let j = 0; j < this.data.boardWidth; j++) {
                this.board[i].push({});
            }
        }

        setInterval(() => {
            this.biasDir = (this.biasDir + 1) % 4
        }, 3250);

        setInterval(() => {
            this.aggressiveDist++;
        }, 2500);
    }

    private patchBoard() {
        for (let i = 0; i < this.data.board.length; i++) {
            for (let j = 0; j < this.data.board[i].length; j++) {
                this.board[i+this.data.viewOrigin.y][j+this.data.viewOrigin.x] = this.data.board[i][j]
            }
        }
    }

    private flatBoard() {
        const flat: (Point&sdk.LocationData&{dist?:number})[] = [];

        for (let i = 0; i < this.board.length; i++) {
            for (let j = 0; j < this.board[i].length; j++) {
                flat.push(Object.assign({x:j, y:i}, this.board[i][j]));
            }
        }

        return flat;
    }

    private lastEdge?: Point;
    private lastTarget?: Point;
    private moveNum = 0;

    /**
     * Return the next 5 moves.
     * this.playerId refers to yourself.
     */
    public getMoves(data: sdk.BoardData): Point[] {
        this.data = data;
        this.patchBoard();
        let loc = this.getMe().pos!;

        const moves: Point[] = [];

        const inMySpace = this.board[loc.y][loc.x].owner == this.playerId;

        if (this.moveNum++ < 25 && inMySpace && this.data.players.length > 4) {
            console.log("Safe spin due to more than 4 players");
            return this.safeSpin();
        }

        const flat = this.flatBoard().map((p)=> {
            p.dist = this.distToPoint(loc, p);
            return p;
        }).sort((a,b) => a.dist!-b.dist!);

        const nearbyPlayer = !!this.data.players.find(p => p.id != this.playerId && !!p.pos && this.distToPoint(p.pos, loc) < 7);
        const nearishbyPlayer = !!this.data.players.find(p => p.id != this.playerId && !!p.pos && this.distToPoint(p.pos, loc) < 6+this.aggressiveDist);
        const haveTail = !!flat.find(s => !!s.tail && s.tail == this.playerId)

        const flat5 = shuffle(flat.filter(p => p.dist! <= 5)).sort((a,b) => b.dist!-a.dist!);
        const flat7 = shuffle(flat.filter(p => p.dist! <= 7)).sort((a,b) => b.dist!-a.dist!);
        const flatAggro = flat.filter(p => p.dist! <= this.aggressiveDist).sort((a,b) => b.dist!-a.dist!);

        let target: Point|undefined;

        target = flat7.find(p => p.tail != undefined && p.tail != this.playerId);
        if (!nearishbyPlayer && target) {
            console.log("Targeting a players tail");
        }

        if (nearishbyPlayer && inMySpace) {
            console.log("Making safe random moves because I'm scared");
            return this.safeRandom();
        }

        if (!target && inMySpace && !haveTail) {
            if (!nearishbyPlayer) {
                if (this.lastTarget && flat.find(p => p.x == this.lastTarget!.x && p.y == this.lastTarget!.y)!.owner != this.playerId) {
                    target = this.lastTarget;
                } else {
                    target = flatAggro.find(p => !!p.owner && p.owner != this.playerId);
                }
                this.lastTarget = target;
                if (target) {
                    console.log("Targeting someone elses space");
                }
            }
            if (!target) {
                target = flat5.find(p => p.owner != this.playerId);
                if (target) {
                    console.log("Going outside of my space");
                }
            }

            if (!target) {
                if (this.lastEdge) {
                    target = this.lastEdge;
                    console.log("continuing to go towards edge of my space");
                } else {
                    flat.sort((a: any,b: any) => b.dist-a.dist);
                    target = flat.find(p => p.owner == this.playerId);
                    if (target) {
                        this.lastEdge = target;
                        console.log("Going towards edge of my space");
                    }
                }
            }
        }

        if (!target) {
            this.lastEdge = undefined;
            target = flat.find(p => p.owner == this.playerId);
            if (target) {
                console.log("Going back to my space");
            }
        }

        if (!target) {
            if (nearbyPlayer) {
                console.log("Making safe random moves");
                this.safeSpin();
            } else {
                console.log("Making unsafe random moves");
                return this.makeRandomMoves();
            }
        } else {
            this.resetBias();
            for (let y = 0; y < Math.abs(target.y-loc.y); y++) {
                const dir = (target.y-loc.y) > 0 ? 1 : -1;
                moves.push({x: 0, y: dir});
            }
            for (let x = 0; x < Math.abs(target.x-loc.x); x++) {
                const dir = (target.x-loc.x) > 0 ? 1 : -1;
                moves.push({y: 0, x: dir});
            }
        }

        const finalMoves = shuffle(moves);

        if (finalMoves.length < 5) {
            return this.makeRandomMoves(finalMoves);
        }

        return finalMoves.splice(0,5);
    }

    private biasAmount = 2;
    private resetBias() {
        this.biasAmount = 2;
    }

    private makeRandomMoves(moves: Point[] = []) {
        let loc = this.getMe().pos!;

        const dirs = [
            {x: 1, y: 0},
            {x: 0, y: 1},
            {x: -1, y: 0},
            {x: 0, y: -1}
        ];

        const bias = dirs[this.biasDir];
        for (let i = 0; i < this.biasAmount; i++) {
            dirs.push(bias)
        }
        this.biasAmount++;

        moves.forEach(m => loc = this.addPoint(loc, m));

        while(moves.length < 5) {
            const dir = dirs[Math.floor(Math.random()*dirs.length)];
            if (this.canMove(loc, dir)) {
                loc = this.addPoint(loc, dir);
                moves.push(dir);
            }
        }

        return moves;
    }

    private safeSpin() {
        let loc = this.getMe().pos!;

        const dirs = [
            {x: 1, y: 0},
            {x: 0, y: 1},
            {x: -1, y: 0},
            {x: 0, y: -1}
        ];

        const moves: Point[] = [];

        let i = 0;
        while(moves.length < 4) {
            const dir = dirs[i++%4];
            if (this.canMove(loc, dir)) {
                loc = this.addPoint(loc, dir);
                moves.push(dir);
            }
        }
        while(moves.length < 5) {
            const dir = dirs[Math.floor(Math.random()*dirs.length)];
            if (this.canMove(loc, dir)) {
                loc = this.addPoint(loc, dir);
                moves.push(dir);
            }
        }

        return moves;
    }

    private safeRandom() {
        const sets = [];
        for (let i = 0; i < 20; i++) {
            const moves = this._safeRandom();
            let loc = this.getMe().pos!;
            moves.forEach(m => loc = this.addPoint(loc,m));
            const nearestPlayer: sdk.PlayerData|undefined = this.data.players.filter(p => p.id != this.playerId && !!p.pos && this.distToPoint(p.pos, loc) < 20).map(p => {
                return Object.assign({dist: this.distToPoint(loc, p.pos!)}, p);
            }).sort((p1, p2) => {
                return p1.dist-p2.dist;
            })[0];

            const dist = nearestPlayer ? this.distToPoint(loc, nearestPlayer.pos!) : 1000;
            sets.push({
                dist: dist,
                moves: moves,
            });
        }

        sets.sort((a,b) => b.dist-a.dist);
        return sets[0].moves;
    }

    private _safeRandom() {
        let loc = this.getMe().pos!;

        const dirs = [
            {x: 1, y: 0},
            {x: 0, y: 1},
            {x: -1, y: 0},
            {x: 0, y: -1}
        ];

        const moves: Point[] = [];

        const nearestPlayer: sdk.PlayerData|undefined = this.data.players.filter(p => p.id != this.playerId && !!p.pos && this.distToPoint(p.pos, loc) < 20).map(p => {
            return Object.assign({dist: this.distToPoint(loc, p.pos!)}, p);
        }).sort((p1, p2) => {
            return p1.dist-p2.dist;
        })[0];

        while(moves.length < 5) {
            let filtered = dirs.filter(d => {
                if (this.canMove(loc, d)) {
                    const n = this.addPoint(loc, d);
                    if (this.board[n.y][n.x].owner == this.playerId) {
                        return true;
                    }
                }
                return false;
            });

            if (filtered.length == 0) {
                filtered = dirs;
            }

            if (nearestPlayer) {
                const next = shuffle(filtered).map(d => {
                    const n = this.addPoint(loc, d);
                    return Object.assign({dist: this.distToPoint(n, nearestPlayer.pos!)}, d);
                }).sort((p1, p2) => {
                    return p1.dist-p2.dist;
                })[0];
                if (next && this.canMove(loc, next)) {
                    loc = this.addPoint(loc, next);
                    moves.push(next);
                    continue;
                }
            }

            const dir = filtered[Math.floor(Math.random()*filtered.length)];
            if (this.canMove(loc, dir)) {
                loc = this.addPoint(loc, dir);
                moves.push(dir);
            }
        }

        return moves;
    }

    private addPoint(p1: Point, p2: Point) {
        return {
            x: p1.x+p2.x,
            y: p1.y+p2.y
        }
    }

    private distToPoint(p1: Point, p2: Point) {
        return Math.abs(p1.x-p2.x) + Math.abs(p1.y-p2.y);
    }

    private getMe() {
        return this.data.players.find(p => p.id == this.playerId)!;
    }

    private canMove(pos: Point, dir: Point) {
        if (pos.x+dir.x >= this.data.boardWidth || pos.x+dir.x < 0 ||
            pos.y+dir.y >= this.data.boardHeight || pos.y+dir.y < 0) {
                return false;
        }

        return true;
    }
}

sdk.play(MyBot);
