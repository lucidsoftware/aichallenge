#include "GameClient.h"

#ifdef _MSC_VER
#include <boost/config/compiler/visualc.hpp>
#endif

#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/version.hpp>
#include <boost/asio/connect.hpp>
#include <boost/asio/ip/tcp.hpp>

#include <cstdlib>
#include <cstring>
#include <iomanip>
#include <iostream>
#include <string>
#include <thread>

#include "rapidjson/document.h"
#include "rapidjson/writer.h"
#include "rapidjson/stringbuffer.h"

namespace http = boost::beast::http;


GameClient::GameClient(const char* host, const char* port) :
    m_connected(false),
	m_host(host),
	m_port(port)
{
}

GameClient::~GameClient()
{
	close();
}

void GameClient::connect()
{
	do
	{
		try
		{
			// If we are currently connected, close the connection.
			close();

			// Look up the domain name.
			boost::asio::ip::tcp::resolver resolver{ m_ioc };
			auto results = resolver.resolve(m_host, m_port);

			// Connect to the server using the results of the lookup.
			boost::asio::connect(m_socket, results.begin(), results.end());
			m_connected = true;
		}
		catch (std::exception e)
		{
			// We get here if the server name cannot be resolved or isn't running. Do nothing so we try again.
			std::cout << "Error connecting to host " << m_host << ":" << m_port << ". The server might not be running, or your command line parameters might be incorrect. Code: " << e.what() << std::endl;
			std::this_thread::sleep_for(std::chrono::milliseconds(1000));
		}
	} while (!m_connected);
}

void GameClient::close()
{
	if (m_connected)
	{
		m_connected = false;

		// Close the socket.
		boost::system::error_code ec;
		m_socket.shutdown(boost::asio::ip::tcp::socket::shutdown_both, ec);

		// Don't report not_connected errors since it happens sometimes.
		if (ec && ec != boost::system::errc::not_connected)
		{
			throw boost::system::system_error{ ec };
		}
	}
}

std::string GameClient::getMessage(const char* target, bool useAuthorization)
{
	// Set up an HTTP GET request message and send it to the host.
	http::request<http::string_body> req{ http::verb::get, target, m_version };
	req.set(http::field::host, m_host);
	req.set(http::field::user_agent, BOOST_BEAST_VERSION_STRING);

	if (useAuthorization)
	{
		std::string bearer = "Bearer ";
		bearer.append(m_token);
		req.set(http::field::authorization, bearer);
	}

	// This throws an exception if there's an error.
	http::write(m_socket, req);

	// Get the response.
	boost::beast::flat_buffer buffer;
	http::response<http::string_body> res;
	http::read(m_socket, buffer, res);

	// Write the message to standard out
	//std::cout << res << std::endl;

	// Get the body as a string.
	return res.body();
}

std::string GameClient::postMessage(const char* target, const char* body, bool useAuthorization)
{
	// Set up an HTTP POST message and send it to the host.
	http::request<http::string_body> req{ http::verb::post, target, m_version, body };
	req.set(http::field::host, m_host);
	req.set(http::field::user_agent, BOOST_BEAST_VERSION_STRING);
	req.set(http::field::content_type, "application/json");
	auto str = std::string(body);
	req.set(http::field::content_length, str.size());
	req.body() = str;

	if (useAuthorization)
	{
		std::string bearer = "Bearer ";
		bearer.append(m_token);
		req.set(http::field::authorization, bearer);
	}

	// This throws an exception if there's an error.
	http::write(m_socket, req);

	// Get the response.
	boost::beast::flat_buffer buffer;
	http::response<http::string_body> res;
	http::read(m_socket, buffer, res);

	// Write the message to standard out.
	//std::cout << res << std::endl;

	// Get the body as a string.
	return res.body();
}

void GameClient::play(Bot* bot, const char* botName, bool persistent)
{
	while (true)
	{
		try
		{
			// Connect to the server.
			connect();
			joinLobby(bot, botName, persistent);
			playGame(bot);
		}
		catch (std::exception e)
		{
			// Do nothing. We'll try to join the lobby again next time around.
			std::cout << "Exception joining lobby: " << e.what() << std::endl;
			std::this_thread::sleep_for(std::chrono::milliseconds(1000));
		}
	}
}

void GameClient::playGame(Bot* bot)
{
	while (true)
	{
		try
		{
			// Reset the game info for the next game.
			m_gameInfo.reset();

			// Get the game to join.
			m_gameName = joinFirstAvailableGame();

			// Send empty moves to start the game and get the initial board state.
			Moves moves;
			sendMoves(moves);

			// Initialize the bot. This gives it a chance to set up bookkeeping, etc.
			bot->setPlayer(m_gameInfo.players[m_botName]);
			bot->init(m_gameInfo.boardWidth, m_gameInfo.boardHeight);

			do
			{
				moves = bot->getMoves(m_gameInfo);
				sendMoves(moves);
				// Handle game over.
			} while (!m_gameInfo.gameOver);
		}
		catch (std::exception e)
		{
			// Something unexpected happened. Exit the loop so we join a new game.
			std::cout << "Exception playing game: " << e.what() << std::endl;
			std::this_thread::sleep_for(std::chrono::milliseconds(1000));
			return;
		}
	}
}

