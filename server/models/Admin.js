const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    name: { type: String },
    email: {
      type: String,
      required: false,
      unique: false,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    plainPassword: { type: String }, // Store plain password for display/export
    // Password reset fields
    passwordResetCode: { type: String },
    passwordResetExpires: { type: Date },
  },
  { timestamps: true }
);

// Hash password before saving
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare password
adminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Admin = mongoose.model("Admin", adminSchema);
module.exports = Admin;
