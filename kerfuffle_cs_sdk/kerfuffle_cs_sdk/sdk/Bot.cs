namespace kerfuffle_cs_sdk
{
    public abstract class Bot
    {
        protected readonly string playerName;
        protected readonly int playerId;
        protected readonly BoardState initialState;

        protected Bot(BoardState initialState, string playerName, int playerId)
        {
            this.playerName = playerName;
            this.playerId = playerId;
            this.initialState = initialState;
        }

        /**
         * @param state The current state of the game
         * @return The next 5 moves to make.
         *  If less than 5 moves are given, the server will continue moving in the bots last direction.
         *  If more than 5 moves are given, the server will ignore any moves past the 5th
         */
        public abstract Coordinate[] GetMoves(BoardState state);
    }
}
