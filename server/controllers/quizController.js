const Quiz = require("../models/Quiz");

// Create Quiz for a Unit
exports.createQuiz = async (req, res) => {
  try {
    const { unitId, questions, name } = req.body;
    // New quizzes are created disabled by default. Admin can enable later.
    const newQuiz = new Quiz({ unitId, questions, name, enabled: false });
    await newQuiz.save();
    res.status(201).json(newQuiz);
  } catch (error) {
    console.error("createQuiz error", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Quiz by Unit
exports.getQuizByUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    const quizzes = await Quiz.find({ unitId }).sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (error) {
    console.error("getQuizByUnit error", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update quiz
exports.updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, questions } = req.body;
    const quiz = await Quiz.findById(id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    if (name !== undefined) quiz.name = name;
    if (questions !== undefined) quiz.questions = questions;
    await quiz.save();
    res.json(quiz);
  } catch (error) {
    console.error("updateQuiz error", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete quiz
exports.deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findByIdAndDelete(id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json({ message: "Quiz deleted" });
  } catch (error) {
    console.error("deleteQuiz error", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Toggle enabled state for a quiz (admin only)
exports.toggleQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    quiz.enabled = !quiz.enabled;
    await quiz.save();
    res.json(quiz);
  } catch (error) {
    console.error("toggleQuiz error", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
