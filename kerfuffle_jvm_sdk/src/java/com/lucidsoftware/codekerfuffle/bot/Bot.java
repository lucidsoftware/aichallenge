package com.lucidsoftware.codekerfuffle.bot;

public abstract class Bot {

    public final BotData self;
    public final BoardState initialState;

    protected Bot(BotData self, BoardState initialState) {
        this.self = self;
        this.initialState = initialState;
    }

    /**
     * @param state The current state of the game
     * @return The next 5 moves to make.
     *  If less than 5 moves are given, the server will continue moving in the bots last direction.
     *  If more than 5 moves are given, the server will ignore any moves past the 5th
     */
    public abstract Direction[] getMoves(BoardState state);
}
