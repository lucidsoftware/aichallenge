package com.lucidsoftware.codekerfuffle.driver;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import com.lucidsoftware.codekerfuffle.bot.BoardState;
import com.lucidsoftware.codekerfuffle.bot.Coordinate;
import com.lucidsoftware.codekerfuffle.bot.LocationData;
import com.lucidsoftware.codekerfuffle.bot.Player;

import java.io.IOException;
import java.util.Optional;

@JsonDeserialize(using = GameState.Deserializer.class)
public class GameState {
    public final Optional<BoardState> boardState;

    public GameState(Optional<BoardState> boardState) {
        this.boardState = boardState;
    }

    public static class Deserializer extends StdDeserializer<GameState> {

        protected Deserializer() {
            super(GameState.class);
        }

        @Override
        public GameState deserialize(JsonParser jsonParser, DeserializationContext deserializationContext) throws IOException, JsonProcessingException {
            JsonNode node = jsonParser.getCodec().readTree(jsonParser);
            if (Optional.ofNullable(node.get("over")).map(n -> n.asBoolean()).orElse(false)) {
                return new GameState(Optional.empty());
            } else {
                String[][] rawBoard = jsonParser.getCodec().treeToValue(node.get("board"), String[][].class);
                LocationData[][] board = new LocationData[rawBoard.length][rawBoard[0].length];
                for (int i = 0; i < rawBoard.length; i++) {
                    for (int j = 0; j < rawBoard[0].length; j++) {
                        String[] split = rawBoard[i][j].split(",");
                        int owner = -1;
                        int tail = -1;
                        if (split.length > 0 && !split[0].isEmpty()) {
                            owner = Integer.parseInt(split[0]);
                        }
                        if (split.length > 1 && !split[1].isEmpty()) {
                            tail = Integer.parseInt(split[1]);
                        }
                        board[i][j] = new LocationData(owner, tail);
                    }
                }
                return new GameState(Optional.of(new BoardState(
                    node.get("boardWidth").asInt(),
                    node.get("boardHeight").asInt(),
                    jsonParser.getCodec().treeToValue(node.get("viewOrigin"), Coordinate.class),
                    board,
                    jsonParser.getCodec().treeToValue(node.get("players"), Player[].class)
                )));
            }
        }
    }
}

