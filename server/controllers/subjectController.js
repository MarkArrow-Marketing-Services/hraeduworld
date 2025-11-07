const Subject = require("../models/Subject");
const Class = require("../models/Class");

// Add a new Subject to a Class
exports.addSubjectToClass = async (req, res) => {
  try {
    const { name, description, classId } = req.body;
    if (!classId) {
      return res.status(400).json({ message: "classId is required" });
    }

    const classObj = await Class.findById(classId);
    if (!classObj) {
      return res.status(404).json({ message: "Class not found" });
    }

    const newSubject = new Subject({ name, description, classId });
    await newSubject.save();

    // Link subject to Class
    classObj.subjects.push(newSubject._id);
    await classObj.save();

    res.status(201).json(newSubject);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get all Subjects for a Class
exports.getSubjectsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const subjects = await Subject.find({ classId });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update Subject
exports.updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const subject = await Subject.findById(id);
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    subject.name = name || subject.name;
    subject.description = description || subject.description;
    await subject.save();
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete Subject
exports.deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findById(id);
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    // Get all units for this subject to delete their files
    const Unit = require("../models/Unit");
    try {
      const units = await Unit.find({ subjectId: id });
      const fs = require("fs");
      const path = require("path");

      // Delete files from each unit
      for (const unit of units) {
        const allFiles = [];
        if (unit.resources?.videos) {
          allFiles.push(...unit.resources.videos.map((v) => v.url));
        }
        if (unit.resources?.pdfs) {
          allFiles.push(...unit.resources.pdfs.map((p) => p.url));
        }

        allFiles.forEach((u) => {
          try {
            const fileName = u.replace(/^\/uploads\//, "");
            const p = path.join(__dirname, "..", "uploads", fileName);
            if (fs.existsSync(p)) {
              fs.unlinkSync(p);
              console.log("deleteSubject: unlinked file", p);
            }
          } catch (e) {
            console.warn(
              "deleteSubject: error while deleting file",
              u,
              e.message
            );
          }
        });
      }

      // Delete all units for this subject
      await Unit.deleteMany({ subjectId: id });
    } catch (uErr) {
      console.warn("Failed to delete units for subject:", uErr.message);
    }

    // Remove subject reference from Class
    try {
      await Class.updateOne(
        { _id: subject.classId },
        { $pull: { subjects: subject._id } }
      );
    } catch (cErr) {
      console.warn("Failed to remove subject ref from class:", cErr.message);
    }

    await Subject.findByIdAndDelete(id);
    res.json({ message: "Subject deleted" });
  } catch (error) {
    console.error("Error deleting subject:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
