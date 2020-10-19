import * as sdk from './sdk';

class MyBot implements sdk.Bot {
    constructor(
        data: sdk.BoardData,
        private readonly playerName: string,
        private readonly playerId: number,
    ) {
    }

    /**
     * Return the next 5 moves.
     * this.playerId refers to yourself.
     */
    public getMoves(data: sdk.BoardData): {x: number, y: number}[] {
        return [
            {x: 1, y: 0},
            {x: 1, y: 0},
            {x: 1, y: 0},
            {x: 1, y: 0},
            {x: 1, y: 0},
        ];
    }
}

sdk.play(MyBot);
