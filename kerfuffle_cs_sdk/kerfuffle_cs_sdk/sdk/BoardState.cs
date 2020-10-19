namespace kerfuffle_cs_sdk
{
    public struct Coordinate
    {
        public readonly int x;
        public readonly int y;

        public static Coordinate Zero = new Coordinate(0, 0);

        public Coordinate(int x, int y)
        {
            this.x = x;
            this.y = y;
        }

        public override bool Equals(object obj)
        {
            if (obj is Coordinate)
            {
                return (Coordinate)obj == this;
            }
            else
            {
                return false;
            }
        }

        public override int GetHashCode()
        {
            return x.GetHashCode() * 13 + y.GetHashCode();
        }

        public override string ToString()
        {
            return "(" + x + ", " + y + ")";
        }

        public static bool operator ==(Coordinate a, Coordinate b)
        {
            return a.x == b.x && a.y == b.y;
        }

        public static bool operator !=(Coordinate a, Coordinate b)
        {
            return a.x != b.x || a.y != b.y;
        }
    }

    public struct LocationData
    {
        // <summary>null if nobody owns the board location otherwise it is the user id</summary>
        public readonly int? owner;
        // <summary>null if there is no tail at this location otherwise the user id of the tail</summary>
        public readonly int? tail;

        public LocationData(int? owner, int? tail)
        {
            this.owner = owner;
            this.tail = tail;
        }
    }

    public struct PlayerData
    {
        // <summary>the id of the player</summary>
        public readonly int id;
        // <summary>the name of the player</summary>
        public readonly string name;
        // <summary>the score of the player</summary>
        public readonly int score;
        // <summary>null if the location of the player is unknown</summary>
        public readonly Coordinate? pos;
        // <summary>null if the direction of the player is unkown</summary>
        public readonly Coordinate? dir;

        public PlayerData(
            int id,
            string name,
            int score,
            Coordinate? pos,
            Coordinate? dir
        )
        {
            this.id = id;
            this.name = name;
            this.score = score;
            this.pos = pos;
            this.dir = dir;
        }
    }

    public struct BoardState
    {
        /// <summary>the total width of the player area</summary>
        public readonly int boardWidth;
        /// <summary>the total height of the play area</summary>
        public readonly int boardHeight;
        /// <summary>the top left location of board in the play area</summary>
        public readonly Coordinate viewOrigin;
        /// <summary>a 2d array of board data where the top left corner is viewOrigin
        /// indexed using board[row, column] increasing row moves down
        /// increasing column moves right</summary>
        public readonly LocationData[,] board;
        /// <summary>the other players on the board</summary>
        public readonly PlayerData[] players;
        /// <summary>false while the game is still running</summary>
        public readonly bool over;

        public BoardState(
            int boardWidth,
            int boardHeight,
            Coordinate viewOrigin,
            LocationData[,] board,
            PlayerData[] players,
            bool over
        )
        {
            this.boardWidth = boardWidth;
            this.boardHeight = boardHeight;
            this.viewOrigin = viewOrigin;
            this.board = board;
            this.players = players;
            this.over = over;
        }
    }
}
