const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const studentSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    plainPassword: { type: String }, // Store plain password for display/export
    name: { type: String },
    email: { type: String, unique: true, sparse: true },
    schoolName: { type: String },
    // Password reset fields
    passwordResetCode: { type: String },
    passwordResetExpires: { type: Date },
    enrolledClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
    enrolledSubjects: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    ],
    quizProgress: [
      {
        quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
        score: Number,
        completedAt: Date,
      },
    ],
    // Track resource progress for videos and pdfs
    resourceProgress: [
      {
        unitId: { type: mongoose.Schema.Types.ObjectId, ref: "Unit" },
        resourceType: { type: String, enum: ["video", "pdf"] },
        resourceUrl: String,
        completedAt: Date,
      },
    ],
    // Cached overall progress percentage (optional)
    overallProgress: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Hash password before saving
studentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
studentSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Student = mongoose.model("Student", studentSchema);
module.exports = Student;
