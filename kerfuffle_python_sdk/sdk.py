import json
from urllib import request, parse, error
from http.client import HTTPException
from time import sleep
import traceback


class Bot:
  """
  Bot class to be passed to GameServer.play
  """

  def __init__(self, board_data, name, player_id):
    """
    Parameters
    ----------
    board_data : BoardData
        The initial state of the game
    name : str
        The name assigned to this bot by the game server
    player_id : str
        The id of your player in this game
    """
    self.board_data = board_data
    self.name = name
    self.player_id = player_id

  def get_moves(self, board_data):
    """
    The function called by the GameServer to get your Bot's moves

    Parameters
    ----------
    board_data : BoardData
        The current state of the board

    Returns
    -------
    list of Dir
        Exactly 5 moves to be sent to the server.
        Each item in the list should be a Dir or dict with "x" and "y" keys.
    """
    return []


class Pos:
  def __init__(self, x, y):
    self.x = x
    self.y = y

  def __repr__(self):
    return "Pos(x = {}, y = {})".format(self.x, self.y)


class Dir:
  def __init__(self, x, y):
    self.x = x
    self.y = y

  def __repr__(self):
    return "Dir(x = {}, y = {})".format(self.x, self.y)


class Player:
  def __init__(self, name, token):
    self.name = name
    self.token = token

  def __repr__(self):
    return 'Player(name = "{name}", token = "{token}")'.format(**self.__dict__)

class LocationData:
  def __init__(self, owner, tail):
    self.owner = owner
    self.tail = tail

  def from_string(s):
    return LocationData(*s.split(','))

  def __repr__(self):
    return 'LocationData(owner = {owner}, tail = {tail})'.format(**self.__dict__)

class PlayerData:
  def __init__(
    self,
    id = None,
    name = None,
    score = None,
    pos = None,
    dir = None,
  ):
    self.id = str(id)
    self.name = name
    self.score = score
    self.pos = Pos(**pos) if pos else None
    self.dir = Dir(dir['x'], dir['y']) if dir else None

  def __repr__(self):
    return (
      'PlayerData(id = {id}, name = "{name}", score = {score}, pos = {pos}, dir = {dir})'
    ).format(**self.__dict__)


class BoardData:
  def __init__(
    self,
    boardWidth = None,
    boardHeight = None,
    viewOrigin = None,
    board = [[]],
    players = [],
    timeLeft = None,
    over = None,
  ):
    self.board_width = boardWidth
    self.board_height = boardHeight
    self.view_origin = Pos(**viewOrigin) if viewOrigin else None
    self.board = [[LocationData.from_string(s) for s in row] for row in board]
    self.players = [PlayerData(**player) for player in players]
    self.time_left = timeLeft
    self.over = over

  def __repr__(self):
    players_lines = ['[']
    for p in self.players:
      players_lines.append('    {},'.format(p))
    players_lines.append('  ]')
    players_str = '\n'.join(players_lines)
    return '\n'.join([
      'BoardData(',
      '  boardWidth = {board_width},',
      '  boardHeight = {board_height},',
      '  viewOrigin = {view_origin},',
      '  board = [...],',
      '  players = {players_str},',
      '  time_left = {time_left},',
      '  over = {over},',
      ')',
    ]).format(players_str = players_str, **self.__dict__)


class GameServer:
  """
  Used to connect a bot to the games server.
  Create a GameServer with the host and port of the server, then call the play
  method with a bot class and bot name to connect to the server, join, and play
  games.

  Examples
  --------
  >>> from sdk import Bot, GameServer
  >>> game_server = GameServer('localhost', '8080')
  >>> game_server.play(Bot, 'bot_name')
  """
  def __init__(self, host, port, persistent):
    """
    Parameters
    ----------
    host : str
    port : str
    persistent : boolean
    """
    self.host = host
    self.port = port
    self.persistent = persistent
    self.netloc = '{}:{}'.format(self.host, self.port)

  def _make_request(self, path, token = None, data = None):
    url_parts = ('http', self.netloc, path, '', '', '')
    url = parse.urlunparse(url_parts)
    req = request.Request(url)
    if token:
      req.add_header('Authorization', 'Bearer {}'.format(token))
    if data is not None:
      req.add_header('Content-Type', 'application/json')
      data_bytes = json.dumps(data, cls=DictEncoder).encode('utf-8')
      req.data = data_bytes
    res = request.urlopen(req)
    res_bytes = res.read()
    if res_bytes:
      res_dict = json.loads(res_bytes.decode('utf-8'))
    else:
      res_dict = {}
    return res.getcode(), res_dict

  def _join_lobby(self, desired_name):
    tries = 50
    while tries:
      if tries < 50:
        print('Failed to connect. Retrying...')
      tries -= 1
      try:
        code, res = self._make_request(
          '/players',
          data = {'name': desired_name, 'persistent': self.persistent}
        )
        if code == 201:
          player = Player(res['name'], res['token'])
          print('Player name assigned: {}'.format(player.name))
          return player
        else:
          continue
      except:
        sleep(1)
        continue
    raise HTTPException("Failed to connect")

  def _list_games(self, token):
    code, res = self._make_request('/games', token)
    if code == 200:
      return [game['name'] for game in res]
    elif code == 403:
      raise AuthException()
    else:
      raise Exception('Failed to list games')

  def _join_first_available_game(self, token):
    print('Checking for available games...')
    while True:
      games = self._list_games(token)
      if games:
        print('Auto-joining game {}'.format(games[0]))
        return games[0]
      else:
        sleep(1)
    pass

  def _send_move(self, token, game_name, move_directions):
    path = '/games/{}'.format(parse.quote(game_name))
    code, res = self._make_request(path, token, move_directions)
    if code == 200:
      if res.get('over', False):
        return BoardData(over=True)
      else:
        return BoardData(**res)
    else:
      raise Exception('Failed to send move')

  def play(self, bot_factory, desired_name):
    """
    Parameters
    ----------
    bot_factory : callable(state : BoardData, assigned_name : string) -> Bot
        A class constructor or factory that returns an instance of Bot
    desired_name : string
        The prefered name of the bot. Will be used unless taken by another bot.
    """
    player = self._join_lobby(desired_name)
    while True:
      try:
        game_name = self._join_first_available_game(player.token)
        state = self._send_move(player.token, game_name, [])
        for p in state.players:
          if p.name == player.name:
            player_id = p.id
        bot = bot_factory(state, player.name, player_id)
        while True:
          moves = bot.get_moves(state)
          state = self._send_move(player.token, game_name, moves)
          if state.over:
            print('Game over')
            break
      except (HTTPException, AuthException, error.URLError, ConnectionRefusedError):
        print('Server connection lost. Reconnecting...')
        player = self._join_lobby(desired_name)
      except Exception:
        traceback.print_exc()
        print('Error playing game. Back to lobby.')


class AuthException(Exception):
  pass


class DictEncoder(json.JSONEncoder):
  def default(self, o):
    return o.__dict__
