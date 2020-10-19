package com.lucidsoftware.codekerfuffle.bot;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;

import java.io.IOException;

@JsonDeserialize(using = Direction.Deserializer.class)
public class Direction extends Coordinate {
    public static final Direction UP = new Direction(0, -1);
    public static final Direction DOWN = new Direction(0, 1);
    public static final Direction LEFT = new Direction(-1, 0);
    public static final Direction RIGHT = new Direction(1, 0);

    private Direction(int x, int y) {
        super(x, y);
    }

    public static class Deserializer extends StdDeserializer<Direction> {
        protected Deserializer() {
            super(Direction.class);
        }

        @Override
        public Direction deserialize(JsonParser jsonParser, DeserializationContext deserializationContext) throws IOException, JsonProcessingException {
            Coordinate c = jsonParser.getCodec().readValue(jsonParser, Coordinate.class);
            return new Direction(c.x, c.y);
        }
    }

}
