import * as sdk from './sdk';

interface Point {
    x: number;
    y: number;
}

export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

export function clip(a: Box, b: Box): Box {
    const x = Math.max(a.x, b.x);
    const y = Math.max(a.y, b.y);
    const w = Math.min(a.x + a.w, b.x + b.w) - x;
    const h = Math.min(a.y + a.h, b.y + b.h) - y;
    return {x, y, w, h};
}

/**
 * If we're in our safe space without a plan, we target a nearby open space to
 * claim, plan the full path to claim it, and start going down that path. We
 * pick a square space to claim, up to 1/3 the width of our visible area (vis a
 * vis fog of war) that we are guaranteed to be able to complete without being
 * killed based on current best knowledge.
 *
 * If we're mid-claim-plan, we check for a few conditions that will make us vary
 * from that plan:
 *  1) There is a player that could reach our tail before our plan would
 * complete. Find the shortest path back to safety and take it.
 *  2) There is an opposing player's tail that we could reach before they could
 * reach our tail. Reroute to hit their tail and then take the shortest path
 * back to safety.
 */
class BenBot implements sdk.Bot {
    board: {p?: number, t?: number}[][] = [];
    players: sdk.PlayerData[] = [];
    me: sdk.PlayerData&{pos: {x: number, y: number}, dir: {x: number, y: number}};

    plan: Point[] = [];

    constructor(
        data: sdk.BoardData,
        private readonly playerName: string,
    ) {
        // Construct an empty, correct-size board
        for (let y = 0; y < data.boardHeight; y++) {
            const row: {p?: number, t?: number}[] = [];
            for (let x = 0; x < data.boardWidth; x++) {
                row.push({});
            }
            this.board.push(row);
        }

        this.updateData(data);
    }

    private updateData(data: sdk.BoardData) {
        if (!data.over) {
            data.board.forEach((row, y) => {
                row.forEach((space, x) => {
                    this.board[y + data.viewOrigin.y][x + data.viewOrigin.x] = {p: space.owner, t: space.tail};
                });
            });

            this.players = data.players;
            this.me = data.players.find(p => p.name === this.playerName) as any;
        }
    }

    private planCapture() {
        this.plan = [];

        // From wherever we currently are, pick a random-sized rectangle with our
        // current location in one of the corners. Clip that rectangle to the board
        // size, then figure out the points-gained-to-plan-length ratio.
        //
        // Do this 100 times, then take the move with the highest efficiency.
        // Note that the "score" estimate is based on the whole rectangle being
        // filled, which obviously won't be true if the path is cut off very early.
        // But that's OK. It favors short paths which are safer and keep our space
        // convex.
        const onePlan = (): {plan: Point[], score: number} => {
            const plan: Point[] = [];
            const last = () => plan[plan.length - 1];
            const safe = (pos: Point) => {
                return this.board[pos.y][pos.x].p === this.me.id;
            };

            const boxW = Math.round(Math.random() * 20 + 8);
            const boxH = Math.round(Math.random() * 20 + 8);
            const right = Math.random() < 0.5;
            const down = Math.random() < 0.5;
            const boxX = right ? this.me.pos.x : this.me.pos.x - boxW;
            const boxY = down ? this.me.pos.y : this.me.pos.y - boxH;
            const clockwise = Math.random() < 0.5;

            const finalBox = clip(
                {x: boxX, y: boxY, w: boxW, h: boxH},
                {x: 0, y: 0, w: this.board[0].length - 1, h: this.board.length - 1}
            );

            let score = 0;
            for (let y = finalBox.y; y < finalBox.y + finalBox.h; y++) {
                for (let x = finalBox.x; x < finalBox.x + finalBox.w; x++) {
                    if (this.board[y][x].p != this.me.id) {
                        score++;
                        if (this.board[y][x].p) {
                            score++;
                        }
                    }
                }
            }

            let waypoints: Point[] = [];
            if (right && down) {
                waypoints = [
                    {x: this.me.pos.x + finalBox.w, y: this.me.pos.y},
                    {x: this.me.pos.x + finalBox.w, y: this.me.pos.y + finalBox.h},
                    {x: this.me.pos.x, y: this.me.pos.y + finalBox.h},
                    this.me.pos
                ];
            } else if (right && !down) {
                waypoints = [
                    {x: this.me.pos.x, y: this.me.pos.y - finalBox.h},
                    {x: this.me.pos.x + finalBox.w, y: this.me.pos.y - finalBox.h},
                    {x: this.me.pos.x + finalBox.w, y: this.me.pos.y},
                    this.me.pos
                ];
            } else if (!right && down) {
                waypoints = [
                    {x: this.me.pos.x, y: this.me.pos.y + finalBox.h},
                    {x: this.me.pos.x - finalBox.w, y: this.me.pos.y + finalBox.h},
                    {x: this.me.pos.x - finalBox.w, y: this.me.pos.y},
                    this.me.pos
                ];
            } else if (!right && !down) {
                waypoints = [
                    {x: this.me.pos.x - finalBox.w, y: this.me.pos.y},
                    {x: this.me.pos.x - finalBox.w, y: this.me.pos.y - finalBox.h},
                    {x: this.me.pos.x, y: this.me.pos.y - finalBox.h},
                    this.me.pos
                ];
            }

            if (!clockwise) {
                waypoints = [waypoints[2], waypoints[1], waypoints[0], waypoints[3]];
            }

            let leftSafe = false;
            const pos = {x: this.me.pos.x, y: this.me.pos.y};
            while (waypoints.length) {
                const wp = waypoints[0];

                pos.x += Math.sign(wp.x - pos.x);
                pos.y += Math.sign(wp.y - pos.y);

                plan.push({x: pos.x, y: pos.y});

                if (!leftSafe && !safe(pos)) {
                    leftSafe = true;
                }
                if (leftSafe && safe(pos)) {
                    break;
                }

                if (pos.x === wp.x && pos.y === wp.y) {
                    waypoints.shift();
                }
            }

            return {plan, score};
        };

        const plans = [];
        for (let i = 0; i < 100; i++) {
            plans.push(onePlan());
        }
        plans.sort((a, b) => (b.score / b.plan.length) - (a.score / a.plan.length));
        this.plan = plans[0].plan;
    }