std::vector<std::string> GameClient::getPlayers()
{
	// Get the players.
	std::string jsonPlayers = getMessage("/players", false);

	// TODO: Handle errors

	// Parse the players.
	std::vector<std::string> players;
	rapidjson::Document doc;
	doc.Parse(jsonPlayers.c_str());
	const rapidjson::Value& array = doc.GetArray();

	for (auto& playerObj : array.GetArray())
	{
		const rapidjson::Value& name = playerObj["name"];
		players.push_back(name.GetString());
		std::cout << "Found player: " << name.GetString() << std::endl;
	}

	return players;
}

void GameClient::joinLobby(Bot* bot, const char* requestedBotName, bool persistent)
{
	// Create the json for the bot's name.
	rapidjson::StringBuffer s;
	rapidjson::Writer<rapidjson::StringBuffer> writer(s);
	writer.StartObject();
	writer.Key("name");
	writer.String(requestedBotName);
	writer.Key("persistent");
	writer.Bool(persistent);
	writer.EndObject();
	std::string botInfo = s.GetString();

	// Join the lobby.
	const std::string jsonLobby = postMessage("/players", botInfo.c_str(), false);

	// Parse the bot name and token from the results.
	rapidjson::Document doc;
	doc.Parse(jsonLobby.c_str());
	rapidjson::Value& nameValue = doc["name"];
	m_botName = nameValue.GetString();
	rapidjson::Value& tokenValue = doc["token"];
	m_token = tokenValue.GetString();

	//std::cout << "official name = " << m_botName << std::endl;
	//std::cout << "token = " << m_token << std::endl;
}

std::string GameClient::joinFirstAvailableGame()
{
	std::cout << "Checking for available games ...";
	std::vector<std::string> games;
	do {
		try
		{
			games = listGames();
			if (games.size() == 0)
			{
				std::cout << "." << std::flush;
				std::this_thread::sleep_for(std::chrono::milliseconds(1000));
			}
		}
		catch (std::exception e)
		{
			std::cout << std::endl << "Exception searching for game: " << e.what() << std::endl;
			std::this_thread::sleep_for(std::chrono::milliseconds(1000));
			throw e;
		}
	} while (games.size() == 0);

	std::cout << std::endl << "Joining game: " << games[0] << std::endl;
	return games[0];
}

std::vector<std::string> GameClient::listGames()
{
	// Get the games.
	std::string jsonGames = getMessage("/games", true);

	// Add the games to our array.
	std::vector<std::string> games;
	rapidjson::Document doc;
	doc.Parse(jsonGames.c_str());
	const rapidjson::Value& array = doc.GetArray();
	for (auto& gameObj : array.GetArray())
	{
		const rapidjson::Value& name = gameObj["name"];
		games.push_back(name.GetString());
		//std::cout << "Found game: " << name.GetString() << std::endl;
	}

	return games;
}

