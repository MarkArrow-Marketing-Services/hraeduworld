const Unit = require("../models/Unit");
const fs = require("fs");
const path = require("path");
const Quiz = require("../models/Quiz");
const Student = require("../models/Student");

// Create Unit with uploaded files
exports.createUnit = async (req, res) => {
  try {
    console.log("createUnit called. body:", req.body);
    console.log("createUnit files:", req.files);
    const { title, description, subjectId } = req.body;

    // Validate required fields
    if (!title || !subjectId) {
      return res.status(400).json({
        message: "Missing required fields",
        details: {
          title: !title ? "Title is required" : null,
          subjectId: !subjectId ? "Subject is required" : null,
        },
      });
    }
    // Multer may place files under different field keys depending on client.
    // Normalize files: collect anything that looks like a video or pdf upload.
    const allFiles = req.files || {};
    let videoFiles = [];
    let pdfFiles = [];
    Object.keys(allFiles).forEach((k) => {
      const arr = allFiles[k] || [];
      if (!Array.isArray(arr)) return;
      if (k.toLowerCase().includes("video")) videoFiles.push(...arr);
      else if (k.toLowerCase().includes("pdf")) pdfFiles.push(...arr);
      else {
        // fallback: inspect mimetype of first file
        const first = arr[0];
        if (first && first.mimetype && first.mimetype.startsWith("video/"))
          videoFiles.push(...arr);
        else if (
          first &&
          first.mimetype &&
          (first.mimetype === "application/pdf" ||
            first.mimetype === "application/octet-stream")
        )
          pdfFiles.push(...arr);
      }
    });

    console.log(
      "createUnit: normalized videoFiles count=",
      videoFiles.length,
      "pdfFiles count=",
      pdfFiles.length
    );
    // Support optional display names for uploaded files sent in body as
    // videoNames[] and pdfNames[] corresponding to file order.
    const videoNames = Array.isArray(req.body.videoNames)
      ? req.body.videoNames
      : req.body.videoNames
      ? [req.body.videoNames]
      : [];
    const pdfNames = Array.isArray(req.body.pdfNames)
      ? req.body.pdfNames
      : req.body.pdfNames
      ? [req.body.pdfNames]
      : [];

    const videos = videoFiles.map((file, idx) => ({
      url: `/uploads/${file.filename}`,
      name: videoNames[idx] || file.originalname || `Video ${idx + 1}`,
    }));

    const pdfs = pdfFiles.map((file, idx) => ({
      url: `/uploads/${file.filename}`,
      name: pdfNames[idx] || file.originalname || `PDF ${idx + 1}`,
    }));

    // Validate at least one video is present
    if (!videoFiles.length) {
      return res.status(400).json({
        message: "At least one video is required",
        details: {
          videos: "Please upload at least one video for the unit",
        },
      });
    }

    const newUnit = new Unit({
      title,
      description,
      subjectId,
      resources: { videos, pdfs },
    });
    await newUnit.save();
    res.status(201).json(newUnit);
  } catch (error) {
    console.error("createUnit error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Helper to normalize resource arrays: accepts array of strings or objects and returns objects with { url, name }
const normalizeResources = (arr, defaultPrefix) => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item, idx) => {
      if (!item) return null;
      if (typeof item === "string") {
        return { url: item, name: `${defaultPrefix} ${idx + 1}` };
      }
      // assume object with url and optional name
      return {
        url: item.url || item,
        name: item.name || `${defaultPrefix} ${idx + 1}`,
      };
    })
    .filter(Boolean);
};