    private onBoard(p: Point): boolean {
        return p.x >= 0 && p.y >= 0 && p.x < this.board[0].length && p.y < this.board.length;
    }

    private inDanger() {
        if (this.board[this.me.pos.y][this.me.pos.x].p === this.me.id) {
            // We're in our safe zone.
            return false;
        }

        // Has someone captured our landing zone?
        // const endOfPlan = this.plan[this.plan.length - 1];
        // if (endOfPlan && this.board[endOfPlan.y][endOfPlan.x].p !== this.me.id) {
        //   return true;
        // }

        // Is the distance from the nearest player to our tail shorter
        // than the shortest path to safety + 2?
        for (let player of this.players) {
            if (player.id !== this.me.id && player.pos) {
                const closest = this.findClosest(player.pos, p => p.t === this.me.id);
                if (closest) {
                    const path = this.shortestPath(player.pos, closest, p => p.t !== player.id);

                    const pathToSafety = this.shortestPath(
                        this.me.pos, this.findClosest(this.me.pos, p => p.p === this.me.id)!, p => p.t !== this.me.id
                    );

                    if (path.length <= pathToSafety.length) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Check in concentric diamonds around "from"
    private findClosest(from: Point, valid: (piece: {p?: number, t?: number}) => boolean): Point|undefined {
        let result: Point|undefined;
        const check = (x: number, y: number) => {
            if (this.onBoard({x, y}) && valid(this.board[y][x])) {
                result = {x, y};
                return true;
            }
            return false;
        };

        for (let r = 1; r < this.board[0].length; r++) {
            for (let x = 0; x <= r; x++) {
                const y = r - x;
                if (check(from.x - x, from.y - y)) {
                    return result;
                }
                if (check(from.x - x, from.y + y)) {
                    return result;
                }
                if (check(from.x + x, from.y - y)) {
                    return result;
                }
                if (check(from.x + x, from.y + y)) {
                    return result;
                }
            }
        }
        return undefined;
    }

    private shortestPath(start: Point, to: Point, passable: (piece: {p?: number, t?: number}) => boolean): Point[] {
        console.log(this.me.name, 'Path from', start, 'to', to);
        if (Math.abs(start.x - to.x) + Math.abs(start.y - to.y) == 1) {
            return [to];
        }

        // For each node, which node it can most efficiently be reached from.
        // If a node can be reached from many nodes, cameFrom will eventually
        // contain the most efficient previous step.
        const cameFrom = new Map<number, Point>();
        const reconstructPath = (current: Point): Point[] => {
            const path = [current];
            while (cameFrom.has(pointKey(current))) {
                current = cameFrom.get(pointKey(current))!;
                path.unshift(current);
            }

            console.log(this.me.name + ' Shortest path', path);
            return path.slice(1);
        };

        const pointKey = (p: Point): number => {
            return p.y * this.board[0].length + p.x;
        };

        // The set of nodes already evaluated
        const closedSet = new Set<number>();

        // The set of currently discovered nodes that are not evaluated yet.
        // Initially, only the start node is known.
        const openSet = [start];

        // For each node, the cost of getting from the start node to that node.
        const gScore = new Map<number, number>();

        const getGScore = (p: Point): number => {
            if (gScore.has(pointKey(p))) {
                return gScore.get(pointKey(p))!;
            } else {
                return Number.POSITIVE_INFINITY;
            }
        };

        // The cost of going from start to start is zero.
        gScore.set(pointKey(start), 0);

        // For each node, the total cost of getting from the start node to the
        // goal by passing by that node. That value is partly known, partly
        // heuristic.
        const fScore = new Map<number, number>();

        const getFScore = (p: Point): number => {
            if (fScore.has(pointKey(p))) {
                return fScore.get(pointKey(p))!;
            } else {
                return Number.POSITIVE_INFINITY;
            }
        };

        // For the first node, that value is completely heuristic.
        fScore.set(pointKey(start), Math.abs(to.x - start.x) + Math.abs(to.y - start.y));

        while (openSet.length) {
            let current = openSet[0];
            let bestFScore = getFScore(current);
            for (let i = 1; i < openSet.length; i++) {
                const oneFScore = getFScore(openSet[i]);
                if (oneFScore < bestFScore) {
                    bestFScore = oneFScore;
                    current = openSet[i];
                }
            }

            if (current.x === to.x && current.y === to.y) {
                return reconstructPath(current);
            }

            openSet.splice(openSet.indexOf(current), 1);
            closedSet.add(pointKey(current));

            const neighbors = [
                {x: current.x - 1, y: current.y},
                {x: current.x + 1, y: current.y},
                {x: current.x, y: current.y - 1},
                {x: current.x, y: current.y + 1}
            ].filter(p => {
                return this.onBoard(p) && !closedSet.has(pointKey(p)) && passable(this.board[p.y][p.x]);
            });
            const currentGScore = getGScore(current);
            for (let neighbor of neighbors) {
                // The distance from start to a neighbor
                const tentativeGScore = currentGScore + 1;

                if (!openSet.find(p => p.x === neighbor.x && p.y === neighbor.y)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= getGScore(neighbor)) {
                    continue;
                }

                // This path is the best until now. Record it!
                cameFrom.set(pointKey(neighbor), current);
                gScore.set(pointKey(neighbor), tentativeGScore);
                fScore.set(
                    pointKey(neighbor), tentativeGScore + Math.abs(to.x - neighbor.x) + Math.abs(to.y - neighbor.y)
                );
            }
        }

        console.log(this.me.name + ' Shortest path', start, to, 'Failed');
        return [];
    }

    private planRetreat() {
        console.log(this.me.name + ' Planning retreat from ' + this.me.pos.x + ',' + this.me.pos.y);
        const closest = this.findClosest(this.me.pos, p => p.p === this.me.id);
        if (closest) {
            this.plan = this.shortestPath(this.me.pos, closest, p => p.t !== this.me.id);
            console.log(this.me.name, this.me.pos, this.plan);
        }
    }

    private canKill(): Point[]|undefined {
        console.log(this.me.name + ' Checking canKill from ' + this.players.length + ' total players');

        const closest = this.findClosest(this.me.pos, p => !!p.t && p.t !== this.me.id);
        if (closest) {
            const killPath = this.shortestPath(this.me.pos, closest, p => p.t !== this.me.id);

            const player = this.players.find(p => p.id === this.board[closest.y][closest.x].t);
            if (player && player.pos) {
                const closestDanger = this.findClosest(player.pos, p => p.t === this.me.id);
                if (!closestDanger) {
                    return killPath;
                }

                const dangerPath = this.shortestPath(player.pos, closestDanger, p => p.t !== player.id);

                if (killPath.length < dangerPath.length) {
                    return killPath;
                }
            }
        }
        return undefined;
    }

    private planKill(killPath: Point[]) {
        console.log(this.me.name + ' Planning kill');
        this.plan = killPath;
        console.log(this.me.name, this.me.pos, this.plan);
    }

    public getMoves(data: sdk.BoardData): {x: number, y: number}[] {
        this.updateData(data);

        const moves: {x: number, y: number}[] = [];

        const move = (dir: {x: number, y: number}) => {
            moves.push(dir);
            this.me.dir.x = dir.x;
            this.me.dir.y = dir.y;
            this.me.pos.x += dir.x;
            this.me.pos.y += dir.y;
            if (this.board[this.me.pos.y][this.me.pos.x].p != this.me.id) {
                this.board[this.me.pos.y][this.me.pos.x].t = this.me.id;
            }
        };

        for (let i = 0; i < 5; i++) {
            // If we've reached a waypoint, move on to the next one.
            while (this.plan.length > 0 && this.plan[0].x === this.me.pos.x && this.plan[0].y === this.me.pos.y) {
                this.plan.shift();
            }

            if (this.plan.length == 0) {
                // If we've reached the end of our plan and aren't on safe ground now,
                // get to safe ground ASAP.
                if (this.board[this.me.pos.y][this.me.pos.x].p !== this.me.id) {
                    this.planRetreat();
                } else {
                    this.planCapture();
                }
            }

            let killPath: Point[]|undefined;
            if (this.inDanger()) {
                this.planRetreat();
            } /* else if (killPath = this.canKill()) {
              this.planKill(killPath);
            }*/

            if (this.plan[0].x > this.me.pos.x) {
                move({x: 1, y: 0});
            } else if (this.plan[0].x < this.me.pos.x) {
                move({x: -1, y: 0});
            } else if (this.plan[0].y > this.me.pos.y) {
                move({x: 0, y: 1});
            } else /* if (this.plan[0].y < this.me.pos.y)*/ {
                move({x: 0, y: -1});
            }
        }

        return moves;
    }
}

sdk.play(BenBot);