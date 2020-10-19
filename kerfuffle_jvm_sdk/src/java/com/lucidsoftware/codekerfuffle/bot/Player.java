package com.lucidsoftware.codekerfuffle.bot;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Optional;

@JsonIgnoreProperties(ignoreUnknown=true)
public class Player {

    public final int id;
    public final String name;
    public final int score;
    public final Optional<Coordinate> location;
    public final Optional<Direction> direction;

    @JsonCreator
    public Player(
        @JsonProperty("id") int id,
        @JsonProperty("name") String name,
        @JsonProperty("score") int score,
        @JsonProperty("pos") Optional<Coordinate> location,
        @JsonProperty("dir") Optional<Direction> direction
    ) {
        this.id = id;
        this.name = name;
        this.score = score;
        this.location = location;
        this.direction = direction;
    }

    @Override
    public boolean equals(Object o) {
        if (o instanceof Player) {
            Player p = (Player) o;
            return p.id == this.id;
        } else {
            return false;
        }
    }

    @Override
    public int hashCode() {
        return new Integer(id).hashCode();
    }

    @Override
    public String toString() {
        return String.format("Player(id=%d, name='%s')", id, name);
    }
}
