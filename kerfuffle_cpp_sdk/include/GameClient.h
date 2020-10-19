#pragma once

#include "GameInfo.h"
#include "Bot.h"

#include <map>
#include <string>
#include <vector>

// Define the Win32 version to be Windows 10; boost::asio complains if it's not defined.
#if defined(_MSC_VER) && !defined(_WIN32_WINNT)
#define _WIN32_WINNT 0x0A00
#endif

#include <boost/asio/connect.hpp>
#include <boost/asio/ip/tcp.hpp>

//---------------------------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------
class GameClient
{
public:
	GameClient(const char* host, const char* port);
	~GameClient();
	void play(Bot* bot, const char* botName, bool persistent);

private: // Methods
	void connect();
	void close();
	std::string getMessage(const char* target, bool useAuthorization);
	std::string postMessage(const char* target, const char* body, bool useAuthorization);

	std::vector<std::string> getPlayers();
	void joinLobby(Bot* bot, const char* requestedBotName, bool persistent);
	void playGame(Bot* bot);
	std::string joinFirstAvailableGame();
	std::vector<std::string> listGames();
	void sendMoves(Moves& moves);

	std::string encodeUri(const std::string& value);

private:
	bool m_connected; // Whether or not the client is connected to the server.
	boost::asio::io_context m_ioc; // Required for all I/O
	boost::asio::ip::tcp::socket m_socket{ m_ioc };

	std::string m_host;
	std::string m_port;
	const int m_version = 11;

	std::string m_token;    // A token used for authentication.
	std::string m_gameName; // The name of the game.
	std::string m_botName;  // The assigned bot name, used to look up the player in the player map.

	GameInfo m_gameInfo;
};
