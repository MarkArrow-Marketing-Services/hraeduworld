const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
  {
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    // Whether the quiz is enabled for students to take
    enabled: {
      type: Boolean,
      default: false,
    },
    questions: [
      {
        questionText: String,
        options: [String],
        correctAnswer: String,
      },
    ],
  },
  { timestamps: true }
);

const Quiz = mongoose.model("Quiz", quizSchema);
module.exports = Quiz;
