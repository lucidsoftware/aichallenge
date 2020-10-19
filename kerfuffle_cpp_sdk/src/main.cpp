#include "GameClient.h"
#include "BeastBot.h"
#include <string>
#include <boost/algorithm/string.hpp>

int main(int argc, char** argv)
{
	// Get the command line parameters.
	const char* botName = argc > 1 ? argv[1] : "MyName";
	std::string persistent = argc > 2 ? argv[2] : "true";
	const char* host = argc > 3 ? argv[3] : "10.100.139.2";
	const char* port = argc > 4 ? argv[4] : "80";
	boost::algorithm::to_lower(persistent);
	bool isPersistent = persistent == "true" || persistent == "1";

	// Create a game client.
	GameClient client(host, port);

	// Create a bot.
	Bot* bot = new BeastBot();

	// Let the games begin!
	client.play(bot, botName, isPersistent);

	// We don't actually get here (because no one will ever want to quit this game).
	delete bot;

	return 0;
}
