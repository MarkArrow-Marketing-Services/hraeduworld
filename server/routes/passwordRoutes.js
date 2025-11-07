const express = require("express");
const router = express.Router();
const {
  sendResetCode,
  verifyCode,
  resetPassword,
} = require("../controllers/passwordController");

router.post("/send-code", sendResetCode);
router.post("/verify-code", verifyCode);
router.post("/reset", resetPassword);

module.exports = router;
