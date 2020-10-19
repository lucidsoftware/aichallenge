import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';

import {Bracket} from '../bracket/bracket.component';
import {LobbyClient} from '../net/lobbyclient';

@Component({selector: 'tournament-melee', templateUrl: './melee.component.html', styleUrls: ['./melee.component.less']})
export class MeleeComponent implements OnInit {
    public bracket: Bracket = {name: '', matches: []};
    public players: string[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private client: LobbyClient,
    ) {
    }

    async ngOnInit() {
        const name = this.route.snapshot.paramMap.get('name');
        this.bracket = await this.client.getBracket(name);
        for (let match of this.bracket.matches[0]) {
            for (let slot of match.slots) {
                if (slot.player) {
                    this.players.push(slot.player);
                }
            }
        }
    }

    toggleWinner(name: string) {
        localStorage['win-' + name] = !this.isWinner(name);
    }

    public isWinner(name: string) {
        return JSON.parse(localStorage['win-' + name] || 'false');
    }

    public play() {
        const round = this.players.filter(n => this.isWinner(n)).length + 1;

        this.client.play(
            this.bracket.name + ' Melee ' + round,
            this.players.filter(n => !this.isWinner(n) && this.client.playerOnline(n) && !this.client.playerPlaying(n))
        );
    }
}
