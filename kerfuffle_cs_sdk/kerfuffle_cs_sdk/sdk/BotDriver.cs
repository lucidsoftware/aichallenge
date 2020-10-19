using System;
using System.Threading.Tasks;
namespace kerfuffle_cs_sdk
{
    public enum RunMode
    {
        Competition,
        Persistent,
    }

    public class BotDriver
    {
        public delegate Bot BotConstructor(BoardState state, string playerName, int playerId);

        private BotConstructor botSource;
        private GameClient client;

        public BotDriver(string host, int port, BotConstructor botSource)
        {
            client = new GameClient(host, port);
            this.botSource = botSource;
        }

        public async Task Run(string name, RunMode runMode)
        {
            while (true)
            {
                ClientInfo player = await client.JoinLobby(name, runMode == RunMode.Persistent);
                Console.WriteLine("Player name assigned: " + player.name);

                bool runningGames = true;

                while (runningGames)
                {
                    try
                    {
                        string gameName = await client.JoinFirstAvailableGame();
                        BoardState state = await client.SendMove(gameName, new Coordinate[0]);
                        int playerId = -1;
                        foreach (PlayerData playerData in state.players)
                        {
                            if (playerData.name == player.name)
                            {
                                playerId = playerData.id;
                            }
                        }
                        Bot bot = botSource(state, player.name, playerId);

                        bool isOver = false;

                        while (!isOver)
                        {
                            Coordinate[] moves = bot.GetMoves(state);
                            state = await client.SendMove(gameName, moves);
                            System.GC.Collect();

                            if (state.over)
                            {
                                Console.WriteLine("Game over");
                                isOver = true;
                            }
                        }
                    }
                    catch (Exception e)
                    {
                        Console.WriteLine("Error playing game. Back to lobby.");
                        Console.WriteLine(e);
                        runningGames = false;
                    }
                }
            }
        }
    }
}
