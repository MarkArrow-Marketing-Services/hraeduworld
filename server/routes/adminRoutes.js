const express = require("express");
const router = express.Router();
const {
  getAdminProfile,
  updateAdminProfile,
  createUser,
} = require("../controllers/adminController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/profile", protect(["admin"]), getAdminProfile);
router.put("/profile", protect(["admin"]), updateAdminProfile);
router.post("/create-user", protect(["admin"]), createUser);
router.get(
  "/stats",
  protect(["admin"]),
  require("../controllers/adminController").getStats
);
router.get(
  "/students",
  protect(["admin"]),
  require("../controllers/adminController").listStudents
);

// Combined users endpoint (students + admins). listStudents now returns both types.
router.get(
  "/users",
  protect(["admin"]),
  require("../controllers/adminController").listStudents
);

router.get(
  "/quizzes",
  protect(["admin"]),
  require("../controllers/adminController").listAllQuizzes
);

// Temporary unauthenticated debug endpoint to list quizzes (remove after debugging)
router.get(
  "/debug/quizzes",
  require("../controllers/adminController").listAllQuizzes
);
router.get(
  "/debug/admins",
  require("../controllers/adminController").listAllAdmins
);
// temporary set-email route removed

// Update and delete student by id
router.put(
  "/students/:id",
  protect(["admin"]),
  require("../controllers/adminController").updateStudent
);
router.delete(
  "/students/:id",
  protect(["admin"]),
  require("../controllers/adminController").deleteStudent
);

// Admin management routes (update/delete other admins)
router.put(
  "/admins/:id",
  protect(["admin"]),
  require("../controllers/adminController").updateAdmin
);
router.delete(
  "/admins/:id",
  protect(["admin"]),
  require("../controllers/adminController").deleteAdmin
);

// Admin: aggregated progress and quiz history for a student
router.get(
  "/students/:id/progress",
  protect(["admin"]),
  require("../controllers/adminController").getStudentAggregatedProgressById
);

router.get(
  "/students/:id/quiz-history",
  protect(["admin"]),
  require("../controllers/adminController").getStudentQuizHistoryById
);

// Export user credentials for Excel
router.get(
  "/export/credentials",
  protect(["admin"]),
  require("../controllers/adminController").exportUserCredentials
);

module.exports = router;
