#include "BeastBot.h"

// Initialize internal data structures, reset from the previous run of the game, etc.
void BeastBot::init(int boardWidth, int boardHeight)
{
}

// Process the game info. Make decisions. Return 5 moves.
Moves BeastBot::getMoves(const GameInfo& gameInfo)
{
	Moves moves;
	moves.addMove(Direction::Right);
	moves.addMove(Direction::Right);
	moves.addMove(Direction::Right);
	moves.addMove(Direction::Right);
	moves.addMove(Direction::Right);
	return moves;
}
