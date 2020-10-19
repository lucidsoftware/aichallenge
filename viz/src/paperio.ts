import {GameVisualization} from './gamevisualization.js';

interface PlayerData {
    id: number;
    name: string;
    score: number;
    pos: {x: number, y: number};
    dir: {x: number, y: number};
}

interface BoardData {
    turnLength: number;
    board: string[];
    players: PlayerData[];
    over: undefined;
}

export class PaperIO extends GameVisualization {
    constructor() {
        super();
        this.canvas.width = 1620;
        this.canvas.height = 1080;
    }

    private data: BoardData|undefined;
    private lastUpdate = performance.now();

    private needsRender = false;
    protected statusUpdate(data: BoardData) {
        this.data = data;
        this.lastUpdate = performance.now();
        this.needsRender = true;
    }

    private patternCanvas = document.createElement('canvas');

    private getFillStyle(playerId: string, scale: number): string | CanvasPattern {
        const color = this.playerColors.get(playerId)!;
        const pattern = this.playerEffects.get(playerId)!;

        if (pattern == 'hatch') {
            this.patternCanvas.width = 20;
            this.patternCanvas.height = 20;
            const c = this.patternCanvas.getContext('2d')!;
            c.scale(10, 10);
            c.fillStyle = color;
            c.fillRect(0, 0, 2, 2);
            c.strokeStyle = '#dff3f7';
            c.lineWidth = .4;
            c.moveTo(-1, -1);
            c.lineTo(3, 3);
            c.moveTo(-1, 1);
            c.lineTo(2, 4);
            c.moveTo(1, -1);
            c.lineTo(4, 2);
            c.stroke();
            const p = c.createPattern(this.patternCanvas, 'repeat')!;
            c.scale(1 / scale / 10, 1 / scale / 10);
            p.setTransform(c.getTransform());
            return p;
        }
        return color;
    }

    protected render() {
        if (!this.needsRender) {
            return;
        }
        this.needsRender = false;
        const data = this.data;
        if (!data) {
            return;
        }
        const board = data.board;

        const c = this.canvas.getContext('2d')!;
        c.save();

        c.fillStyle = '#dff3f7';
        c.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const scale = this.canvas.width / board[0].length;
        c.scale(scale, scale);

        const playersById = new Map<string, PlayerData>();
        data.players.forEach(p => playersById.set(String(p.id), p));

        for (let y = 0; y < board.length; y++) {
            let prevP: string = '';
            let startP: number = 0;
            let prevT: string = '';
            let startT: number = 0;

            for (let x = 0; x <= board[y].length; x++) {
                const piece: string = board[y][x];
                const [p, t] = piece ? piece.split(',') : ['', ''];

                if (prevP != p) {
                    if (prevP) {
                        c.globalAlpha = 1;
                        c.fillStyle = this.getFillStyle(prevP, scale);
                        c.fillRect(startP, y, x - startP, 1);
                    }
                    prevP = p;
                    startP = x;
                }
            }

            for (let x = 0; x <= board[y].length; x++) {
                const piece: string = board[y][x];
                const [p, t] = piece ? piece.split(',') : ['', ''];

                if (prevT != t) {
                    if (prevT) {
                        c.globalAlpha = .5;
                        c.fillStyle = this.getFillStyle(prevT, scale);
                        c.fillRect(startT, y, x - startT, 1);
                    }
                    prevT = t;
                    startT = x;
                }
            }
        }

        if (!data.over) {
            for (let player of data.players) {
                const x = player.pos.x;
                const y = player.pos.y;

                c.globalAlpha = 1;
                c.fillStyle = '#dff3f7';
                const strokeWidth = 0.3;
                c.fillRect(x - strokeWidth, y - strokeWidth, 1 + strokeWidth * 2, 1 + strokeWidth * 2);

                c.globalAlpha = 1;
                c.fillStyle = this.getFillStyle(String(player.id), scale);
                c.fillRect(x, y, 1, 1);
            }
        }
        c.restore();
    }
}

new PaperIO();
