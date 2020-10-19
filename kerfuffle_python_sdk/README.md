Basic Usage:

```
from sdk import Bot, GameServer
game_server = GameServer('localhost', '8080')
game_server.play(Bot, 'bot_name')
```

Be sure to update the host and port to point at the actual game server.

Create your own bot by extending the `Bot` class and overriding `__init__` and
`get_moves` methods, then passing that class to the `GameServer`'s `play` method.
