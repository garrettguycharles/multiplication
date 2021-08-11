const express = require('express');
/*
const io = require('socket.io')(3001, {
  cors: {
      origin: 'http://localhost:8000',
      optionsSuccessStatus: 200 // For legacy browser support
  }
});
*/

const cors = require('cors');
const http = require('http');

let app = express();
app.use(cors({
  origin: 'http://localhost:8000',
}));

let server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "http://localhost:8000",
    methods: ["GET", "POST"]
  }
});

function random_range(a, b) {
  let diff = b - a;
  diff += 1
  return Math.floor(Math.random() * diff) + a;
}

function generate_random_string(length) {
  let possible_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let to_return = "";
  for (let i = 0; i < length; i++) {
    to_return += possible_chars.charAt(random_range(0, possible_chars.length));
  }

  return to_return;
}

let games = {};

class Player {
  constructor(playerName, socket, room_owner = false) {
    this.name = playerName;
    this.socket = socket;
    this.room_owner = room_owner;
    this.game_finished = false;
    this.numCorrect = 0;
    this.numIncorrect = 0;
    this.correctAnswers = [];
    this.incorrectAnswers = [];
  }

  toObject() {
    return {
      name: this.name,
      room_owner: this.room_owner,
      game_finished: this.game_finished,
      numCorrect: this.numCorrect,
      numIncorrect: this.numIncorrect,
      correctAnswers: this.correctAnswers,
      incorrectAnswers: this.incorrectAnswers,
    }
  }
}

class Game {
  constructor(gameCode, ownerPlayer) {
    this.room_code = gameCode;
    this.players = [ownerPlayer];
    games[this.room_code] = this;
    this.state = "awaiting_players";
  }

  add_player(p) {
    this.players.push(p);
  }

  get["needs_more_players"]() {
    return (this.sockets[1] === null);
  }

  generate_id() {
    do {
      this.id = generate_random_string(10);
    } while (Object.keys(games).includes(this.id));
  }

  toObject() {
    let to_return = {
      room_code: this.room_code,
      players: [],
      state: this.state,
    }

    for (let p of this.players) {
      to_return.players.push(p.toObject());
    }

    console.log(to_return);

    return to_return;
  }
}


io.on("connection", socket => {
  console.log("a client connected.  Sending welcome message.");
  let player, game;

  setTimeout(() => {
    socket.emit("welcome");
  },250);

  socket.on("create_room", (data) => {
    console.log(`${data["player_name"]} attempted to create room ${data["room_code"]}`);
    if (Object.keys(games).includes(data['room_code'])) {
      socket.emit("room_code_unavailable");
    } else {
      player = new Player(data['player_name'], socket, true);
      game = new Game(data['room_code'], player);
      socket.join(game.room_code);
      socket.emit("new_room_created", game.toObject());

    }
  });

  socket.on("join_room", (data) => {
    console.log(`${data["player_name"]} attempted to join room ${data["room_code"]}`);
    if (Object.keys(games).includes(data['room_code'])) {
      if (games[data['room_code']].state === 'awaiting_players') {

        if (games[data['room_code']].players.find(p => p.name === data['player_name'])) {
          socket.emit("player_name_unavailable");
          return;
        }

        player = new Player(data['player_name'], socket);
        game = games[data["room_code"]];
        game.add_player(player);
        socket.join(game.room_code);
        socket.emit("joined_room", game.toObject());
        socket.broadcast.to(game.room_code).emit("player_joined", player.toObject());
      } else {
        // the player can't join because the game already started.
        socket.emit("game_already_started");
      }
    } else {
      socket.emit("room_code_not_found");
    }
  });

  socket.on("start_game", (data) => {
    if (player && player.room_owner) {
      let start_time = Date.now() + 5000;
      io.in(game.room_code).emit("begin_game", start_time);
    }
  });

  socket.on("upload_player_data", (data) => {
    player.correctAnswers = data.correctAnswers;
    player.incorrectAnswers = data.incorrectAnswers;
    player.numCorrect = data.numCorrect;
    player.numIncorrect = data.numIncorrect;

    io.in(game.room_code).emit("download_player_data", game.toObject());
  });

  socket.on("game_finished", () => {
    player.game_finished = true;

    if (player.room_owner) {
      let game_finish_interval = setInterval(() => {
        let finished = true;

        for (let p of game.players) {
          if (!(p.game_finished)) {
            finished = false;
            break
          }
        }

        if (finished) {
          clearInterval(game_finish_interval);
          io.in(game.room_code).emit("show-scores", game.toObject());
        }
      }, 200);
    }
  });

  socket.on('disconnect', function() {
    console.log("Lost connection, retrying...");
    setTimeout(() => {
      if (player && socket.disconnected) {
        if (player.room_owner) {
          console.log("Ending game.");
          io.in(game.room_code).emit("room_destroy");

          delete games[game.room_code];
        } else {
          console.log("Non-owner leaving game");
          game.players.splice(game.players.indexOf(player), 1);
          io.in(game.room_code).emit("player_disconnected", player.toObject());
        }

      } else {
        console.log("Successfully reconnected!")
      }
    },5000);
  });
});

server.listen(3005);
console.log("Socket server listening on port 3005.")
