package com.lucidsoftware.codekerfuffle.scala

import com.lucidsoftware.codekerfuffle.{bot => javaTypes}

case class BoardState(
  boardWidth: Int,
  boardHeight: Int,
  viewOrigin: Coordinate,
  board: Array[Array[LocationData]],
  players: Array[Player]
)
object BoardState {
  def fromJava(j: javaTypes.BoardState): BoardState = {
    BoardState(
      j.boardWidth,
      j.boardHeight,
      Coordinate.fromJava(j.viewOrigin),
      j.board.map(_.map(LocationData.fromJava)),
      j.players.map(Player.fromJava)
    )
  }
}

case class Coordinate(x: Int, y: Int)
object Coordinate {
  def fromJava(j: javaTypes.Coordinate): Coordinate = {
    Coordinate(j.x, j.y)
  }
}

sealed trait Direction extends Coordinate {
  def toJava: javaTypes.Direction
}
object Direction {
  def fromJava(javaDir: javaTypes.Direction): Direction = {
    if (javaDir == javaTypes.Direction.LEFT) Left
    else if (javaDir == javaTypes.Direction.RIGHT) Right
    else if (javaDir == javaTypes.Direction.UP) Up
    else Down
  }
  val Left = new Coordinate(-1, 0) with Direction {
    override def toJava: javaTypes.Direction = javaTypes.Direction.LEFT
  }
  val Right = new Coordinate(1, 0) with Direction {
    override def toJava: javaTypes.Direction = javaTypes.Direction.RIGHT
  }
  val Up = new Coordinate(0, -1) with Direction {
    override def toJava: javaTypes.Direction = javaTypes.Direction.UP
  }
  val Down = new Coordinate(0, 1) with Direction {
    override def toJava: javaTypes.Direction = javaTypes.Direction.DOWN
  }
}

case class LocationData(owner: Option[Int], tail: Option[Int])
object LocationData {
  def fromJava(j: javaTypes.LocationData): LocationData = {
    LocationData(
      if (j.owner == -1) None else Some(j.owner),
      if (j.tail == -1) None else Some(j.tail)
    )
  }
}

case class Player(
  id: Int,
  name: String,
  score: Int,
  location: Option[Coordinate],
  direction: Option[Direction]
)
object Player {
  def fromJava(j: javaTypes.Player): Player = {
    Player(
      j.id,
      j.name,
      j.score,
      Option(j.location.orElse(null)).map(Coordinate.fromJava),
      Option(j.direction.orElse(null)).map(Direction.fromJava)
    )
  }
}
