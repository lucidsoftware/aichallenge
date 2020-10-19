package com.lucidsoftware.codekerfuffle.bot;

public class BoardState {
    public final int boardWidth;
    public final int boardHeight;
    public final Coordinate viewOrigin;
    public final LocationData[][] board;
    public final Player[] players;

    public BoardState(
        int boardWidth,
        int boardHeight,
        Coordinate viewOrigin,
        LocationData[][] board,
        Player[] players
    ) {
        this.boardWidth = boardWidth;
        this.boardHeight = boardHeight;
        this.viewOrigin = viewOrigin;
        this.board = board;
        this.players = players;
    }
}