package com.lucidsoftware.codekerfuffle.scala

import com.lucidsoftware.codekerfuffle.bot.{Bot, BotData, BotFactory}
import com.lucidsoftware.codekerfuffle.{bot => javaTypes}
import com.lucidsoftware.codekerfuffle.driver.BotDriver

object ScalaDriver {
  private class IntermediateBot(self: BotData, initialState: javaTypes.BoardState, scalaBot: ScalaBot) extends javaTypes.Bot(self, initialState) {
    override def getMoves(state: javaTypes.BoardState): Array[javaTypes.Direction] = scalaBot.getMoves(BoardState.fromJava(state)).map(_.toJava)
  }

  def playBot(factory: (BotData, BoardState) => ScalaBot, args: Array[String]): Unit = {
    BotDriver.playBot(new BotFactory {
      override def buildBot(self: BotData, initialState: javaTypes.BoardState): Bot =
        new IntermediateBot(self, initialState, factory(self, BoardState.fromJava(initialState)))
    }, args)
  }
}

trait ScalaBot {
  def getMoves(state: BoardState): Array[Direction]
}