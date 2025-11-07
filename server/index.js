// server/index.js

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const connectDB = require("./database/connection");

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
// Allow CORS from frontend origin (configured via .env) or default to localhost:5173
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json()); // Parse JSON request bodies

// Routes placeholder (to add later)
app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const classRoutes = require("./routes/classRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const studentRoutes = require("./routes/studentRoutes");
app.use("/api/student", studentRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/subjects", subjectRoutes);

const unitRoutes = require("./routes/unitRoutes");
const quizRoutes = require("./routes/quizRoutes");

app.use("/api/units", unitRoutes);
app.use("/api/quizzes", quizRoutes);

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const passwordRoutes = require("./routes/passwordRoutes");
app.use("/api/password", passwordRoutes);

const sampleRoutes = require("./routes/sampleRoutes");
app.use("/api/sample", sampleRoutes);

const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
