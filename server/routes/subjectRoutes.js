const express = require("express");
const router = express.Router();
const {
  addSubjectToClass,
  getSubjectsByClass,
  updateSubject,
  deleteSubject,
} = require("../controllers/subjectController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/", protect(["admin"]), addSubjectToClass);
router.get("/:classId", protect(["admin", "student"]), getSubjectsByClass);
router.put("/:id", protect(["admin"]), updateSubject);
router.delete("/:id", protect(["admin"]), deleteSubject);

module.exports = router;
