package com.lucidsoftware.codekerfuffle.kotlin

import com.lucidsoftware.codekerfuffle.bot.BotData

class ExampleKotlinBot(private val self: BotData, private val initialState: BoardState): KotlinBot {
    override fun getMoves(state: BoardState): Array<Direction> {
        // `self.playerId` refers to yourself
        return arrayOf(Direction.Right, Direction.Right, Direction.Right, Direction.Right, Direction.Right)
    }
}

fun main(args : Array<String>) {
    KotlinBot.playBot({botData, boardState -> ExampleKotlinBot(botData, boardState)}, args)
}