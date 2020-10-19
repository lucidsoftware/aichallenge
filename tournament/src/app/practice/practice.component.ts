import {Component, OnDestroy} from '@angular/core';
import {LobbyClient} from '../net/lobbyclient';

@Component({
    selector: 'tournament-practice',
    templateUrl: './practice.component.html',
    styleUrls: ['./practice.component.less']
})
export class PracticeComponent implements OnDestroy {
    private checkPlayInterval = setInterval(() => this.checkPlay(), 100);

    constructor(
        private client: LobbyClient,
    ) {
    }

    public persistent: boolean = false;

    public queue: string[] = [];

    private hasPlayed = false;

    private playWindow: {closed: boolean}|undefined;
    private lastClosed = Date.now();

    ngOnDestroy(): void {
        clearInterval(this.checkPlayInterval);
    }

    public showCountdown() {
        return this.hasPlayed;
    }

    public countdown() {
        return Math.ceil((5000 - (Date.now() - this.lastClosed)) / 1000);
    }

    private updateQueue() {
        // Clear out any players from the queue that aren't eligible.
        const allEligible = new Set(this.client.players
                                        .filter(
                                            p => !this.client.playerPlaying(p.name) &&
                                                this.client.isPlayerPersistent(p.name, this.persistent)
                                        )
                                        .map(p => p.name));
        this.queue = this.queue.filter(name => allEligible.has(name));

        // Any players that are newly eligible go on the end of the queue.
        const allQueued = new Set(this.queue);
        allEligible.forEach(name => {
            if (!allQueued.has(name)) {
                this.queue.push(name);
            }
        });
    }

    private async checkPlay() {
        this.updateQueue();

        if (this.playWindow && this.playWindow.closed) {
            this.playWindow = undefined;
            this.lastClosed = Date.now();
        }

        // If there are at least 2 bots eligible, and we don't have a game running right now, start one.
        if (this.queue.length > 1 && !this.playWindow && this.countdown() <= 0 && this.hasPlayed) {
            this.play();
        }
        if (this.persistent && this.hasPlayed && !this.playWindow) {
            this.play();
        }
    }

    public async play() {
        this.hasPlayed = true;
        this.playWindow = {closed: false};
        this.playWindow = await this.client.play(
            this.persistent ?  'Persistent' : 'Practice',
            this.persistent ? [] : this.queue.splice(0, 32),
            this.persistent
        );
    }
}
