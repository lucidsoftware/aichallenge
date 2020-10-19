package com.lucidsoftware.codekerfuffle.bot;

public interface BotFactory {
    Bot buildBot(BotData self, BoardState initialState);
}
