const express = require("express");
const router = express.Router();
const {
  createClass,
  getAllClasses,
  updateClass,
  deleteClass,
} = require("../controllers/classController");
const { protect } = require("../middlewares/authMiddleware");

// Admin-only access
router.post("/", protect(["admin"]), createClass);
router.get("/", protect(["admin", "student"]), getAllClasses);
router.put("/:id", protect(["admin"]), updateClass);
router.delete("/:id", protect(["admin"]), deleteClass);

module.exports = router;
