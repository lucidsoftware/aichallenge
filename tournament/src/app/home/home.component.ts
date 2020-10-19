import {Component, OnInit} from '@angular/core';
import {LobbyClient} from '../net/lobbyclient';

@Component({selector: 'tournament-home', templateUrl: './home.component.html', styleUrls: ['./home.component.less']})
export class HomeComponent implements OnInit {
    public bracketNames = [
        'Tournament',
    ];

    public history: string[] = [];

    constructor(
        private client: LobbyClient,
    ) {
    }

    public gameLink(name: string): string {
        return '/paperio.html?' + encodeURIComponent(name);
    }

    async ngOnInit() {
        this.history = await this.client.historicalGames();
    }
}
