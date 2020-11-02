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
    game: {
      running: false,
      timer_main: 0,
      timer_problem: 0,
      main_length: 60,
      problem_length: 2,
    },
    stopwatch: {
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
      this.numCorrect = 0;
      this.numIncorrect =  0;
      this.correctAnswers = [],
      this.incorrectAnswers = [],
      this.stopwatch.game.seconds = this.game.main_length;
      this.game.timer_main = setInterval(this.incStopwatchGame,1000);
      clearInterval(this.game.timer_problem);
      this.stopwatch.problem.seconds = this.game.problem_length;

      this.answer_input = undefined;

      this.game.timer_problem = setInterval(this.incStopwatchProblem, 1000);
      this.game.running = true;
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
      alert("Time\'s Up!\nCorrect: " + this.numCorrect.toString() + "\nIncorrect: " + this.numIncorrect.toString());
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
    },
  },

  computed: {
    product: function() {
      return this.numA * this.numB;
    },
    buttonClass: function() {
      let states = ["ans_btn_incorrect", "ans_btn_correct", "ans_btn_default"];
      return states[this.answer_state];
    },
  },
  watch: {
    fontFamily: function() {
      document.querySelector("html").style.fontFamily = this.fontFamily;
    },
    gamemode: function() {
      if (gamemode == "GMODE_PRACTICE") {
        game.running = false;
        this.showScores();
      }
    },
  },

});
