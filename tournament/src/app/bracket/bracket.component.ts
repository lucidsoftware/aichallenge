import {Component, HostListener, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';

import {LobbyClient} from '../net/lobbyclient';

export interface Slot {
    id: number;
    from: number|null;
    player: string|null;
    winner: boolean;
}

export interface Match {
    id: number;
    name: string;
    slots: Slot[];
}

export interface Bracket {
    name: string;
    matches: Match[][];
}

@Component({
    selector: 'tournament-bracket',
    templateUrl: './bracket.component.html',
    styleUrls: ['./bracket.component.less'],
})
export class BracketComponent implements OnInit {
    public bracket: Bracket = {name: '', matches: []};
    public showSeed = false;

    public defaultNames = ``;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private client: LobbyClient,
    ) {
    }

    async ngOnInit() {
        const name = this.route.snapshot.paramMap.get('name');
        this.bracket = await this.client.getBracket(name);
    }

    private downstreamSlots(match: Match, immediateOnly = false) {
        const matchIds = new Set([match.id]);
        const downstream: Slot[] = [];

        // Single iteration works because we know "from" always goes back a tier
        for (let tier of this.bracket.matches) {
            for (let other of tier) {
                for (let slot of other.slots) {
                    if (matchIds.has(slot.from)) {
                        downstream.push(slot);
                        if (!immediateOnly) {
                            matchIds.add(other.id);
                        }
                    }
                }
            }
        }

        return downstream;
    }

    public async toggleWinner(slot: Slot, match: Match, refresh = true) {
        if (slot.winner) {
            // Remove this player from any slots downstream from here, they weren't really a winner.
            this.downstreamSlots(match).filter(s => s.player === slot.player).forEach(async slot => {
                await this.client.updateSlot(this.bracket.name, slot.id, {winner: false, player: null});
            });
            await this.client.updateSlot(this.bracket.name, slot.id, {winner: false});
        } else {
            await this.client.updateSlot(this.bracket.name, slot.id, {winner: true});
            const openDownstream = this.downstreamSlots(match, true).filter(s => !s.player)[0];
            if (openDownstream) {
                await this.client.updateSlot(this.bracket.name, openDownstream.id, {player: slot.player});
            }
        }

        if (refresh) {
            this.bracket = await this.client.getBracket(this.bracket.name);
        }
    }

    public matchReady(match: Match) {
        const eligible = match.slots.filter(s => !s.winner && !!s.player);
        return eligible.length > 1 &&
            eligible.every(slot => this.client.playerOnline(slot.player) && !this.client.playerPlaying(slot.player));
    }

    public play(match: Match) {
        if (this.matchReady(match)) {
            const eligible = match.slots.filter(s => !s.winner && !!s.player);
            this.client.play(match.name, eligible.map(slot => slot.player));
        }
    }

    public melee() {
        this.router.navigate(['bracket', this.bracket.name, 'melee']);
    }

    public async seed(raw: string) {
        const names = raw.split('\n').map(name => name.trim()).filter(name => !!name);
        console.log(names);

        const seedOrder = [
            1,
            16,
            17,
            32,
            8,
            9,
            24,
            25,
            2,
            15,
            18,
            31,
            7,
            10,
            23,
            26,
            3,
            14,
            19,
            30,
            6,
            11,
            22,
            27,
            5,
            12,
            21,
            28,
            4,
            13,
            20,
            29
        ];

        const promises: Promise<any>[] = [];
        let seedIdx = 0;
        for (let tier of this.bracket.matches) {
            for (let match of tier) {
                for (let slot of match.slots) {
                    if (tier === this.bracket.matches[0]) {
                        promises.push(this.client.updateSlot(this.bracket.name, slot.id, {
                            player: names[seedOrder[seedIdx++] - 1] || null,
                            winner: false,
                        }));
                    } else {
                        promises.push(this.client.updateSlot(this.bracket.name, slot.id, {
                            player: null,
                            winner: false,
                        }));
                    }
                }
            }
        }

        await Promise.all(promises);
        this.bracket = await this.client.getBracket(this.bracket.name);

        this.showSeed = false;
    }

    @HostListener('document:keydown.escape', ['$event'])
    onKeydownHandler(event: KeyboardEvent) {
        this.showSeed = false;
    }
}
