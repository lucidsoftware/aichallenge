package com.lucidsoftware.codekerfuffle.kotlin

import com.lucidsoftware.codekerfuffle.bot.BoardState as JavaBoardState
import com.lucidsoftware.codekerfuffle.bot.Bot as JavaBot
import com.lucidsoftware.codekerfuffle.bot.BotData
import com.lucidsoftware.codekerfuffle.bot.Direction as JavaDirection
import com.lucidsoftware.codekerfuffle.driver.BotDriver

interface KotlinBot {
    companion object {
        private class IntermediateBot(self: BotData, initialState: JavaBoardState, private val bot: KotlinBot) : JavaBot(self, initialState) {
            override fun getMoves(state: JavaBoardState): Array<JavaDirection> {
                return bot.getMoves(BoardState.fromJava(state)).map{d -> d.javaDir}.toTypedArray()
            }
        }

        fun playBot(factory: (BotData, BoardState) -> KotlinBot, args: Array<String>) {
            BotDriver.playBot({botData, boardState ->
                IntermediateBot(botData, boardState, factory(botData, BoardState.fromJava(boardState)))
            }, args)
        }
    }

    fun getMoves(state: BoardState): Array<Direction>
}
