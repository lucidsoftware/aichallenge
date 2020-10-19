#pragma once

#include "Bot.h"
#include "GameInfo.h"
#include <vector>

//---------------------------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------
class BeastBot : public Bot
{
public:
	/**
	 * This is called once at the beginning of the game and allows the bot to initialize/reset internal structures if desired.
	 */
	virtual void init(int boardWidth, int boardHeight);

	/**
	 * This is called from the main game loop.
	 * gameInfo: Represents a partial state of the board (think fog of war, where the bot is given only its immediate surroundings).
	 * The function must return an array of 5 moves that will be taken in lock-step with the other bots.
	 * If it returns fewer than 5 moves, the bot will continue in the last direction; moves beyond 5 will be ignored.
	 */
	virtual Moves getMoves(const GameInfo& gameInfo);
};