// Get Units by Subject
exports.getUnitsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const units = await Unit.find({ subjectId });
    res.json(units);
  } catch (error) {
    console.error("getUnitsBySubject error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update unit by id
exports.updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const unit = await Unit.findById(id);
    if (!unit) return res.status(404).json({ message: "Unit not found" });

    // Validate title if provided (it's required)
    if (req.body.hasOwnProperty("title")) {
      if (!req.body.title) {
        return res.status(400).json({
          message: "Title is required",
          details: { title: "Title cannot be empty" },
        });
      }
      unit.title = req.body.title;
    }

    // Update description if provided (optional)
    if (req.body.hasOwnProperty("description")) {
      unit.description = req.body.description;
    }

    // If files are uploaded during update, append them to resources
    const videoFiles = (req.files && req.files["videos"]) || [];
    const pdfFiles = (req.files && req.files["pdfs"]) || [];

    const videoNames = Array.isArray(req.body.videoNames)
      ? req.body.videoNames
      : req.body.videoNames
      ? [req.body.videoNames]
      : [];
    const pdfNames = Array.isArray(req.body.pdfNames)
      ? req.body.pdfNames
      : req.body.pdfNames
      ? [req.body.pdfNames]
      : [];

    for (let i = 0; i < videoFiles.length; i++) {
      const file = videoFiles[i];
      unit.resources.videos.push({
        url: `/uploads/${file.filename}`,
        name: videoNames[i] || file.originalname,
      });
    }

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      unit.resources.pdfs.push({
        url: `/uploads/${file.filename}`,
        name: pdfNames[i] || file.originalname,
      });
    }

    // Support removal of specific resource items by index or url
    // client can send removeVideoUrls[] or removePdfUrls[] to remove existing resources
    const removeVideoUrls = Array.isArray(req.body.removeVideoUrls)
      ? req.body.removeVideoUrls
      : req.body.removeVideoUrls
      ? [req.body.removeVideoUrls]
      : [];
    const removePdfUrls = Array.isArray(req.body.removePdfUrls)
      ? req.body.removePdfUrls
      : req.body.removePdfUrls
      ? [req.body.removePdfUrls]
      : [];

    // Support renaming existing resources: client can send renameVideoNames as a JSON string or object mapping url->newName
    let renameVideoNames = {};
    let renamePdfNames = {};
    if (req.body.renameVideoNames) {
      try {
        renameVideoNames =
          typeof req.body.renameVideoNames === "string"
            ? JSON.parse(req.body.renameVideoNames)
            : req.body.renameVideoNames;
      } catch (e) {
        console.warn("Failed to parse renameVideoNames", e.message);
      }
    }
    if (req.body.renamePdfNames) {
      try {
        renamePdfNames =
          typeof req.body.renamePdfNames === "string"
            ? JSON.parse(req.body.renamePdfNames)
            : req.body.renamePdfNames;
      } catch (e) {
        console.warn("Failed to parse renamePdfNames", e.message);
      }
    }

    // apply rename maps
    if (Object.keys(renameVideoNames).length > 0) {
      unit.resources.videos = unit.resources.videos.map((v) => ({
        ...v,
        name: renameVideoNames[v.url] || v.name,
      }));
    }
    if (Object.keys(renamePdfNames).length > 0) {
      unit.resources.pdfs = unit.resources.pdfs.map((p) => ({
        ...p,
        name: renamePdfNames[p.url] || p.name,
      }));
    }

    if (removeVideoUrls.length > 0) {
      // Check if removing videos would leave the unit with no videos
      const remainingVideos = unit.resources.videos.filter(
        (v) => !removeVideoUrls.includes(v.url)
      );

      if (remainingVideos.length === 0 && !videoFiles.length) {
        return res.status(400).json({
          message: "Cannot remove all videos",
          details: {
            videos:
              "Unit must have at least one video. Upload a new video before removing the last one.",
          },
        });
      }

      unit.resources.videos = remainingVideos;
      // also attempt to unlink files from disk
      removeVideoUrls.forEach((u) => {
        const fileName = u.replace(/^\/uploads\//, "");
        const p = path.join(__dirname, "..", "uploads", fileName);
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
            console.log("updateUnit: unlinked video", p);
          } catch (e) {
            console.error("Failed to unlink video", p, e.message);
            // Try again with a small delay
            setTimeout(() => {
              try {
                if (fs.existsSync(p)) {
                  fs.unlinkSync(p);
                  console.log("updateUnit: unlinked video on retry", p);
                }
              } catch (retryError) {
                console.error(
                  "Failed to unlink video on retry",
                  p,
                  retryError.message
                );
              }
            }, 100);
          }
        } else {
          console.log("updateUnit: video file does not exist", p);
        }
      });
    }

    if (removePdfUrls.length > 0) {
      unit.resources.pdfs = unit.resources.pdfs.filter(
        (p) => !removePdfUrls.includes(p.url)
      );
      removePdfUrls.forEach((u) => {
        const fileName = u.replace(/^\/uploads\//, "");
        const p = path.join(__dirname, "..", "uploads", fileName);
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
            console.log("updateUnit: unlinked pdf", p);
          } catch (e) {
            console.error("Failed to unlink pdf", p, e.message);
            // Try again with a small delay
            setTimeout(() => {
              try {
                if (fs.existsSync(p)) {
                  fs.unlinkSync(p);
                  console.log("updateUnit: unlinked pdf on retry", p);
                }
              } catch (retryError) {
                console.error(
                  "Failed to unlink pdf on retry",
                  p,
                  retryError.message
                );
              }
            }, 100);
          }
        } else {
          console.log("updateUnit: pdf file does not exist", p);
        }
      });
    }

    await unit.save();
    res.json({ message: "Unit updated", unit });
  } catch (error) {
    console.error("Error updating unit:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete unit by id
exports.deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("deleteUnit called for id=", id);
    const unit = await Unit.findById(id);
    console.log("found unit=", !!unit);
    if (!unit) return res.status(404).json({ message: "Unit not found" });

    // remove files from disk
    // normalize resources in case older units stored plain string paths
    const videos = normalizeResources(unit.resources?.videos || [], "Video");
    const pdfs = normalizeResources(unit.resources?.pdfs || [], "PDF");
    const allFiles = [];
    videos.forEach((v) => allFiles.push(v.url));
    pdfs.forEach((p) => allFiles.push(p.url));

    console.log("deleteUnit: unit.resources=", JSON.stringify(unit.resources));
    console.log("deleteUnit: allFiles=", allFiles);

    allFiles.forEach((u) => {
      try {
        // Remove leading slash and 'uploads' from the URL if present
        const fileName = u.replace(/^\/uploads\//, "");
        const p = path.join(__dirname, "..", "uploads", fileName);
        console.log("deleteUnit: attempting unlink", p);
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
            console.log("deleteUnit: unlinked", p);
          } catch (e) {
            console.warn("Failed to unlink file", p, e.message);
          }
        } else {
          console.log("deleteUnit: file does not exist, skipping", p);
        }
      } catch (e) {
        console.warn("deleteUnit: error while handling file", u, e.message);
      }
    });

    // Delete quizzes attached to this unit and remove quizProgress references from students
    try {
      const quizzes = await Quiz.find({ unitId: id }).select("_id").lean();
      const quizIds = quizzes.map((q) => q._id).filter(Boolean);
      if (quizIds.length > 0) {
        await Quiz.deleteMany({ _id: { $in: quizIds } });
        // Remove quiz progress entries that refer to these quizzes
        await Student.updateMany(
          {},
          { $pull: { quizProgress: { quizId: { $in: quizIds } } } }
        );
      }
    } catch (e) {
      console.warn(
        "deleteUnit: error deleting quizzes or cleaning student progress",
        e.message
      );
    }

    await Unit.findByIdAndDelete(id);
    res.json({ message: "Unit deleted" });
  } catch (error) {
    console.error("Error deleting unit:", error);
    // temporarily return error message to help debugging client-side 500
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
