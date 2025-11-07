const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    resources: {
      videos: [
        {
          url: String,
          name: String,
        },
      ], // array of { url, name }
      pdfs: [
        {
          url: String,
          name: String,
        },
      ],
    },
  },
  { timestamps: true }
);

const Unit = mongoose.model("Unit", unitSchema);
module.exports = Unit;
