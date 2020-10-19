package com.lucidsoftware.codekerfuffle.bot;

public class LocationData {

    /**
     * A -1 to represent no owner
     */
    public final int owner;
    /**
     * A -1 to represent no tail
     */
    public final int tail;

    public LocationData(int owner, int tail) {
        this.owner = owner;
        this.tail = tail;
    }

    @Override
    public boolean equals(Object o) {
        if (o instanceof LocationData) {
            LocationData d = (LocationData) o;
            return d.owner == this.owner && d.tail == this.tail;
        } else {
            return false;
        }
    }

    @Override
    public int hashCode() {
        return new Integer(owner * 31 + tail).hashCode();
    }

    @Override
    public String toString() {
        return String.format("(owner=%d, tail=%d)", owner, tail);
    }
}
