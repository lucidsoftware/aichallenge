package com.lucidsoftware.codekerfuffle.bot;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown=true)
public class Coordinate {
    public final int x;
    public final int y;

    @JsonCreator
    public Coordinate(@JsonProperty("x") int x, @JsonProperty("y") int y) {
        this.x = x;
        this.y = y;
    }

    @Override
    public boolean equals(Object o) {
        if (o instanceof Coordinate) {
            Coordinate c = (Coordinate) o;
            return c.x == x && c.y == y;
        } else {
            return false;
        }
    }

    @Override
    public int hashCode() {
        return new Integer(x * 31 + y).hashCode();
    }

    @Override
    public String toString() {
        return String.format("(%d, %d)", x, y);
    }
}
