package com.lucidsoftware.codekerfuffle.kotlin

import com.lucidsoftware.codekerfuffle.bot.Direction as JavaDirection
import com.lucidsoftware.codekerfuffle.bot.Coordinate as JavaCoordinate
import com.lucidsoftware.codekerfuffle.bot.BoardState as JavaBoardState
import com.lucidsoftware.codekerfuffle.bot.LocationData as JavaLocationData
import com.lucidsoftware.codekerfuffle.bot.Player as JavaPlayer


data class BoardState(
    val boardWidth: Int,
    val boardHeight: Int,
    val viewOrigin: Coordinate,
    val board: Array<Array<LocationData>>,
    val players: Array<Player>
) {
    companion object {
        fun fromJava(j: JavaBoardState): BoardState = BoardState(
            j.boardWidth,
            j.boardHeight,
            Coordinate.fromJava(j.viewOrigin),
            j.board.map { it.map { LocationData.fromJava(it) }.toTypedArray()}.toTypedArray(),
            j.players.map { Player.fromJava(it) }.toTypedArray()
        )
    }
}

data class Coordinate (val x: Int, val y: Int){
    companion object {
        fun fromJava(j: JavaCoordinate): Coordinate = Coordinate(j.x, j.y)
    }
}

data class Direction private constructor(val x: Int, val y: Int, val javaDir: JavaDirection) {
    companion object {
        val Left = Direction(-1, 0, JavaDirection.LEFT)
        val Right = Direction(1, 0, JavaDirection.RIGHT)
        val Up = Direction(0, -1, JavaDirection.UP)
        val Down = Direction(0, 1, JavaDirection.DOWN)
        fun fromJava(javaDir: JavaDirection): Direction =
            if (javaDir == JavaDirection.LEFT) Left
            else if (javaDir == JavaDirection.RIGHT) Right
            else if (javaDir == JavaDirection.UP) Up
            else Down
    }
    fun toCoordinate() = Coordinate(x, y)
}

data class LocationData(val owner: Int?, val tail: Int?) {
    companion object {
        fun fromJava(j: JavaLocationData): LocationData = LocationData(
            if (j.owner == -1) null else j.owner,
            if (j.tail == -1) null else j.tail
        )
    }
}

data class Player(
    val id: Int,
    val name: String,
    val score: Int,
    val location: Coordinate?,
    val direction: Direction?
) {
    companion object {
        fun fromJava(j: JavaPlayer): Player = Player(
            j.id,
            j.name,
            j.score,
            j.location.map{Coordinate.fromJava(it)}.orElse(null),
            j.direction.map{Direction.fromJava(it)}.orElse(null)
        )
    }
}
