#pragma once

#include <map>
#include <memory>
#include <string>
#include <vector>


/**********************************************************************************************************************
 * For this game, you shouldn't see a negative position (unless you're somewhere you shouldn't be).
 *********************************************************************************************************************/
class Position
{
public:
	Position(int _x = 0, int _y = 0);
	Position& set(int _x, int _y) { x = _x; y = _y; return *this; }
	bool isValid() const { return x != UNKNOWN_POS && y != UNKNOWN_POS; }
	bool operator==(const Position& src) const { return src.x == x && src.y == y; }
	int x;
	int y;

	enum {UNKNOWN_POS = -1};
};

/**********************************************************************************************************************
 * The direction to move. Must always have a length of 1 in a cardinal direction.
 *********************************************************************************************************************/
class Direction
{
public:
	Direction(int _x = 0, int _y = 0);
	Direction& set(int _x, int _y) { x = _x; y = _y; return *this; }
	bool operator==(const Position& src) const { return src.x == x && src.y == y; }
	int x;
	int y;

	static Direction Up;
	static Direction Down;
	static Direction Left;
	static Direction Right;
};

/**********************************************************************************************************************
 * Holds the best-known data for the player, updated each turn.
 *********************************************************************************************************************/
class Player
{
public:
	int id;              // The player's ID. This is used in the board data.
	std::string name;    // The name of the player as assigned by the server (e.g., after name conflict resolution).
	int score;           // The number of spaces owned by the player.
	Position pos;        // The player's current position.
	Direction dir;       // The player's current direction.

	enum {NO_PLAYER = -1};
};

/**********************************************************************************************************************
 * Holds the best-known data for the player, updated each turn. Maps the assigned bot name to the Player.
 *********************************************************************************************************************/
class Players : public std::map< std::string, std::shared_ptr< Player> >
{
public:
	Player* findPlayerById(int playerId) const;
};

/**********************************************************************************************************************
 * BoardData represents an incomplete view of the board.
 *********************************************************************************************************************/
class Board
{
public: // Methods
	Board();
	void reset();
	int getOwnerId(int x, int y) const { return ownerIDs[getIndex(x, y)]; }
	int getOwnerId(const Position& pos) const { return ownerIDs[getIndex(pos)]; }
	void setOwnerId(int x, int y, int ownerId) { ownerIDs[getIndex(x, y)] = ownerId; }
	void setOwnerId(const Position& pos, int ownerId) { ownerIDs[getIndex(pos)] = ownerId; }
	int getTrailId(int x, int y) const { return trailIDs[getIndex(x, y)]; }
	int getTrailId(const Position& pos) const { return trailIDs[getIndex(pos)]; }
	void setTrailId(int x, int y, int trailId) { trailIDs[getIndex(x, y)] = trailId; }
	void setTrailId(const Position& pos, int trailId) { trailIDs[getIndex(pos)] = trailId; }
	int getIndex(int x, int y) const { return y * width + x; }
	int getIndex(const Position& pos) const { return pos.y * width + pos.x; }

public: // Data
	int width;                 // The width of this data. Likely a subset of the entire board. May change each time.
	int height;                // The height of this data. Likely a subset of the entire board. May change each time.
	std::vector<int> ownerIDs; // A two dimensional array of player IDs for who owns each position.
	std::vector<int> trailIDs; // A two dimensional array of player IDs for who is trying to take each position.
};

/**********************************************************************************************************************
 * BoardData represents an incomplete view of the board.
 *********************************************************************************************************************/
class PartialBoard : public Board
{
public: // Methods
	PartialBoard();

public: // Data
	Position boardOffset;       // The offset of this data in the "real" board.
};

/**********************************************************************************************************************
 * The player makes 5 moves at a time (unless this comment is old).
   Additional will be ignored. Too few, and the player will continue in the previous direction.
 *********************************************************************************************************************/
class Moves : public std::vector<Direction>
{
public: // Methods
	void addMove(Direction direction) { push_back(direction); }
	enum {MOVES_PER_TURN = 5};
};

/**********************************************************************************************************************
 * GameInfo is the data the player receives from the game server each turn.
 *********************************************************************************************************************/
class GameInfo
{
public: // Methods
	GameInfo();
	void reset();

public: // Data
	int boardWidth;            // The width of the entire board. This remains constant while the bot is in the game.
	int boardHeight;           // The height of the entire board. This remains constant while the bot is in the game.
	PartialBoard partialBoard; // The state of the board. This is not the complete board.
	Players players;           // The players currently in the game.
	bool gameOver;             // Whether or not the game is over.
};
