//const this.socket = io();

let getRandom = function(min, max) {
  let diff = max - min;

  let randnum = (Math.ceil(Math.random() * diff)) + min;

  return randnum;
}

let isEqual = function(obj, other) {
  return ((obj.numA === other.numA) && (obj.numB === other.numB));
}

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
    error: "this is a test error",
    countdown_interval: null,
    online_game: {
      room_code: "",
      players: [],
      state: "",
    },
    game: {
      is_online: false,
      running: false,
      timer_main: 0,
      timer_problem: 0,
      main_length: 15,
      problem_length: 2,
    },
    stopwatch: {
      countdown: 0,
      game: {
        seconds: 60,
      },
      problem: {
        seconds: 2,
      },
    },
    fontFamily: "",
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
      this.socket = io('http://localhost:3005');
      //this.socket.connect('http://localhost:3005');

      this.socket.on("welcome", () => {
        this.socket.emit("join_room", {
          'player_name': this.online_play_name,
          'room_code': this.join_room_code,
        });
      });

      this.socket.on("joined_room", (data) => {
        // change this later
        this.error = "successfully joined room!"
        this.online_game = data;
        this.STATE = "ONLINE_GAME";
        this.ONLINE_GAME_STATE = "LOBBY";
      });

      this.socket.on("game_already_started", () => {
        this.error = "That game already started.";
        this.socket.disconnect();
        this.socket = null;
      });

      this.socket.on("room_code_not_found", () => {
        this.error = "We couldn't find that room.  Please try again!";
        this.socket.disconnect();
        this.socket = null;
      });

      this.socket.on("player_name_unavailable", () => {
        this.error = "That name is already taken.  Please choose a different name.";
        this.socket.disconnect();
        this.socket = null;
      });


      this.initSocket(this.socket);
    },
    createRoomByCode: async function() {
      console.log("Attempting to create room by code.");
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
        this.error = "That room code is already taken.  Try another one!";
      });

      this.socket.on("new_room_created", (data) => {
        // change later
        this.error = "Room successfully created!";
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

      socket.on("room_destroy", () => {
        this.STATE = "ONLINE_MENU";
        this.ONLINE_GAME_STATE = "LOBBY";
        this.ONLINE_MENU_STATE = "TOP_MENU";
      });

      socket.on("begin_game", (start_time) => {
        this.ONLINE_GAME_STATE = 'PLAYING_GAME';
        this.game.is_online = true;
        if (this.countdown_interval === null) {
          this.countdown_interval = setInterval(() => {
            if (Date.now() > start_time) {
              clearInterval(this.countdown_interval);
              this.countdown_interval = null;
              this.stopwatch.countdown = -1;
              this.beginGame();
            } else {
              this.stopwatch.countdown = Math.floor((start_time - Date.now()) / 1000);
              if (this.stopwatch.countdown === 0) {
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
      });
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

      clearInterval(this.game.timer_main);
      this.game.timer_main = setInterval(this.incStopwatchGame,1000);

      this.stopwatch.problem.seconds = this.game.problem_length;

      this.answer_input = undefined;

      clearInterval(this.game.timer_problem);
      this.game.timer_problem = setInterval(this.incStopwatchProblem, 1000);

      this.game.running = true;
      document.getElementById("answer_input_box").focus();
    },
    incStopwatchGame: function() {
      if (this.stopwatch.game.seconds > 0) {
        this.stopwatch.game.seconds--;
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
        this.onAnswerSubmit();
      }
    },
    showScores: function() {
      if (!(this.game.is_online)) {
        alert("Time\'s Up!\nCorrect: " + this.numCorrect.toString() + "\nIncorrect: " + this.numIncorrect.toString());
      } else {
        this.socket.emit("game_finished");
      }

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

      if (this.game.is_online) {
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

      if (this.game.is_online) {
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
        default:

      }
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
    }
  },
  watch: {
    fontFamily: function() {
      document.querySelector("html").style.fontFamily = this.fontFamily;
    },
  },

});
