using System;
using System.Net;
using System.Net.Http;
using LightJson.Serialization;
using System.IO;
using LightJson;
using System.Threading.Tasks;
using System.Net.Http.Headers;
using System.Linq;
using System.Web;

namespace kerfuffle_cs_sdk
{
    public struct ClientInfo
    {
        public readonly string name;
        public readonly string token;

        public ClientInfo(string name, string token)
        {
            this.name = name;
            this.token = token;
        }
    }

    public class GameClient
    {
        private string host;
        private int port;
        private ClientInfo? clientInfo = null;
        private HttpClient httpClient = new HttpClient();

        public GameClient(string host, int port)
        {
            this.host = host;
            this.port = port;
        }

        private string UrlFromPath(string path)
        {
            return "http://" + host + ":" + port + path;
        }

        private async Task<JsonValue> ReadResponseJson(HttpResponseMessage response)
        {
            return JsonReader.Parse(new StreamReader(await response.Content.ReadAsStreamAsync()));
        }

        private HttpContent JsonBody(JsonValue json)
        {
            string stringBody = JsonWriter.Serialize(json);
            HttpContent body = new StringContent(stringBody);
            body.Headers.ContentType = new MediaTypeHeaderValue("application/json");
            return body;
        }

        public async Task<ClientInfo> JoinLobby(string name, bool persistent, int count = 0)
        {
            while (count >= 0)
            {
                JsonObject jsonObj = new JsonObject();
                jsonObj.Add("name", name);
                jsonObj.Add("persistent", persistent);
                HttpContent body = JsonBody(jsonObj);
                HttpResponseMessage response = await httpClient.PostAsync(UrlFromPath("/players"), body);
                
                if (response.StatusCode == HttpStatusCode.Created)
                {
                    JsonValue jsonResponse = await ReadResponseJson(response);

                    ClientInfo result = new ClientInfo(
                        jsonResponse["name"].AsString,
                        jsonResponse["token"].AsString
                        );
                    httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", result.token);
                    clientInfo = result;
                    return result;
                }

                Console.WriteLine("Failed to connect. Retrying...");
                System.Threading.Thread.Sleep(1000);
                --count;
            }

            throw new Exception("Failed to join lobby");
        }

        public async Task<string[]> ListGames()
        {
            if (clientInfo == null)
            {
                throw new Exception("Cannot list games until the client has joined the lobby");
            }

            HttpResponseMessage response = await httpClient.GetAsync(UrlFromPath("/games"));

            if (response.StatusCode == HttpStatusCode.OK)
            {
                JsonValue result = await ReadResponseJson(response);
                return result.AsJsonArray.Select(value => value["name"].AsString).ToArray();
            }

            throw new Exception("Failed to list games");
        }

        public async Task<BoardState> SendMove(string gameName, Coordinate[] data)
        {
            JsonArray payload = new JsonArray();
            foreach (Coordinate coord in data)
            {
                payload.Add(CoordinateToJson(coord));
            }

            HttpContent body = JsonBody(payload);
            HttpResponseMessage response = await httpClient.PostAsync(UrlFromPath("/games/" + HttpUtility.UrlEncode(gameName).Replace("+", "%20")), body);

            if (response.StatusCode == HttpStatusCode.OK)
            {
                JsonValue result = await ReadResponseJson(response);

                if (result["over"].AsBoolean)
                {
                    return new BoardState(
                        0,
                        0,
                        new Coordinate(0, 0),
                        new LocationData[0, 0],
                        new PlayerData[0],
                        true
                        );
                }

                LocationData[][] boardArrayArray = result["board"].AsJsonArray.Select(
                    row => row.AsJsonArray.Select(locationData =>
                    {
                        string[] parts = locationData.AsString.Split(',');

                        int? owner = null;
                        int? tail = null;
                        int parseResult;

                        if (int.TryParse(parts[0].Trim(), out parseResult))
                        {
                            owner = parseResult;
                        }

                        if (parts.Length > 1 && int.TryParse(parts[1].Trim(), out parseResult))
                        {
                            tail = parseResult;
                        }

                        return new LocationData(owner, tail);
                    }).ToArray()
                    ).ToArray();

                int rows = boardArrayArray.Length;
                int cols = boardArrayArray.Select(arr => arr.Length).Min();

                LocationData[,] board = new LocationData[rows, cols];

                for (int rowIndex = 0; rowIndex < boardArrayArray.Length; ++rowIndex)
                {
                    LocationData[] row = boardArrayArray[rowIndex];

                    for (int colIndex = 0; colIndex < row.Length; ++colIndex)
                    {
                        board[rowIndex, colIndex] = row[colIndex];
                    }
                }

                return new BoardState(
                    result["boardWidth"].AsInteger,
                    result["boardHeight"].AsInteger,
                    ParseCoordinate(result["viewOrigin"].AsJsonObject),
                    board,
                    result["players"].AsJsonArray.Select(jsValue => ParsePlayerData(jsValue.AsJsonObject)).ToArray(),
                    false
                    );
            }

            throw new Exception("Failed to send move");
        }

        public async Task<string> JoinFirstAvailableGame()
        {
            Console.WriteLine("Checking for available games...");
            string[] games = new string[0];

            while (games.Length == 0)
            {
                games = await ListGames();
                if (games.Length == 0)
                {
                    System.Threading.Thread.Sleep(1000);
                }
            }

            Console.WriteLine("Auto joining game " + games[0]);
            return games[0];
        }

        private static PlayerData ParsePlayerData(JsonObject jsonObj)
        {
            Coordinate? pos = null;
            Coordinate? dir = null;

            if (jsonObj.ContainsKey("pos"))
            {
                pos = ParseCoordinate(jsonObj["pos"].AsJsonObject);
            }

            if (jsonObj.ContainsKey("dir"))
            {
                dir = ParseCoordinate(jsonObj["dir"].AsJsonObject);
            }

            return new PlayerData(
                jsonObj["id"].AsInteger,
                jsonObj["name"].AsString,
                jsonObj["score"].AsInteger,
                pos,
                dir
            );
        }

        private static JsonValue CoordinateToJson(Coordinate coordinate)
        {
            JsonObject result = new JsonObject();
            result.Add("x", coordinate.x);
            result.Add("y", coordinate.y);
            return result;
        }

        private static Coordinate ParseCoordinate(JsonObject obj)
        {
            return new Coordinate(obj["x"].AsInteger, obj["y"].AsInteger);
        }
    }
}