void GameClient::sendMoves(Moves& moves)
{
	// Create json data for moves.
	rapidjson::StringBuffer s;
	rapidjson::Writer<rapidjson::StringBuffer> writer(s);
	writer.StartArray();
	for (size_t i = 0; i < moves.size(); i++)
	{
		const Direction& dir = moves[i];
		writer.StartObject();
		writer.Key("x");
		writer.Double(dir.x);
		writer.Key("y");
		writer.Double(dir.y);
		writer.EndObject();
	}
	writer.EndArray();
	std::string movesInfo = s.GetString();

	// Send the moves.
	std::string gameName = encodeUri(m_gameName);
	std::string uri = "/games/" + gameName;
	const std::string jsonGameInfo = postMessage(uri.c_str(), movesInfo.c_str(), true);

	// Parse the game state.
	rapidjson::Document doc;
	doc.Parse(jsonGameInfo.c_str());

	// If the game isn't an object (e.g., is "Not Found"), throw an error to start a new game.
	// This happens if the game can't be found because it ended without us knowing.
	if (!doc.IsObject())
	{
		std::cout << "Trying to play a game that just ended. Joining the next one instead." << std::endl;
		throw std::runtime_error("game-over");
	}

	m_gameInfo.gameOver = (doc.HasMember("over") && doc["over"].IsBool()) ? doc["over"].GetBool() : false;
	m_gameInfo.boardWidth = (doc.HasMember("boardWidth") && doc["boardWidth"].IsInt()) ? doc["boardWidth"].GetInt() : 0;
	m_gameInfo.boardHeight = (doc.HasMember("boardHeight") && doc["boardHeight"].IsInt()) ? doc["boardHeight"].GetInt() : 0;

	// Get the view origin.
	PartialBoard& board = m_gameInfo.partialBoard;
	if (doc.HasMember("viewOrigin") && doc["viewOrigin"].IsObject())
	{
		const rapidjson::Value& v = doc["viewOrigin"];
		board.boardOffset.x = v["x"].GetInt();
		board.boardOffset.y = v["y"].GetInt();
	}

	// If the game isn't over, process the players and board.
	if (!m_gameInfo.gameOver)
	{
		if (doc.HasMember("players") && doc["players"].IsArray())
		{
			// Copy the players so we hold on to their smart pointer and clear the official map.
			Players hold = m_gameInfo.players;
			m_gameInfo.players.clear();

			// Process the players.
			const rapidjson::Value& playersVal = doc["players"];
			if (playersVal.IsArray())
			{
				for (auto& playerObj : playersVal.GetArray())
				{
					const char* playerName = playerObj["name"].GetString();
					std::shared_ptr<Player> player;
					if (!hold[playerName])
					{
						player = std::shared_ptr<Player>(new Player());
						player->name = playerName;
					}
					else
					{
						player = hold[playerName];
					}

					player->id = playerObj["id"].GetInt();
					player->score = playerObj["score"].GetInt();

					if (playerObj.HasMember("pos"))
					{
						const rapidjson::Value& pos = playerObj["pos"];
						player->pos.set(pos["x"].GetInt(), pos["y"].GetInt());
					}
					else
					{
						player->pos.set(Position::UNKNOWN_POS, Position::UNKNOWN_POS);
					}

					if (playerObj.HasMember("dir"))
					{
						const rapidjson::Value& dir = playerObj["dir"];
						player->dir.set(dir["x"].GetInt(), dir["y"].GetInt());
					}
					else
					{
						player->dir.set(Position::UNKNOWN_POS, Position::UNKNOWN_POS);
					}

					// Add the player to the player map.
					m_gameInfo.players[player->name] = player;
				}
			}
		}

		if (doc.HasMember("board") && doc["board"].IsArray())
		{
			// The board state is an array (rows) of arrays (columns) of pairs (owner, trail IDs).
			int index = 0;
			const rapidjson::Value& rows = doc["board"];
			if (rows.IsArray())
			{
				// Get the width and height of the partial board and allocate memory for the owner and trail IDs.
				board.height = rows.Size();
				board.width = board.height > 0 ? rows.GetArray()[0].Size() : 0;
				board.ownerIDs.resize(board.width * board.height);
				board.trailIDs.resize(board.width * board.height);

				// Loop over each row.
				//std::cout << U("board:") << std::endl;
				for (const auto& rowObj : rows.GetArray())
				{
					// Loop over each column in the row.
					for (const auto& colObj : rowObj.GetArray())
					{
						// Parse the data. It's in the format "<owner_id>,<trail_id>".
						int owner = Player::NO_PLAYER;
						int trail = Player::NO_PLAYER;
						const char* col = colObj.GetString();

						// Convert the owner ID to an int.
						if (*col != ',')
						{
							for (owner = 0; *col != ','; col++)
							{
								owner = owner * 10 + *col - '0';
							}
						}

						// Skip over the comma.
						col++;

						// Convert the trail ID to an int.
						if (*col != 0)
						{
							for (trail = 0; *col != 0; col++)
							{
								trail = trail * 10 + *col - '0';
							}
						}

						board.ownerIDs[index] = owner;
						board.trailIDs[index] = trail;
						index++;
						//std::cout << (owner.length() > 0 ? owner : U("."));
						//std::cout << (trail.length() > 0 ? trail : U(" "));
					}
					//std::cout << std::endl;
				}
			}
		}
	}
	else
	{
		m_gameInfo.players.clear();
		m_gameInfo.partialBoard.ownerIDs.clear();
		m_gameInfo.partialBoard.trailIDs.clear();
	}
}

std::string GameClient::encodeUri(const std::string& value)
{
	std::ostringstream escaped;
	escaped.fill('0');
	escaped << std::hex;

	for (std::string::const_iterator i = value.begin(), n = value.end(); i != n; ++i)
	{
		std::string::value_type c = (*i);

		// Keep specific characters as-is.
		if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~')
		{
			escaped << c;
		}
		else
		{
			// Percent-encode other characters.
			escaped << std::uppercase;
			escaped << '%' << std::setw(2) << int((unsigned char)c);
			escaped << std::nouppercase;
		}
	}

	return escaped.str();
}
