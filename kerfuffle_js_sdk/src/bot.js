const sdk = require("./sdk");

class MyBot {
    constructor(data, playerName, playerId) {
        this.playerName = playerName;
        this.playerId = playerId;
    }
    /**
     * Return the next 5 moves.
     * this.playerId refers to yourself.
     */
    getMoves(data) {
        return [
            { x: 1, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 0 },
        ];
    }
}
sdk.play(MyBot);
