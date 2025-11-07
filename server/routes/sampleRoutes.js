const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");

// Route accessible only to Admins
router.get("/admin-data", protect(["admin"]), (req, res) => {
  res.json({ message: "This data is only for admins" });
});

// Route accessible to both Admins and Students
router.get("/common-data", protect(["admin", "student"]), (req, res) => {
  res.json({ message: `Hello ${req.user.role}, you can see this data.` });
});

module.exports = router;
