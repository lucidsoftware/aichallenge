package com.lucidsoftware.codekerfuffle;

import com.lucidsoftware.codekerfuffle.bot.*;
import com.lucidsoftware.codekerfuffle.driver.BotDriver;

public class ExampleJavaBot extends Bot {

    private static BotFactory FACTORY = (BotData self, BoardState initialState) -> new ExampleJavaBot(self, initialState);

    public static void main(String[] args) {
        BotDriver.playBot(ExampleJavaBot.FACTORY, args);
    }

    private ExampleJavaBot(BotData self, BoardState initialState) {
        super(self, initialState);
    }

    @Override
    public Direction[] getMoves(BoardState state) {
        // `self.playerId` refers to yourself
        return new Direction[]{Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT};
    }
}
