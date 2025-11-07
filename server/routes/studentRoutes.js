const express = require("express");
const router = express.Router();
const {
  getStudentProfile,
  updateStudentProfile,
  getEnrolledClasses,
  updateQuizProgress,
  logResourceProgress,
  getAggregatedProgress,
  getStudentQuizHistory,
  getDetailedProgress,
} = require("../controllers/studentController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/profile", protect(["student"]), getStudentProfile);
router.put("/profile", protect(["student"]), updateStudentProfile);
router.get("/classes", protect(["student"]), getEnrolledClasses);
router.post("/quiz-progress", protect(["student"]), updateQuizProgress);
router.post("/resource-progress", protect(["student"]), logResourceProgress);
router.get("/progress", protect(["student"]), getAggregatedProgress);
router.get("/progress-detailed", protect(["student"]), getDetailedProgress);
router.get("/quiz-history", protect(["student"]), getStudentQuizHistory);

module.exports = router;
