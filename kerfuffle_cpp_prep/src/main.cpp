// Lots of headers. Not all used, but make sure they exist.
#include <map>
#include <vector>
#include <cstdlib>
#include <cstring>
#include <iomanip>
#include <iostream>
#include <string>
#include <thread>

// Define the Win32 version to be Windows 10; boost::asio complains if it's not defined.
#if defined(_MSC_VER) && !defined(_WIN32_WINNT)
#define _WIN32_WINNT 0x0A00
#endif

#include <boost/algorithm/string.hpp>
#include <boost/asio/connect.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/version.hpp>

#ifdef _MSC_VER
#include <boost/config/compiler/visualc.hpp>
#endif

#include <rapidjson/document.h>
#include <rapidjson/writer.h>
#include <rapidjson/stringbuffer.h>

namespace http = boost::beast::http;

int main(int argc, char** argv)
{
	// Get the command line parameters.
	const char* host = "jsonplaceholder.typicode.com";
	const char* target = "/todos/1";
	const char* port = "80";

	boost::asio::io_context ioc; // Required for all I/O
	boost::asio::ip::tcp::socket socket{ ioc };

	// Look up the domain name.
	boost::asio::ip::tcp::resolver resolver{ ioc };
	auto results = resolver.resolve(host, port);

	// Connect to the server using the results of the lookup.
	boost::asio::connect(socket, results.begin(), results.end());

	// Set up an HTTP GET request message and send it to the host.
	http::request<http::string_body> req{ http::verb::get, target, 11 /*version*/ };
	req.set(http::field::host, host);
	req.set(http::field::user_agent, BOOST_BEAST_VERSION_STRING);

	// This throws an exception if there's an error.
	http::write(socket, req);

	// Get the response.
	boost::beast::flat_buffer buffer;
	http::response<http::string_body> res;
	http::read(socket, buffer, res);

	// Write the message to standard out. Use this to help debug what's wrong.
	// std::cout << res << std::endl;

	// Get the body as a string.
	std::string body = res.body();

	// Parse the title.
	rapidjson::Document doc;
	doc.Parse(body.c_str());
	std::string title = doc["title"].GetString();
	if (title == "delectus aut autem")
	{
		std::cout << "You're ready for the Lucid coding competition!" << std::endl;
	}
	else
	{
		std::cout << "Something went wrong. Make sure you're connected to the internet." << std::endl;
	}

	// Close the socket.
	boost::system::error_code ec;
	socket.shutdown(boost::asio::ip::tcp::socket::shutdown_both, ec);

	// Don't report not_connected errors since it happens sometimes.
	if (ec && ec != boost::system::errc::not_connected)
	{
		throw boost::system::system_error{ ec };
	}

	return 0;
}
