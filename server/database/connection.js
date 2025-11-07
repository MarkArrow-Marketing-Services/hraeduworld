const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Mongoose 6+ uses sensible defaults and the underlying driver no
    // longer requires these options. Passing them is deprecated and
    // causes a runtime warning from the MongoDB driver. Connect without
    // those options. If you need explicit options, add only currently
    // supported ones (eg. serverSelectionTimeoutMS).
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
