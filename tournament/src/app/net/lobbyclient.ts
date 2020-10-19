import {Injectable} from '@angular/core';

export interface Player {
    name: string;
    game?: string;
    persistent?: boolean;
}

@Injectable()
export class LobbyClient {
    constructor() {
        setInterval(() => this.refreshPlayers(), 1000);
        this.refreshPlayers();
    }

    public async getBracket(name: string) {
        const result = await fetch('/brackets/' + encodeURIComponent(name));
        return result.json();
    }

    public updateSlot(bracketName: string, id: number, data: {player?: string|null, winner?: boolean}) {
        return fetch('/brackets/' + encodeURIComponent(bracketName) + '/slots/' + encodeURIComponent(String(id)), {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data),
        });
    }

    // Kept up-to-date regularly
    public players: Player[] = [];

    private async refreshPlayers() {
        const list = await fetch('/players');
        this.players = await list.json();
    }

    public async play(name: string, players: string[], persistent: boolean = false) {
        const result = await fetch('/games', {
            method: 'POST',
            body: JSON.stringify({
                name,
                players,
                persistent,
            }),
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (result.status >= 200 && result.status < 300) {
            const body = (await result.json()) as {name: string, token: string};
            return window.open('/paperio.html?' + encodeURIComponent(body.name) + '#' + encodeURIComponent(body.token));
        } else {
            throw result;
        }
    }

    public playerOnline(name: string|null) {
        const player = this.players.find(p => p.name === name);
        return !!player;
    }

    public playerPlaying(name: string|null) {
        const player = this.players.find(p => p.name === name);
        return !!player && !!player.game;
    }

    public isPlayerPersistent(name: string | null, persistent: boolean) {
        const player = this.players.find(p => p.name === name);
        return !!player && !!player.persistent == persistent;
    }

    public async historicalGames() {
        const result = await fetch('/historicalgames');
        return await result.json() as string[];
    }
}
