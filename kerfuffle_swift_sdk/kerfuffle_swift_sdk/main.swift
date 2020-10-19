import Foundation

class MyBot : Bot {
    
    let playerName: String
    // The player id that belongs to yourself
    let playerId: Int
    
    init(data: BoardData, playerName: String, playerId: Int) {
        self.playerName = playerName
        self.playerId = playerId
    }
    
    
    // Return the next 5 move.
    func getMoves(data: BoardData) -> [Coord] {
       
        return [
            Coord(x: 1, y: 0),
            Coord(x: 1, y: 0),
            Coord(x: 1, y: 0),
            Coord(x: 1, y: 0),
            Coord(x: 1, y: 0)
        ]
    }
}
var over = false
play(botContructor: MyBot.init(data:playerName:playerId:))
RunLoop.current.run()
