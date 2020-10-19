import {Game} from './game';
import {PaperIO} from './games/paperio';

export class GameFactory {
    static create(
        name: string,
        usedNames: Set<string>,
        requestedPlayers?: string[],
        persistent?: boolean,
    ): Game {
        console.log('Requesting to create game named ' + name + ' with players ' + JSON.stringify(requestedPlayers));
        return new PaperIO(name, usedNames, requestedPlayers, persistent);
    }
}
