//const this.socket = io();

let getRandom = function(min, max) {
  let diff = max - min;

  let randnum = (Math.ceil(Math.random() * diff)) + min;

  return randnum;
}

let isEqual = function(obj, other) {
  return ((obj.numA === other.numA) && (obj.numB === other.numB));
}

function lerp(a, b, amount) {
  if (amount >= 1) {
    return b;
  }

  if (amount <= 0) {
    return a;
  }

  let d = b - a;
  d *= amount;
  return a + d;
}

let padding = 10;

let stopwatch_canvas = document.createElement("canvas");
stopwatch_canvas.width = 150;
stopwatch_canvas.height = 150;

let master_ctx = stopwatch_canvas.getContext("2d");

let FPS = 45;

let milli = 15;
let seconds = 0;

let r = 0x32;
let g = 0xa6;
let b = 0xff;

let stopwatch_canvas_interval;

let app = new Vue({
  el: "#v-app",
  data: {
    STATE: 'WELCOME_SCREEN',
    ONLINE_MENU_STATE: 'TOP_MENU',
    ONLINE_GAME_STATE: 'LOBBY',
    join_room_code: "",
    create_room_code: "",
    online_play_name: "",
    socket: null,
    error: "",
    toast: "",
    show_toast: false,
    show_error: false,
    toast_timeout: null,
    error_timeout: null,
    countdown_interval: null,
    online_game: {
      room_code: "",
      players: [],
      state: "",
      leaders: {
        first: [],
        second: [],
        third: [],
      },
    },
    game: {
      is_online: false,
      running: false,
      timer_main: 0,
      timer_problem: 0,
      main_length: 60,
      problem_length: 5,
    },
    stopwatch: {
      countdown: "0",
      game: {
        seconds: 60,
      },
      problem: {
        seconds: 2,
      },
    },
    local_stopwatch_ctx: null,
    online_stopwatch_ctx: null,
    fontFamily: "'Montserrat'",
    ctrlmode: "CTRLMODE_SETSELECT",
    gamemode: "GMODE_PRACTICE",
    ctrlpanel: {
      setselect: {
        possible_values: [1,2,3,4,5,6,7,8,9,10,11,12],
        active_values: [1,2,3,4,5],
      },
    },
    settings_visible: false,
    numAmin: 1,
    numAmax: 4,
    numBmin: 1,
    numBmax: 4,
    numA: 1,
    numB: 1,
    answer_input: undefined,
    answer_state: 2,
    answerbuttontext: "Check Answer",
    correctAnswers: [],
    incorrectAnswers: [],
    numCorrect: 0,
    numIncorrect: 0,
  },

  methods: {
    joinRoomByCode: async function() {
      console.log("Attempted to join room by code.");

      if (!(this.online_play_name && this.join_room_code)) {
        this.setError("Make sure you put in your name and the room code! :)");
        return;
      }

      this.socket = io(); // server side

      //this.socket = io('http://localhost:3005'); // development side
      //this.socket.connect('http://localhost:3005');

      this.socket.on("welcome", () => {
        this.socket.emit("join_room", {
          'player_name': this.online_play_name,
          'room_code': this.join_room_code,
        });
      });

      this.socket.on("joined_room", (data) => {
        // change this later
        this.setToast("successfully joined room!");
        this.online_game = data;
        this.STATE = "ONLINE_GAME";
        this.ONLINE_GAME_STATE = "LOBBY";
      });

      this.socket.on("game_already_started", () => {
        this.setError("That game already started.");
        this.disconnectSocket();
      });

      this.socket.on("room_code_not_found", () => {
        this.setError("We couldn't find that room.  Please try again!");
        this.disconnectSocket();
      });

      this.socket.on("player_name_unavailable", () => {
        this.setError("That name is already taken.  Please choose a different name.");
        this.disconnectSocket();
      });


      this.initSocket(this.socket);
    },
    createRoomByCode: async function() {
      console.log("Attempting to create room by code.");

      if (!(this.online_play_name && this.create_room_code)) {
        this.setError("Make sure you put in your name and the room code! :)");
        return;
      }

      this.socket = io('http://localhost:3005');
      console.log("Attempted to create room by code.");

      //this.socket.connect('http://localhost:3005');

      this.socket.on("welcome", () => {
        this.socket.emit("create_room", {
          'player_name': this.online_play_name,
          'room_code': this.create_room_code,
        });
      });

      this.socket.on("room_code_unavailable", () => {
        this.setError("That room code is already taken.  Try another one!");
      });

      this.socket.on("new_room_created", (data) => {
        // change later
        this.setToast("Room successfully created!");
        this.online_game = data;
        this.STATE = "ONLINE_GAME";
        this.ONLINE_GAME_STATE = "LOBBY";
      });

      this.initSocket(this.socket);
    },
    initSocket: async function (socket) {
      socket.on("player_joined", (player) => {
        if (!(this.online_game.players.find(el => el.name === player.name))) {
          this.online_game.players.push(player);
        }
      });

      socket.on("player_disconnected", (player) => {
        let i = this.online_game.players.findIndex(el => el.name === player.name);
        if (i > -1) {
          this.online_game.players.splice(i, 1);
        }
      });

      socket.on("toast", (data) => {
        this.setToast(data.text, data.duration);
      });

      socket.on("room_destroy", () => {
        this.STATE = "ONLINE_MENU";
        this.ONLINE_GAME_STATE = "LOBBY";
        this.ONLINE_MENU_STATE = "TOP_MENU";
      });

      socket.on("begin_game", (data) => {
        this.online_game.players = data.players;
        let start_time = Date.now() + 4000;
        this.ONLINE_GAME_STATE = 'PLAYING_GAME';
        if (this.countdown_interval === null) {
          this.countdown_interval = setInterval(() => {
            if (Date.now() > start_time) {
              clearInterval(this.countdown_interval);
              this.countdown_interval = null;
              this.stopwatch.countdown = -1;
              this.beginGame();
            } else {
              this.stopwatch.countdown = Math.floor((start_time - Date.now()) / 1000).toString();
              if (this.stopwatch.countdown === "0") {
                this.stopwatch.countdown = "GO!";
              }
            }

          }, 1000 / 30);
        }

      });

      socket.on("download_player_data", (data) => {
        this.online_game.players = data.players;
      });

      socket.on("show-scores", (data) => {
        this.online_game = data;
        this.ONLINE_GAME_STATE = 'SHOW_SCORES';
        this.online_game.leaders = this.populateLeaderboard();
      });
    },
    disconnectSocket: function() {
      if (this.socket) {
        this.socket.emit("force_disconnect");
        this.socket = null;
      }

      clearInterval(this.game.timer_main);
      clearInterval(this.game.timer_problem);
      clearInterval(stopwatch_canvas_interval);
      this.game.running = false;
    },
    setToast: function(text, duration=5000) {
      clearTimeout(this.toast_timeout);

      this.toast = text;
      this.show_toast = true;

      this.toast_timeout = setTimeout(() => {
        this.show_toast = false;
      }, duration);
    },
    setError: function(text, duration=5000) {
      clearTimeout(this.error_timeout);

      this.error = text;
      this.show_error = true;

      this.error_timeout = setTimeout(() => {
        this.show_error = false;
      }, duration);
    },
    startOnlineGame: function() {
      if (!(this.is_room_owner)) {
        return;
      }

      this.ONLINE_GAME_STATE = "PLAYING_GAME";

      this.socket.emit("start_game");
    },
    setselect_toggleActive: function(number) {
      if (this.ctrlpanel.setselect.active_values.includes(number)) {
        if (this.ctrlpanel.setselect.active_values.length > 1) {
          this.ctrlpanel.setselect.active_values = this.ctrlpanel.setselect.active_values.filter(a => a !== number);
        }
      } else {
        this.ctrlpanel.setselect.active_values.push(number);
      }
    },
    getNewProblem: function() {
      if (this.gamemode === "GMODE_PRACTICE") {
        if (this.answer_state === 1) {
          this.insertCorrectAnswer();
          this.populateNewProblem();
        } else {
          this.insertIncorrectAnswer();
          let temp = this.numA;
          this.numA = this.numB;
          this.numB = temp;
        }

        this.answer_input = undefined;
        this.answer_state = 2;
        this.updateAnswerButtonText();
      }

      if (this.gamemode === "GMODE_CLOCKRACE" && this.game.running) {
        if (this.answer_state === 0) {
          this.insertIncorrectAnswer();
        } else if (this.answer_state === 1) {
          this.insertCorrectAnswer();
        }

        this.populateNewProblem();

        clearInterval(this.game.timer_problem);
        this.stopwatch.problem.seconds = this.game.problem_length;

        this.answer_input = undefined;

        this.game.timer_problem = setInterval(this.incStopwatchProblem, 1000);
      }
    },
    setProblem(obj) {
      this.numA = obj.numA;
      this.numB = obj.numB;
      this.answer_input = undefined;
      this.answer_state = 2;
      document.getElementById("answer_input_box").focus();
    },
    populateNewProblem: function() {
      if (this.ctrlmode == "CTRLMODE_EXACT") {
        this.numA = getRandom(this.numAmin, this.numAmax);
        this.numB = getRandom(this.numBmin, this.numBmax);
      }

      if (this.ctrlmode == "CTRLMODE_SETSELECT") {
        this.numA = this.ctrlpanel.setselect.active_values[
          Math.floor(Math.random() * this.ctrlpanel.setselect.active_values.length)
        ];
        this.numB = getRandom(0, 12);
      }
    },
    beginGame: function() {
      this.gamemode = 'GMODE_CLOCKRACE';
      this.numCorrect = 0;
      this.numIncorrect =  0;
      this.correctAnswers = [],
      this.incorrectAnswers = [],
      this.stopwatch.game.seconds = this.game.main_length;

      if (this.STATE === 'LOCAL_PLAY') {
        this.local_stopwatch_ctx = document.getElementById("local_stopwatch_canvas").getContext("2d");
        this.local_stopwatch_ctx.canvas.width = 150;
        this.local_stopwatch_ctx.canvas.height = 150;
      } else {
        this.online_stopwatch_ctx = document.getElementById("online_stopwatch_canvas").getContext("2d");
        this.online_stopwatch_ctx.canvas.width = 150;
        this.online_stopwatch_ctx.canvas.height = 150;
      }

      clearInterval(this.game.timer_main);
      this.game.timer_main = setInterval(this.incStopwatchGame,1000);

      this.stopwatch.problem.seconds = this.game.problem_length;

      this.answer_input = undefined;

      clearInterval(this.game.timer_problem);
      this.game.timer_problem = setInterval(this.incStopwatchProblem, 1000);

      seconds = 0;
      milli = 0;

      clearInterval(stopwatch_canvas_interval);

      stopwatch_canvas_interval = setInterval(() => {
        this.update();
        this.draw();
      }, 1000 / FPS);

      this.game.running = true;
      document.getElementById("answer_input_box").focus();
    },
    incStopwatchGame: function() {
      if (this.stopwatch.game.seconds > 0) {
        this.stopwatch.game.seconds--;
        milli = 0;
        seconds = this.game.main_length - this.stopwatch.game.seconds;
      } else {
        this.game.running = false;
        clearInterval(this.game.timer_main);
        clearInterval(this.game.timer_problem);
        this.showScores();
      }
    },
    incStopwatchProblem: function() {
      if (this.stopwatch.problem.seconds > 0) {
        this.stopwatch.problem.seconds--;
      } else {
        clearInterval(this.game.timer_problem);
        if (this.STATE === "LOCAL_PLAY") {
          this.onAnswerSubmit();
        }

      }
    },
    showScores: function() {
      if (this.STATE === 'LOCAL_PLAY') {
        alert("Time\'s Up!\nCorrect: " + this.numCorrect.toString() + "\nIncorrect: " + this.numIncorrect.toString());
      } else {
        this.socket.emit("game_finished");
      }

      clearInterval(stopwatch_canvas_interval);

    },
    onAnswerSubmit: function() {

      if (this.gamemode === "GMODE_CLOCKRACE" && this.game.running) {
        this.checkAnswer();
        this.getNewProblem();
      }

      if (this.gamemode === "GMODE_PRACTICE") {
        if (this.answer_input === undefined) {
          return;
        }

        if (this.answer_state === 2) {
          this.checkAnswer();
          this.updateAnswerButtonText();
        } else {
          this.getNewProblem();
        }
      }
    },
    checkAnswer: function() {
      if (this.answer_input === this.product) {
        this.answer_state = 1;
      } else {
        this.answer_state = 0;
      }
    },
    updateAnswerButtonText: function() {
      let states = ["Oops!  The correct answer was " + this.product + ".  Lets try again :)", "Correct! :) Next Problem...", "Check Answer"];
      this.answerbuttontext = states[this.answer_state];
      this.updateAnswerButtonClass
    },
    insertCorrectAnswer: function() {
      let newObj = {numA: this.numA, numB: this.numB};

      var shouldInsert = true;

      for (let i = 0; i < this.correctAnswers.length; i++) {
        if (isEqual(this.correctAnswers[i], newObj)) {
          shouldInsert = false;
          break;
        }
      }

      if (shouldInsert) {
        this.correctAnswers.push(newObj);
      }

      this.numCorrect++;

      for (let i = 0; i < this.incorrectAnswers.length; i++) {
        if (isEqual(this.incorrectAnswers[i], newObj)) {
          this.incorrectAnswers.splice(i, 1);
          break;
        }
      }

      if (this.STATE === 'ONLINE_GAME') {
        this.uploadData();
      }
    },
    insertIncorrectAnswer: function() {
      let newObj = {numA: this.numA, numB: this.numB};

      var shouldInsert = true;

      for (let i = 0; i < this.incorrectAnswers.length; i++) {
        if (isEqual(this.incorrectAnswers[i], newObj)) {
          shouldInsert = false;
          break;
        }
      }

      if (shouldInsert) {
        this.incorrectAnswers.push(newObj);
      }

      this.numIncorrect++;

      for (let i = 0; i < this.correctAnswers.length; i++) {
        if (isEqual(this.correctAnswers[i], newObj)) {
          this.correctAnswers.splice(i, 1);
          break;
        }
      }

      if (this.STATE === 'ONLINE_GAME') {
        this.uploadData();
      }
    },
    uploadData: function() {
      let data = {
        numCorrect: this.numCorrect,
        numIncorrect: this.numIncorrect,
        correctAnswers: this.correctAnswers,
        incorrectAnswers: this.incorrectAnswers,
      };

      this.socket.emit("upload_player_data", data);
    },
    stopGame: function() {
      clearInterval(this.game.timer_main);
      clearInterval(this.game.timer_problem);
      this.answer_state = 2;
      this.game.running = false;
      this.showScores();
    },
    back_button_pressed: function () {
      switch (this.STATE) {
        case 'LOCAL_PLAY':
          this.STATE = 'WELCOME_SCREEN';
          break;
        case 'ONLINE_GAME':
          this.disconnectSocket();
          this.STATE = 'ONLINE_MENU';
          break;
        default:

      }
    },
    draw: function() {
      master_ctx.clearRect(0, 0, stopwatch_canvas.width, stopwatch_canvas.height);

      master_ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0x99 / 0xff})`;
      master_ctx.beginPath();
      master_ctx.moveTo(stopwatch_canvas.width / 2, stopwatch_canvas.height / 2);
      master_ctx.lineTo(stopwatch_canvas.width / 2, padding);
      master_ctx.ellipse(stopwatch_canvas.width / 2, stopwatch_canvas.height / 2, stopwatch_canvas.width / 2 - padding * 2, stopwatch_canvas.height / 2 - padding * 2, 0, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * seconds / this.game.main_length) * milli / 1000);
      master_ctx.closePath();
      master_ctx.fill();

      var gradient = master_ctx.createRadialGradient(stopwatch_canvas.width / 3, stopwatch_canvas.height / 3, 0, stopwatch_canvas.width / 2, stopwatch_canvas.height / 2, stopwatch_canvas.width / 2);

      let alph = lerp(0.5, 1, seconds / this.game.main_length);

      gradient.addColorStop(0, `rgba(${r + 0x70}, ${g + 0x70}, ${b + 0x70}, ${alph})`);
      gradient.addColorStop(0.3, `rgba(${r + 0x20}, ${g + 0x20}, ${b + 0x20}, ${alph})`);
      gradient.addColorStop(0.7, `rgba(${r - 0x20}, ${g - 0x20}, ${b - 0x20}, ${alph})`);
      gradient.addColorStop(1, `rgba(${r - 0x70}, ${g - 0x70}, ${b - 0x70}, ${alph})`);

      master_ctx.fillStyle =  gradient;
      master_ctx.beginPath();
      master_ctx.moveTo(stopwatch_canvas.width / 2, stopwatch_canvas.height / 2);
      master_ctx.lineTo(stopwatch_canvas.width / 2, padding);
      master_ctx.ellipse(stopwatch_canvas.width / 2, stopwatch_canvas.height / 2, stopwatch_canvas.width / 2 - padding, stopwatch_canvas.height / 2 - padding, 0, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * seconds / this.game.main_length), true);
      master_ctx.closePath();
      master_ctx.fill();


      master_ctx.strokeStyle = "red";
      master_ctx.beginPath();
      master_ctx.moveTo(stopwatch_canvas.width / 2, stopwatch_canvas.height / 2);
      let theta = (2 * Math.PI * seconds / this.game.main_length) * milli / 1000 - Math.PI / 2;
      master_ctx.lineTo(stopwatch_canvas.width / 2 + (stopwatch_canvas.width / 2 - padding) * Math.cos(theta), stopwatch_canvas.height / 2 + (stopwatch_canvas.height / 2 - padding) * Math.sin(theta));
      master_ctx.lineWidth = 1.5;
      master_ctx.stroke();

      master_ctx.fillStyle = "white";
      master_ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
      master_ctx.lineWidth = 1.5;
      master_ctx.font = `bold ${stopwatch_canvas.height / 2}px sans-serif`
      master_ctx.textBaseline = "middle";
      master_ctx.textAlign = "center";
      let text = `${Math.floor(this.game.main_length - seconds)}`;
      let metric = master_ctx.measureText(text);
      let offset = (metric.actualBoundingBoxAscent - metric.actualBoundingBoxDescent) / 2;
      master_ctx.fillText(text, stopwatch_canvas.width / 2, stopwatch_canvas.height / 2 + offset);
      master_ctx.strokeText(text, stopwatch_canvas.width / 2, stopwatch_canvas.height / 2 + offset);

      if (this.STATE === 'LOCAL_PLAY') {
        this.local_stopwatch_ctx.clearRect(0, 0, this.local_stopwatch_ctx.canvas.width, this.local_stopwatch_ctx.canvas.width);
        this.local_stopwatch_ctx.drawImage(master_ctx.canvas, 0, 0, master_ctx.canvas.width, master_ctx.canvas.height,
          0, 0, this.local_stopwatch_ctx.canvas.width, this.local_stopwatch_ctx.canvas.height);
      } else if (this.STATE === 'ONLINE_GAME') {
        this.online_stopwatch_ctx.clearRect(0, 0, this.online_stopwatch_ctx.canvas.width, this.online_stopwatch_ctx.canvas.width);
        this.online_stopwatch_ctx.drawImage(master_ctx.canvas, 0, 0, master_ctx.canvas.width, master_ctx.canvas.height,
          0, 0, this.online_stopwatch_ctx.canvas.width, this.online_stopwatch_ctx.canvas.height);
      }

    },
    update: function() {

      if (seconds < this.game.main_length / 2) {
        r = lerp(0x32, 0xeb, 2 * seconds / this.game.main_length);
        g = lerp(0xa6, 0xcd, 2 * seconds / this.game.main_length);
        b = lerp(0xff, 0x34, 2 * seconds / this.game.main_length);
      } else {
        r = lerp(0xeb, 0xeb, (seconds - this.game.main_length / 2) / (this.game.main_length / 2));
        g = lerp(0xcd, 0x34, (seconds - this.game.main_length / 2) / (this.game.main_length / 2));
        b = lerp(0x34, 0x34, (seconds - this.game.main_length / 2) / (this.game.main_length / 2));
      }

      milli += 1000 / FPS;
      seconds += 1 / FPS;

      if (seconds >= this.game.main_length) {
        seconds = this.game.main_length;
        milli = 0;
        clearInterval(stopwatch_canvas_interval);
        master_ctx.clearRect(0, 0, master_ctx.canvas.width, master_ctx.canvas.height);
      }

      while (milli > 1000) {
        milli -= 1000;
      }
    },
    populateLeaderboard: function() {
      let leaders = {
        first: [],
        second: [],
        third: [],
      };

      let sorted_players = this.online_game.players.sort((a, b) => {
        // sort highest to front of array
        if (a.numCorrect - a.numIncorrect <= b.numCorrect - b.numIncorrect) {
          return 1;
        }
        return -1;
      });

      let currScore = sorted_players[0].numCorrect - sorted_players[0].numIncorrect;
      let currPlace = 1;

      for (let p of sorted_players) {
        if (p.numCorrect - p.numIncorrect < currScore) {
          currScore = p.numCorrect - p.numIncorrect;

          switch (currPlace) {
            case 1:
              currPlace += leaders.first.length;
              break;
            case 2:
              currPlace += leaders.second.length;
              break;
            default:
              currPlace++
          }
        }

        let filled = false;
        switch (currPlace) {
          case 1:
            leaders.first.push(p);
            break;
          case 2:
            leaders.second.push(p);
            break;
          case 3:
            leaders.third.push(p);
            break;
          default:
            filled = true;
            break
        }

        if (filled) break;
      }

      return leaders;
    }
  },

  computed: {
    product: function() {
      return this.numA * this.numB;
    },
    buttonClass: function() {
      let states = ["ans_btn_incorrect", "ans_btn_correct", "ans_btn_default"];
      return states[this.answer_state];
    },
    is_room_owner: function() {
      let my_player = this.online_game.players.find(el => el.name === this.online_play_name);
      if (my_player && my_player.room_owner) {
        return true;
      }

      return false;
    },
    opponent_players: function() {
      return this.online_game.players.filter(p => p.name !== this.online_play_name);
    },
  },
  watch: {
    fontFamily: function() {
      document.querySelector("html").style.fontFamily = this.fontFamily;
    },
    online_play_name: function() {
      this.online_play_name = this.online_play_name.substring(0, 8).replace(/[^A-Za-z0-9\s]/g,'');
    },
    join_room_code: function() {
      this.join_room_code = this.join_room_code.substring(0, 16).replace(/[^A-Za-z0-9\s]/g,'');
    },
    create_room_code: function() {
      this.create_room_code = this.create_room_code.substring(0, 16).replace(/[^A-Za-z0-9\s]/g,'');
    }
  },

});
