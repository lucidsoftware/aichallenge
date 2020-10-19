using System;
using System.Threading.Tasks;
using kerfuffle_cs_sdk;

class MyBot : Bot
{
    protected MyBot(BoardState initialState, string playerName, int playerId)
        : base(initialState, playerName, playerId)
    {

    }

    public static void Main(string[] args)
    {
        BotDriver driver = new BotDriver(
            // Change this to configure the host this bot points to
            "localhost",
            // Change this to configure the port
            80, 
            (state, playerName, playerId) => new MyBot(state, playerName, playerId)
            );

        Task runResult = driver.Run(
            // Change this to configure the name of the bot in the game
            "WindowsBot",
            // Change this to RunMode.Competition for bot to compete
            RunMode.Persistent
            );
        runResult.Wait();
        Console.WriteLine(runResult.Exception);
    }

    /// <summary>
    /// Used to get the next 
    /// </summary>
    /// <returns>an array of 5 moves.
    /// a move must be a coordinate of with the four values
    /// new Coordinate(1, 0) - right
    /// new Coordinate(-1, 0) - left
    /// new Coordinate(0, 1) - down
    /// new Coordinate(0, -1) - up
    /// </returns>
    /// <param name="state">The current state of the game board</param>
    public override Coordinate[] GetMoves(BoardState state)
    {
        // Logic for your bot goes here
        return new Coordinate[]
        {
            new Coordinate(1, 0),
            new Coordinate(1, 0),
            new Coordinate(1, 0),
            new Coordinate(1, 0),
            new Coordinate(1, 0),
        };
    }
}
