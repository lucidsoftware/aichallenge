package com.lucidsoftware.codekerfuffle.driver;

import com.lucidsoftware.codekerfuffle.bot.*;

public class BotDriver {

    public static void playBot(BotFactory botFactory, String[] args) {
        if (args.length != 3 && args.length != 4) {
            throw new IllegalArgumentException("3 command-line arguments expected. [host port botName]. Example \"java ExampleJavaBot.class localhost 8080 javaBot\"");
        }
        while (true) {
            try {
                System.out.println("Connecting to server...");
                Session.SessionInitData initData = Session.startSession(args[0], args[1], args[2], args.length == 4);
                Session session = initData.session;
                while (true) {
                    System.out.println("Checking for available games...");
                    String game = session.findFirstAvailableGame();
                    System.out.println("Auto joining game: " + game);
                    GameState state = session.joinGame(game);
                    if (state.boardState.isPresent()) {
                        BoardState board = state.boardState.get();
                        int botId = 0;
                        for (Player p : board.players) {
                            if (p.name.equals(initData.playerName)) {
                                botId = p.id;
                            }
                        }
                        Bot bot = botFactory.buildBot(new BotData(initData.playerName, botId), board);
                        while (state.boardState.isPresent()) {
                            board = state.boardState.get();
                            state = session.sendMoves(game, bot.getMoves(board));
                        }
                    }
                    System.out.println("Game over. Rejoining lobby.");
                }
            } catch (Exception e) {
                e.printStackTrace();
                System.out.println("Disconnected from server. Reconnecting");
            }
        }
    }
}
