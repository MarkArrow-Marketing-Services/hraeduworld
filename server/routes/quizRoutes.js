const express = require("express");
const router = express.Router();
const {
  createQuiz,
  getQuizByUnit,
  updateQuiz,
  toggleQuiz,
  deleteQuiz,
} = require("../controllers/quizController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/", protect(["admin"]), createQuiz);
router.get("/:unitId", protect(["admin", "student"]), getQuizByUnit);
router.put("/:id", protect(["admin"]), updateQuiz);
router.put("/:id/toggle", protect(["admin"]), toggleQuiz);
router.delete("/:id", protect(["admin"]), deleteQuiz);

module.exports = router;
