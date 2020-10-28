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
    fontFamily: "",
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
    getNewProblem: function() {
      if (this.answer_state === 1) {
        this.insertCorrectAnswer();
        this.numA = getRandom(this.numAmin, this.numAmax);
        this.numB = getRandom(this.numBmin, this.numBmax);
      } else {
        this.insertIncorrectAnswer();
        let temp = this.numA;
        this.numA = this.numB;
        this.numB = temp;
      }

      this.answer_input = undefined;
      this.answer_state = 2;
      this.updateAnswerButtonText();
    },
    setProblem(obj) {
      this.numA = obj.numA;
      this.numB = obj.numB;
      this.answer_input = undefined;
      this.answer_state = 2;
      document.getElementById("answer_input_box").focus();
    },
    onAnswerSubmit: function() {
      if (this.answer_input === undefined) {
        return;
      }

      if (this.answer_state === 2) {
        this.checkAnswer();
      } else {
        this.getNewProblem();
      }
    },
    checkAnswer: function() {
      if (this.answer_input === this.product) {
        this.answer_state = 1;
      } else {
        this.answer_state = 0;
      }

      this.updateAnswerButtonText();
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
    }
  },

});
