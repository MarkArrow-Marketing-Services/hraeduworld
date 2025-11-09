const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject ID is required"],
    },
    resources: {
      videos: [
        {
          url: {
            type: String,
            required: [true, "Video URL is required"],
          },
          name: {
            type: String,
            required: [true, "Video name is required"],
          },
        },
      ],
      pdfs: [
        {
          url: {
            type: String,
            required: [true, "PDF URL is required"],
          },
          name: {
            type: String,
            required: [true, "PDF name is required"],
          },
        },
      ],
    },
  },
  {
    timestamps: true,
    // Add middleware to ensure at least one video exists
    validateBeforeSave: true,
  }
);

// Add validation to ensure at least one video exists
unitSchema.pre("save", function (next) {
  if (
    !this.resources ||
    !this.resources.videos ||
    this.resources.videos.length === 0
  ) {
    next(new Error("At least one video is required"));
  }
  next();
});

// Add method to safely update resources
unitSchema.methods.updateResources = function (newResources) {
  if (newResources.videos) {
    // Ensure we keep at least one video
    if (newResources.videos.length === 0) {
      throw new Error(
        "Cannot remove all videos. At least one video is required."
      );
    }
    this.resources.videos = newResources.videos;
  }

  if (newResources.pdfs) {
    this.resources.pdfs = newResources.pdfs;
  }
};

const Unit = mongoose.model("Unit", unitSchema);
module.exports = Unit;
