const crypto = require("crypto");
const nodemailer = require("nodemailer");
const Admin = require("../models/Admin");
const Student = require("../models/Student");

const createTransporter = (opts = {}) => {
  // Use SMTP settings from env, allow overrides via opts
  const host = opts.host || process.env.EMAIL_HOST;
  const port =
    opts.port ||
    (process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587);
  const secure =
    typeof opts.secure !== "undefined"
      ? opts.secure
      : process.env.EMAIL_SECURE === "true";
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.APP_PASSWORD,
    },
  });
};

// Send verification code to email if user exists (admin or student)
exports.sendResetCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const identifier = email.trim();
    const lc = identifier.toLowerCase();

    console.log("sendResetCode called with identifier:", identifier);

    // Find user by Student (match username or email), then Admin (match username or email)
    let user = await Student.findOne({
      $or: [
        { email: identifier },
        { email: lc },
        { username: identifier },
        { username: lc },
      ],
    });
    console.log("student lookup result:", !!user);
    let userType = "student";
    if (!user) {
      user = await Admin.findOne({
        $or: [
          { username: identifier },
          { username: lc },
          { email: identifier },
          { email: lc },
        ],
      });
      console.log("admin lookup result:", !!user);
      userType = "admin";
    }

    if (!user) {
      console.warn("No user found for identifier:", identifier);
      return res.status(404).json({ message: "You do not have access." });
    }

    // Create a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.passwordResetCode = code;
    user.passwordResetExpires = expires;
    console.log("Saving reset code for user id:", user._id);
    await user.save();

    // Determine destination email: prefer stored email on user document
    const toEmail = (user.email && user.email.trim()) || identifier;
    console.log("Will send code to:", toEmail, "userType:", userType);

    // Prepare mail options
    const mailOptions = {
      from:
        process.env.EMAIL_FROM ||
        process.env.EMAIL_USER ||
        "no-reply@example.com",
      to: toEmail,
      subject: "Password Reset Code",
      text: `Your password reset code is: ${code}. It expires in 15 minutes.`,
    };

    // Try real SMTP when credentials exist. If EMAIL_HOST is missing, infer common hosts (e.g., Gmail).
    const hasSmtpCredentials =
      process.env.EMAIL_USER && process.env.APP_PASSWORD;
    let smtpTried = false;
    if (hasSmtpCredentials) {
      // Infer host for common provider if not explicitly set
      let smtpHost = process.env.EMAIL_HOST || null;
      if (
        !smtpHost &&
        process.env.EMAIL_USER &&
        process.env.EMAIL_USER.endsWith("@gmail.com")
      ) {
        smtpHost = "smtp.gmail.com";
        console.warn(
          "EMAIL_HOST not set; inferring Gmail SMTP host smtp.gmail.com for user ending with @gmail.com"
        );
      }

      if (smtpHost) {
        smtpTried = true;
        const smtpPort = process.env.EMAIL_PORT
          ? parseInt(process.env.EMAIL_PORT)
          : 587;
        const smtpSecure =
          process.env.EMAIL_SECURE === "true" || smtpPort === 465;
        const transporter = createTransporter({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
        });
        try {
          const info = await transporter.sendMail(mailOptions);
          // Return messageId so devs/admins can confirm send in logs
          return res.json({
            message: "Code sent",
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
          });
        } catch (sendErr) {
          console.error(
            "Error sending reset email via SMTP:",
            sendErr && (sendErr.stack || sendErr)
          );
          // If production, fail. In dev fallback to Ethereal but include sendError.
          if (process.env.NODE_ENV === "production") {
            return res
              .status(500)
              .json({ message: "Failed to send reset code" });
          }
          console.warn(
            "SMTP send failed; falling back to Ethereal for dev testing"
          );
          // fall through to Ethereal fallback below and include send error
          var smtpSendError = sendErr && sendErr.message;
        }
      }
    }

    // Dev fallback: use Ethereal to create a test account and send a preview URL
    try {
      const testAccount = await nodemailer.createTestAccount();
      const ethTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const info = await ethTransporter.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info) || null;
      console.log("Ethereal preview URL:", previewUrl);
      const response = {
        message: "Code generated (dev, ethereal)",
        code,
        previewUrl,
      };
      if (smtpTried && typeof smtpSendError !== "undefined") {
        response.smtpSendError = smtpSendError;
        // Helpful guidance for common Gmail app-password error
        const low = (smtpSendError || "").toLowerCase();
        if (
          low.includes("application-specific password") ||
          low.includes("app password") ||
          low.includes("invalidsecondfactor") ||
          low.includes("invalid second factor")
        ) {
          response.smtpHelp =
            "Detected Google SMTP auth issue: create a Gmail App Password (Google Account > Security > App passwords) and set APP_PASSWORD to that app password in server/.env, then restart the server.";
        }
      }
      return res.json(response);
    } catch (ethErr) {
      console.error(
        "Ethereal send failed:",
        ethErr && (ethErr.stack || ethErr)
      );
      // As a last resort in development, return the code so devs can continue testing
      if (process.env.NODE_ENV !== "production") {
        return res.json({
          message: "Code generated (dev, fallback)",
          code,
          error: ethErr.message,
        });
      }
      return res.status(500).json({ message: "Failed to send reset code" });
    }
  } catch (error) {
    console.error("Error in sendResetCode:", error && (error.stack || error));
    // In development, include the error message to aid debugging
    if (process.env.NODE_ENV !== "production") {
      return res
        .status(500)
        .json({ message: "Server error", error: error.message });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

// Verify code
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code)
      return res.status(400).json({ message: "Email and code required" });

    const identifier = email.trim();
    const lc = identifier.toLowerCase();

    let user = await Student.findOne({
      $or: [
        { email: identifier },
        { email: lc },
        { username: identifier },
        { username: lc },
      ],
    });
    if (!user) {
      user = await Admin.findOne({
        $or: [
          { username: identifier },
          { username: lc },
          { email: identifier },
          { email: lc },
        ],
      });
    }
    if (!user)
      return res.status(404).json({ message: "You do not have access." });

    if (!user.passwordResetCode || user.passwordResetCode !== code) {
      return res
        .status(400)
        .json({ message: "Invalid code. Please try again." });
    }

    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      return res
        .status(400)
        .json({ message: "Code expired. Please request a new code." });
    }

    // Code valid
    return res.json({ message: "Code valid" });
  } catch (error) {
    console.error("Error in verifyCode:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword)
      return res
        .status(400)
        .json({ message: "Email, code and new password required" });

    const identifier = email.trim();
    const lc = identifier.toLowerCase();

    let user = await Student.findOne({
      $or: [
        { email: identifier },
        { email: lc },
        { username: identifier },
        { username: lc },
      ],
    });
    let isStudent = true;
    if (!user) {
      user = await Admin.findOne({
        $or: [
          { username: identifier },
          { username: lc },
          { email: identifier },
          { email: lc },
        ],
      });
      isStudent = false;
    }
    if (!user)
      return res.status(404).json({ message: "You do not have access." });

    if (!user.passwordResetCode || user.passwordResetCode !== code) {
      return res
        .status(400)
        .json({ message: "Invalid code. Please try again." });
    }

    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      return res
        .status(400)
        .json({ message: "Code expired. Please request a new code." });
    }

    user.password = newPassword; // will be hashed by pre-save hook
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
