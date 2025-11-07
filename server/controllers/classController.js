const Class = require("../models/Class");
const Subject = require("../models/Subject");

// Create a new Class
exports.createClass = async (req, res) => {
  try {
    const { name, description } = req.body;
    const existingClass = await Class.findOne({ name });
    if (existingClass) {
      return res.status(400).json({ message: "Class already exists" });
    }

    const newClass = new Class({ name, description });
    await newClass.save();
    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get all Classes
exports.getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find({}).populate("subjects");
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update class
exports.updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const cls = await Class.findById(id);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    cls.name = name || cls.name;
    cls.description = description || cls.description;
    await cls.save();
    res.json(cls);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete class
exports.deleteClass = async (req, res) => {
  try {
    console.log("deleteClass called with id=", req.params.id);
    const { id } = req.params;
    const cls = await Class.findById(id);
    console.log("found class=", !!cls);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    // Cascade delete: remove subjects and units belonging to this class
    try {
      const subjects = await Subject.find({ classId: id });
      const subjectIds = subjects.map((s) => s._id);
      // Delete units that reference these subjects
      const Unit = require("../models/Unit");
      // Get full unit data to access file paths
      const units = await Unit.find({ subjectId: { $in: subjectIds } });
      const unitIds = units.map((u) => u._id).filter(Boolean);

      if (unitIds.length > 0) {
        // First delete all files from units
        const fs = require("fs");
        const path = require("path");

        for (const unit of units) {
          const allFiles = [];
          if (unit.resources?.videos) {
            allFiles.push(...unit.resources.videos.map((v) => v.url));
          }
          if (unit.resources?.pdfs) {
            allFiles.push(...unit.resources.pdfs.map((p) => p.url));
          }

          for (const fileUrl of allFiles) {
            try {
              const fileName = fileUrl.replace(/^\/uploads\//, "");
              const filePath = path.join(__dirname, "..", "uploads", fileName);
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log("deleteClass: deleted file", filePath);
              }
            } catch (e) {
              console.warn(
                "deleteClass: error deleting file",
                fileUrl,
                e.message
              );
            }
          }
        }

        // Delete quizzes attached to these units and clean student quizProgress
        try {
          const Quiz = require("../models/Quiz");
          const Student = require("../models/Student");
          const quizzes = await Quiz.find({ unitId: { $in: unitIds } })
            .select("_id")
            .lean();
          const quizIds = quizzes.map((q) => q._id).filter(Boolean);
          if (quizIds.length > 0) {
            await Quiz.deleteMany({ _id: { $in: quizIds } });
            await Student.updateMany(
              {},
              { $pull: { quizProgress: { quizId: { $in: quizIds } } } }
            );
          }
        } catch (qe) {
          console.warn(
            "deleteClass: error deleting quizzes for units",
            qe.message
          );
        }

        // Now delete units
        await Unit.deleteMany({ subjectId: { $in: subjectIds } });
      }
      // Delete the subjects
      await Subject.deleteMany({ classId: id });
    } catch (cascadeErr) {
      console.warn("Cascade delete warning:", cascadeErr.message);
    }

    await Class.findByIdAndDelete(id);
    res.json({ message: "Class deleted" });
  } catch (error) {
    console.error("Error deleting class:", error && (error.stack || error));
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
