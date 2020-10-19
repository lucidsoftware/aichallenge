How to build a TypeScript bot

1. run `npm install`
2. Modify src/bot.js, implement `getMoves` to return the next 5 moves given the current state.
3. run with `node ./src/bot.js [host] [port] [name] [persistent]`


the `data` passed into `getMoves` and `constructor` looks like:

{
    boardWidth: number;
    boardHeight: number;
    viewOrigin: {x: number, y: number};
    board: LocationData[][];
    players: PlayerData[];
    over?: boolean;
}

LocationData looks like:

{
    owner?: number;
    tail?: number;
}

and PlayerData looks like:

{
    id: number;
    name: string;
    score: number;
    pos?: {x: number, y: number};
    dir?: {x: number, y: number};
}

the position and direction of each player is only sent if they are located within the view sent.