import fs = require('fs');

export class Slot {
    public player: string|null = null;
    public winner = false; // Did the player in this slot win this game?

    public constructor(
        public readonly id: number,
        public readonly from: Match|null, // If specified, the match a player should probably get into this slot from
    ) {
    }

    public toJSON() {
        return {
            id: this.id,
            from: this.from && this.from.id,
            player: this.player,
            winner: this.winner,
        };
    }

    public parse(raw: any) {
        this.player = raw.player;
        this.winner = raw.winner;
    }
}

export class Match {
    public constructor(
        public readonly id: number,
        public readonly name: string,
        public readonly slots: Slot[],
    ) {
    }

    public parse(raw: {slots: any[]}) {
        raw.slots.forEach((slot, slotIdx) => this.slots[slotIdx].parse(slot));
    }
}

/**
 * Represents the currently-ongoing tournament bracket. The lobby client can seed the bracket, and then mark victors for
 * each of the rounds. Any time the bracket changes, it is serialized and dumped to a file.
 */
export class Bracket {
    public readonly matches: Match[] = [];
    private filename = this.name.replace(/[^a-zA-Z0-9]/g, '_') + '.bracket.json';

    public constructor(
        private name: string,
    ) {
        let matchId = 0;
        let slotId = 0;

        // The first rounds (seeds)
        for (let i = 0; i < 8; i++) {
            this.matches.push(new Match(++matchId, name + ' Round ' + (i + 1), [
                new Slot(++slotId, null),
                new Slot(++slotId, null),
                new Slot(++slotId, null),
                new Slot(++slotId, null),
            ]));
        }

        for (let i = 0; i < 4; i++) {
            this.matches.push(new Match(++matchId, name + ' Quarterfinal ' + (i + 1), [
                new Slot(++slotId, this.matches[i * 2]),
                new Slot(++slotId, this.matches[i * 2]),
                new Slot(++slotId, this.matches[i * 2 + 1]),
                new Slot(++slotId, this.matches[i * 2 + 1]),
            ]));
        }

        for (let i = 0; i < 2; i++) {
            this.matches.push(new Match(++matchId, name + ' Semifinal ' + (i + 1), [
                new Slot(++slotId, this.matches[8 + i * 2]),
                new Slot(++slotId, this.matches[8 + i * 2]),
                new Slot(++slotId, this.matches[8 + i * 2 + 1]),
                new Slot(++slotId, this.matches[8 + i * 2 + 1]),
            ]));
        }

        this.matches.push(new Match(++matchId, name + ' Final', [
            new Slot(++slotId, this.matches[12]),
            new Slot(++slotId, this.matches[12]),
            new Slot(++slotId, this.matches[13]),
            new Slot(++slotId, this.matches[13]),
        ]));
    }

    public getSlot(id: number): Slot|undefined {
        for (let match of this.matches) {
            for (let slot of match.slots) {
                if (slot.id === id) {
                    return slot;
                }
            }
        }
        return undefined;
    }

    public toJSON() {
        return {
            name: this.name,
            matches: [
                this.matches.slice(0, 8),
                this.matches.slice(8, 12),
                this.matches.slice(12, 14),
                this.matches.slice(14),
            ],
        };
    }

    public parse(raw: {name: string, matches: any[][]}) {
        let matchIdx = 0;
        raw.matches.forEach(tier => tier.forEach(match => {
            this.matches[matchIdx++].parse(match);
        }));
    }

    public load() {
        return new Promise((done, reject) => {
            fs.readFile(this.filename, 'utf8', (err, data) => {
                if (err) {
                    done(); // It's fine, just a new bracket.
                } else {
                    this.parse(JSON.parse(data));
                    done();
                }
            });
        });
    }

    public save() {
        return new Promise((done, reject) => {
            fs.writeFile(this.filename, JSON.stringify(this), (err) => err ? reject(err) : done());
        });
    }
}