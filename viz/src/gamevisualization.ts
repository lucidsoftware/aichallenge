function shuffle(a: any[]) {
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

export abstract class GameVisualization {
    private token = location.hash.substr(1);
    private name = decodeURIComponent(location.search.substr(1));

    private refreshUserListInterval = setInterval(() => this.refreshUserList(), 1000);

    private statusText = document.createElement('div');
    private startButton = document.createElement('button');
    private canvasContainer = document.createElement('div');
    protected canvas = document.createElement('canvas');
    private scoreboard = document.createElement('ul');
    private title = document.createElement('div');
    private timeLeft = document.createElement('div');
    private replayButton = document.createElement('button');
    private scrubber = document.createElement('div');
    private scrubberProgress = document.createElement('div');

    private statusQueue: any[] = [];
    private lastStatusUpdate = Date.now();
    private timePerStatus = 20;
    private over = false;

    protected viewingHistory = false;
    private historyIdx = 0;
    private playerEliminationIndexes = new Set();
    private currentStatus: any = null;
    historyDirection: number = 1;
    private scrubbing = false;

    constructor() {
        this.refreshUserList();
        document.body.appendChild(this.statusText);
        document.body.appendChild(this.startButton);

        if (!this.token && this.name) {
            this.start();
            this.gameOver(false);
            this.replay();
        }

        this.startButton.textContent = 'Start Game';
        this.startButton.addEventListener('click', () => this.start());
        this.replayButton.textContent = 'Replay';

        this.scrubber.appendChild(this.scrubberProgress);

        this.scrubberProgress.className = 'progress';
        this.scrubber.className = 'scrubber';
        this.replayButton.className = 'replay';
        this.canvasContainer.className = 'canvas-container';
        this.scoreboard.className = 'scoreboard';
        this.title.className = 'title';
        this.timeLeft.className = 'timeleft';

        document.addEventListener('keydown', event => {
            if (this.viewingHistory) {
                if (event.keyCode == 32) {
                    this.historyDirection = this.historyDirection == 0 ? 1 : 0;
                }
                if (event.keyCode == 37) {
                    this.historyDirection = 0;
                    this.addHistoryIdx(-1);
                }
                if (event.keyCode == 39) {
                    this.historyDirection = 0;
                    this.addHistoryIdx(1);
                }
                if (event.keyCode == 8) {
                    this.historyDirection = -1;
                }
            }
        });

        this.scrubber.addEventListener('mousedown', event => {
            this.scrubbing = true;
            this.historyDirection = 0;
        });
        document.addEventListener('mousemove', event => {
            if (this.scrubbing) {
                const x = event.clientX;
                const bounds = this.scrubber.getBoundingClientRect();

                const percent = Math.min(1, (x - bounds.left) / bounds.width);
                this.setHistoryIdx(Math.floor(percent * this.history.length));
            }
        });
        document.addEventListener('mouseup', event => {
            this.scrubbing = false;
        });
    }

    private setHistoryIdx(idx: number) {
        this.historyIdx = Math.max(-1, Math.min(this.history.length - 1, idx));
        this.scrubberProgress.style.width = (100 * this.historyIdx / (this.history.length - 1)) + '%';
    }

    private addHistoryIdx(amount: number) {
        this.setHistoryIdx(this.historyIdx + amount);
    }

    private getTimePerStatus() {
        return 0;
    }

    private lastHistoryIdx = 0;

    private getNextStatus() {
        if (this.viewingHistory) {
            // three moves at a time while viewing history
            this.addHistoryIdx(3 * this.historyDirection);
            if (this.historyIdx != this.lastHistoryIdx) {
                this.lastHistoryIdx = this.historyIdx;
                return this.decompress(this.history[Math.max(0, Math.min(this.historyIdx, this.history.length - 1))]);
            } else {
                return undefined;
            }
        }
        return this.decompress(this.statusQueue.shift());
    }

    private start() {
        this.statusText.remove();
        this.startButton.remove();
        document.body.appendChild(this.canvasContainer);
        this.canvasContainer.appendChild(this.canvas);
        document.body.appendChild(this.scoreboard);
        document.body.appendChild(this.title);
        document.body.appendChild(this.timeLeft);

        this.replayButton.addEventListener('click', () => {
            if (this.over) {
                this.replay();
            }
        });

        this.title.textContent = this.name;
        clearInterval(this.refreshUserListInterval);

        const tick = () => {
            if (Date.now() - this.lastStatusUpdate >= this.getTimePerStatus()) {
                this.lastStatusUpdate = Date.now();
                const next = this.getNextStatus();
                if (next) {
                    this.currentStatus = next;
                    this.assignColors(next.players);
                    this.statusUpdate(next);
                    this.updateScoreboard(next);
                } else if (this.over && (this.name.startsWith('Practice') || this.name.startsWith('Persistent')) && this.token) {
                    setTimeout(() => window.close(), 3000);
                }
            }
            this.render();
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);

        if (this.token) {
            this.updateGame();
        }
    }

    private colors = [
        '#4399ff',
        '#8cbf3f',
        '#ef602d',
        '#fee33c',
        '#b77afb',
        '#6100b9',
        '#ff009d',
        '#ff99d0',
        '#47cf73',
        '#38814f',
        '#1b7c9a',
        '#173780',
        '#fa9b34',
        '#9a1410',
        '#a9a8ae',
        '#222222',
    ];

    private effects = ['solid', 'hatch'];

    protected playerColors = new Map<string, string>();
    protected playerEffects = new Map<string, string>();

    private assignColors(players: {id: number}[]) {
        shuffle(players);
        const start = this.playerColors.size;
        players.filter(p => !this.playerColors.has(String(p.id))).forEach((p, i) => {
            const id = String(p.id);
            this.playerColors.set(id, this.colors[(i + start) % this.colors.length]);
            this.playerEffects.set(id, this.effects[(Math.floor((i + start) / this.colors.length)) % this.effects.length]);
        });
    }

    private decompress(status: any) {
        if(!status) {
            return status;
        }
        if (status.width && status.height && typeof status.board == 'string') {
            const spaces: string[] = [];
            status.board.split('!').forEach((chunk: string) => {
                const [lengthStr, value] = chunk.split(';');
                const length = parseInt(lengthStr, 10);
                for (let i = 0; i < length; i++) {
                    spaces.push(value);
                }
            });

            const board: string[][] = [];
            const row = [];
            for (let i = 0; i < spaces.length; i++) {
                row.push(spaces[i]);
                if (row.length == status.width) {
                    board.push(row.slice());
                    row.length = 0;
                }
            }
            status.board = board;
        }
        if (Array.isArray(status.board) && typeof status.board[0] == 'string') {
            status.board = status.board.map((row: string) => row.split(';'));
        }
        return status;
    }

    private async updateGame() {
        const result = await fetch('/games/' + encodeURIComponent(this.name), {
            method: 'POST',
            body: '{}',
            headers: {
                'Authorization': 'Bearer ' + this.token,
                'Content-Type': 'application/json',
            }
        });

        const status = await result.json();

        if (Array.isArray(status)) {
            this.statusQueue.push(...status.map(s => JSON.parse(s)));
        } else {
            this.statusQueue.push(status);
        }

        if (status.over) {
            this.gameOver();
        } else {
            setTimeout(() => this.updateGame(), 1);
        }
    }

    private history: any[];

    private async fetchHistory() {
        let result;
        if (this.token) {
            result = await fetch('/games/' + encodeURIComponent(this.name) + '/history', {
                headers: {
                    'Authorization': 'Bearer ' + this.token,
                }
            });
        } else {
            result = await fetch('/history/' + encodeURIComponent(this.name));
        }

        this.history = (await result.json()).map((s: string) => JSON.parse(s));
        document.body.appendChild(this.scrubber);
        this.canvasContainer.classList.add('with-scrubber');
        this.assignColors(this.history[0].players)
        for (let i = 1; i < this.history.length; i++) {
            this.assignColors(this.history[i].players)
            if (this.history[i].players.length < this.history[i - 1].players.length) {
                this.playerEliminationIndexes.add(i);
                const marker = document.createElement('div');
                marker.className = 'marker';
                marker.style.left = (100 * i / (this.history.length - 1)) + '%';
                this.scrubber.appendChild(marker);
                if (this.history[i - 1].players.length - this.history[i].players.length == 1) {
                    const afterIds = new Set(this.history[i].players.map((p: {id: number}) => p.id));
                    this.history[i - 1].players.forEach((player: {id: number}) => {
                        if (!afterIds.has(player.id)) {
                            marker.style.background = this.playerColors.get(player.id + '') || '';
                        }
                    });
                }
            }
        }
        this.scrubber.appendChild(this.scrubberProgress);
    }

    private async replay() {
        if (!this.history) {
            await this.fetchHistory();
        }

        if (Array.isArray(this.history) && (!this.viewingHistory || this.historyIdx >= this.history.length - 1)) {
            this.viewingHistory = true;
            this.setHistoryIdx(-1);
        }
    }

    protected gameOver(showReplay = true) {
        this.over = true;
        if (showReplay) {
            document.body.appendChild(this.replayButton);
        }
    }

    protected abstract statusUpdate(data: any): void;
    protected abstract render(): void;

    private updateScoreboard(data: {
        players: {id: number, name: string, score: number, lastPlayed: number}[],
        timeLeft: number,
    }) {
        if (data.timeLeft > 0) {
            const minutesLeft = Math.floor(data.timeLeft / 1000 / 60);
            const secondsLeft = Math.floor((data.timeLeft - minutesLeft * 1000 * 60) / 1000);

            this.timeLeft.textContent = minutesLeft + ':' + (secondsLeft < 10 ? '0' : '') + secondsLeft;
        } else {
            this.timeLeft.textContent = 'Time is up!';
        }

        const idSet = new Set(data.players.map(p => String(p.id)));
        for (let dom of Array.from(this.scoreboard.getElementsByTagName('li'))) {
            if (!idSet.has(dom.getAttribute('data-id')!)) {
                this.scoreboard.removeChild(dom);
            }
        }

        data.players.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).forEach((player, idx) => {
            let dom = Array.from(
                               this.scoreboard.getElementsByTagName('li')
            ).find(el => el.getAttribute('data-id') === String(player.id));

            if (!dom) {
                dom = document.createElement('li');
                dom.setAttribute('data-id', String(player.id));
                dom.textContent = player.name;

                const swatch = document.createElement('div');
                swatch.className = 'swatch';
                const effect = this.playerEffects.get(player.id + '') || 'solid';
                if (effect == 'hatch') {
                    swatch.className += ' hatch';
                }
                swatch.style.backgroundColor = this.playerColors.get(String(player.id)) || '';

                dom.appendChild(swatch);

                const score = document.createElement('div');
                score.className = 'score';
                dom.appendChild(score);

                this.scoreboard.appendChild(dom);
            }

            const score = dom.getElementsByClassName('score')[0];
            score.textContent = String(player.score);

            if (player.lastPlayed === null || player.lastPlayed > 450) {
                (score as HTMLElement).style.background = 'pink';
            } else {
                (score as HTMLElement).style.background = '';
            }

            dom.style.top = idx * 40 + 'px';
        });
    }

    private async refreshUserList() {
        const result = await fetch('/players', {
            headers: {
                'Authorization': 'Bearer ' + this.token,
            }
        });

        const players = (await result.json()) as {name: string, joined?: boolean}[];

        this.statusText.innerHTML = 'Game: ' + this.name + '<br/>' +
            'Joined: ' + players.filter(p => p.joined).map(p => p.name).join(', ') +
            '<br/>Waiting for: ' + players.filter(p => !p.joined).map(p => p.name).join(', ');

        if (players.filter(p => !p.joined).length == 0 || Date.now() - 3000 > startTime) {
            // Everyone's ready to start. Just do it.
            this.start();
        }
    }
}

const startTime = Date.now();