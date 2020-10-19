package com.lucidsoftware.codekerfuffle.scala

import com.lucidsoftware.codekerfuffle.bot.{BotData}

object ExampleScalaBot {
  def main(args: Array[String]): Unit = {
    ScalaDriver.playBot(new ExampleScalaBot(_, _), args)
  }
}

class ExampleScalaBot(self: BotData, initialState: BoardState) extends ScalaBot {
  override def getMoves(state: BoardState): Array[Direction] = {
    // `self.playerId` refers to yourself
    return Array(Direction.Right, Direction.Right, Direction.Right, Direction.Right, Direction.Right)
  }
}
