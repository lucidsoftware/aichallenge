import Foundation
import PromiseKit

let session = URLSession.shared
let decoder = JSONDecoder()
let encoder = JSONEncoder()

class Q {
    class func main(_ block: @escaping () -> Void) {
        DispatchQueue.main.async(execute: block)
    }
    
    class func mainAfter(_ seconds: Float, block: @escaping () -> Void) {
        DispatchQueue.main.asyncAfter(deadline: DispatchTime.now() + Double(seconds), execute: block)
    }
    
    class func background(_ block: @escaping () -> Void) {
        DispatchQueue.global(qos: .background).async(execute: block)
    }
}

extension NSError {
   convenience init(_ reason: String)  {
        self.init(domain: "com.lucidchart.kerfuffle", code: 0, userInfo: [NSLocalizedDescriptionKey: reason])
    }
}

extension URLResponse {
    var statusCode: Int? {
        return (self as? HTTPURLResponse)?.statusCode
    }
}

class Coord: Codable {
    let x: Double
    let y: Double
    
    init(x: Double, y: Double) {
        self.x = x
        self.y = y
    }
}

class JoinRequest : Codable {
    let name: String
    let persistent: Bool
    
    init(name: String, persistent: Bool) {
        self.name = name
        self.persistent = persistent
    }
}

class PlayerSession : Codable {
    let name: String
    let persistent: Bool
    let token: String
}

class Game : Codable {
    let name: String
}

class PlayerData: Codable {
    let id: Int;
    let name: String;
    let score: Double;
    let pos: Coord?;
    let dir: Coord?;
}

class LocationData: Codable {

    let owner: Int?
    let tail: Int?
    
    required init(from decoder: Decoder) throws {
        guard let value = try? decoder.singleValueContainer().decode(String.self) else { throw NSError("Can't decode LocationData")}
        guard let index = value.firstIndex(of: ",") else { throw NSError("Can't decode LocationData") }
        if value.count <= 1 {
            owner = nil
            tail = nil
        } else {
            if index.encodedOffset == 0 {
                owner = nil
            } else {
                owner = Int(value[..<index])
            }
            let nextIndex = value.index(index, offsetBy: 1)
            if nextIndex == value.endIndex {
                tail = nil
            } else {
                tail = Int(value[nextIndex...])
            }
        }
    }
    
}

class BoardData: Codable {
    let boardWidth: Double!
    let boardHeight: Double!
    let viewOrigin: Coord!
    let board: [[LocationData]]!
    let players: [PlayerData]!
    let over: Bool!
}

func poll<T>(retryMessage: String, failedMessage: String = "", maximumRetryCount: Int = -1, delayBeforeRetry: DispatchTimeInterval = .seconds(1), _ body: @escaping () -> Promise<T>) -> Promise<T> {
    var attempts = 0
    func attempt() -> Promise<T> {
        attempts += 1
        return body().recover { error -> Promise<T> in
            guard attempts != maximumRetryCount else {
                print(failedMessage)
                throw error
            }
            return after(delayBeforeRetry).then(on: nil, attempt)
        }
    }
    return attempt()
}

fileprivate var playerSession: PlayerSession? = nil

fileprivate func makeRequest(path: String, method: String, body: Data? = nil) -> URLRequest {
    var urlComponent = URLComponents()
    urlComponent.scheme = "http"
    urlComponent.host = host
    urlComponent.port = port
    urlComponent.path = path
    guard let url = urlComponent.url else { fatalError("Could not create URL from components") }
    
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.httpBody = body
    var headers = request.allHTTPHeaderFields ?? [:]
    headers["Content-Type"] = "application/json"
    if let token = playerSession?.token {
        headers["Authorization"] = "Bearer " + token
    }
    request.allHTTPHeaderFields = headers
    
    return request
}

func joinLobby() -> Promise<PlayerSession> {
    let joinRequest = JoinRequest(name: name, persistent: persistent)
    let body = try! encoder.encode(joinRequest)
    
    return poll(retryMessage: "Failed to connect. Retrying...", failedMessage: "Failed to connect", maximumRetryCount: 50) {
        firstly {
            session.dataTask(.promise, with: makeRequest(path: "/players", method: "POST", body: body))
        }.map { data, _ in
            do {
                return try decoder.decode(PlayerSession.self, from: data)
            } catch {
                throw NSError("Could not decode PlayerSession")
            }
        }
    }
}

func listGames() -> Promise<[Game]> {
    return firstly {
        session.dataTask(.promise, with: makeRequest(path: "/games", method: "GET"))
    }.map { data, _ in
        do {
            let games = try decoder.decode([Game].self, from: data)
            if games.count == 0 {
                throw NSError("No games yet")
            } else {
                return games
            }
        } catch {
            throw NSError("Could not decode Game")
        }
    }
}

func sendMove(gameName: String, moves: [Coord]) -> Promise<BoardData>  {
    return firstly {
        return session.dataTask(.promise, with: makeRequest(path: "/games/\(gameName)", method: "POST", body: try encoder.encode(moves)))
    }.map { data, _ in
        do {
            return try decoder.decode(BoardData.self, from: data)
        } catch {
            throw NSError("Could not decode BoardData")
        }
    }
}

func joinFirstAvailableGame(_ promise: Promise<Game>? = nil) -> Promise<Game> {
    print("Checking for available games...")
    
    return poll(retryMessage: "...", listGames).map { games in
        print("Auto-joining game " + games[0].name)
        return games[0]
    }
}

protocol Bot {
    func getMoves(data: BoardData) -> [Coord] 
}

func play(botContructor: @escaping (_ state: BoardData, _ name: String, _ playerId: Int) -> Bot) {
    
    let sessionPromise: Promise<PlayerSession>
    if let playerSession = playerSession {
        sessionPromise = Promise.value(playerSession)
    } else {
        sessionPromise = joinLobby()
    }
    sessionPromise.then { (newPlayerSession) throws -> Promise<Game> in
        playerSession = newPlayerSession
        return joinFirstAvailableGame()
    }.then { (game) throws -> Promise<Void> in
        guard let localPlayerSession = playerSession else { throw NSError("No player session") }
        return sendMove(gameName: game.name, moves: [Coord]()).done { state in
            guard let players = state.players else { throw NSError("No players returned") }
            let playerId = players.first(where: { $0.name == localPlayerSession.name })!.id
            let bot = botContructor(state, localPlayerSession.name, playerId)

            func moveLoop(state: BoardData) {
                let moves = bot.getMoves(data: state)
                sendMove(gameName: game.name, moves: moves).done { state in
                    if case true? = state.over {
                        print("Game over")
                        play(botContructor: botContructor)
                    } else {
                        moveLoop(state: state)
                    }
                }.catch { error in
                    print(error.localizedDescription)
                    playerSession = nil
                    play(botContructor: botContructor)
                }
            }
            moveLoop(state: state)
        }
    }.catch { error in
        print(error.localizedDescription)
        playerSession = nil
        play(botContructor: botContructor)
    }
}


