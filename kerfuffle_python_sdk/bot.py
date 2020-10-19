from sdk import Bot, Dir, GameServer

class RightBot(Bot):
  def __init__(self, board_data, name, player_id):
    super().__init__(board_data, name, player_id)

  # Return the next five moves given the current board_data
  # self.player_id refers to yourself.
  def get_moves(self, board_data):
    return [Dir(1, 0)] * 5

game_server = GameServer('localhost', '8080', persistent=False)
game_server.play(RightBot, 'right_bot')
