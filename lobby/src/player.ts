import {Client} from './client';
import {Game} from './game';

export class Player extends Client {
    game?: Game;
    lastSeen: number = Date.now();

    lastMoveTime: number = 0;
    movesMissed: number = 0;

    lastKilled: number = 0;

    public serialize(token?: boolean) {
        const ret = super.serialize(token);
        if (this.game) {
            ret.game = this.game.name;
        }
        return ret;
    }

    public markSeen() {
        this.lastSeen = Date.now();
    }
}
