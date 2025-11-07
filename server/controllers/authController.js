const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Student = require("../models/Student");

// Generate JWT token
const generateToken = (id, role) => {
  const secret = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
  return jwt.sign({ id, role }, secret, { expiresIn: "1h" });
};

// Admin or Student Login
exports.loginUser = async (req, res) => {
  let { username, password } = req.body;
  if (!username) username = "";
  const identifier = username.trim();
  const lc = identifier.toLowerCase();

  try {
    // Try find user in Admin collection (match username or email, case-insensitive where appropriate)
    let user = await Admin.findOne({
      $or: [
        { username: identifier },
        { username: lc },
        { email: identifier },
        { email: lc },
      ],
    });
    let role = "admin";

    // If not admin, check student by username or email (also tolerant)
    if (!user) {
      user = await Student.findOne({
        $or: [
          { username: identifier },
          { username: lc },
          { email: identifier },
          { email: lc },
        ],
      });
      role = "student";
    }

    if (!user) {
      console.warn(
        `Login attempt failed: user not found (username=${username})`
      );
      // Per spec: show popup "You do not have access."
      return res.status(401).json({ message: "You do not have access." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.warn(
        `Login attempt failed: wrong password (username=${username})`
      );
      // Per spec: uniform message
      return res.status(401).json({ message: "You do not have access." });
    }

    const token = generateToken(user._id, role);
    console.log(`User logged in: ${username} (role=${role})`);
    return res.json({ token, role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};
