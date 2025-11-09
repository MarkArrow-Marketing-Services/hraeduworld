const Unit = require("../models/Unit");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const Quiz = require("../models/Quiz");
const Student = require("../models/Student");

// Helper function to safely delete a file
const safeDeleteFile = async (filePath) => {
  try {
    // Check if file exists
    const exists = fsSync.existsSync(filePath);
    if (!exists) {
      console.log(`File does not exist: ${filePath}`);
      return;
    }

    // Attempt to delete the file
    await fs.unlink(filePath);
    console.log(`Successfully deleted file: ${filePath}`);
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    // Retry once with sync method as fallback
    try {
      if (fsSync.existsSync(filePath)) {
        fsSync.unlinkSync(filePath);
        console.log(`Successfully deleted file on retry: ${filePath}`);
      }
    } catch (retryError) {
      console.error(`Failed to delete file on retry ${filePath}:`, retryError);
    }
  }
};

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
  // Start with detailed request logging
  console.log("\n=== Update Unit Request ===");
  console.log("Unit ID:", req.params.id);
  console.log("Title:", req.body.title);
  console.log("Description:", req.body.description);
  console.log(
    "Files received:",
    req.files ? Object.keys(req.files) : "No files"
  );
  console.log("=========================\n");
  try {
    // Log request details
    console.log("=== Update Unit Request ===");
    console.log("Params:", req.params);
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log(
      "Files:",
      req.files
        ? Object.keys(req.files).map((key) => ({
            key,
            count: req.files[key].length,
          }))
        : "No files"
    );

    // Input validation
    if (!req.params.id) {
      return res.status(400).json({
        message: "Unit ID is required",
        error: "Missing unit ID in request parameters",
      });
    }

    const { id } = req.params;
    const unit = await Unit.findById(id);
    if (!unit) return res.status(404).json({ message: "Unit not found" });

    // Ensure resources object exists
    if (!unit.resources) {
      unit.resources = { videos: [], pdfs: [] };
    }
    if (!unit.resources.videos) unit.resources.videos = [];
    if (!unit.resources.pdfs) unit.resources.pdfs = []; // Validate title if provided (it's required)
    // Update title if provided
    const title = req.body.title;
    if (title !== undefined) {
      if (!title || title.trim() === "") {
        return res.status(400).json({
          message: "Title is required",
          details: { title: "Title cannot be empty" },
        });
      }
      unit.title = title.trim();
    }

    // Update description if provided
    const description = req.body.description;
    if (description !== undefined) {
      unit.description = description || "";
    }

    // If files are uploaded during update, append them to resources
    const videoFiles = (req.files && req.files["videos"]) || [];
    const pdfFiles = (req.files && req.files["pdfs"]) || [];

    console.log("Processing files:", {
      videoFiles: videoFiles.length,
      pdfFiles: pdfFiles.length,
    });

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

    console.log("Processing names:", {
      videoNames: videoNames.length,
      pdfNames: pdfNames.length,
    });

    try {
      for (let i = 0; i < videoFiles.length; i++) {
        const file = videoFiles[i];
        if (file && file.filename) {
          unit.resources.videos.push({
            url: `/uploads/${file.filename}`,
            name: videoNames[i] || file.originalname || `Video ${i + 1}`,
          });
        }
      }

      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        if (file && file.filename) {
          unit.resources.pdfs.push({
            url: `/uploads/${file.filename}`,
            name: pdfNames[i] || file.originalname || `PDF ${i + 1}`,
          });
        }
      }
    } catch (e) {
      console.error("Error processing uploaded files:", e);
      return res.status(400).json({
        message: "Error processing uploaded files",
        error: e.message,
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
    try {
      if (req.body.renameVideoNames) {
        renameVideoNames =
          typeof req.body.renameVideoNames === "string"
            ? JSON.parse(req.body.renameVideoNames)
            : req.body.renameVideoNames;
        console.log("Video renames:", renameVideoNames);
      }
      if (req.body.renamePdfNames) {
        renamePdfNames =
          typeof req.body.renamePdfNames === "string"
            ? JSON.parse(req.body.renamePdfNames)
            : req.body.renamePdfNames;
        console.log("PDF renames:", renamePdfNames);
      }
    } catch (e) {
      console.error("Error parsing rename data:", e);
      return res.status(400).json({
        message: "Invalid rename data format",
        error: e.message,
      });
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
      console.log("Processing video removals:", removeVideoUrls);

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

      // Delete files from disk
      for (const u of removeVideoUrls) {
        const fileName = u.replace(/^\/uploads\//, "");
        const filePath = path.join(__dirname, "..", "uploads", fileName);
        await safeDeleteFile(filePath);
      }
    }

    if (removePdfUrls.length > 0) {
      unit.resources.pdfs = unit.resources.pdfs.filter(
        (p) => !removePdfUrls.includes(p.url)
      );
      // Delete PDF files from disk
      for (const u of removePdfUrls) {
        const fileName = u.replace(/^\/uploads\//, "");
        const filePath = path.join(__dirname, "..", "uploads", fileName);
        await safeDeleteFile(filePath);
      }
    }

    try {
      console.log(
        "Attempting to save unit:",
        JSON.stringify(unit.toObject(), null, 2)
      );
      const savedUnit = await unit.save();
      console.log("Unit saved successfully");
      res.json({ message: "Unit updated successfully", unit: savedUnit });
    } catch (saveError) {
      console.error("Error saving unit:", {
        error: saveError.message,
        validationErrors: saveError.errors,
        stack: saveError.stack,
      });
      return res.status(500).json({
        message: "Failed to save unit changes",
        error: saveError.message,
        validationErrors: saveError.errors,
      });
    }
  } catch (error) {
    console.error("Error updating unit:", {
      type: error.name,
      message: error.message,
      stack: error.stack,
      body: req.body,
      files: req.files ? Object.keys(req.files) : null,
      validationErrors: error.errors,
    });

    // Handle different types of errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation failed",
        error: Object.values(error.errors)
          .map((err) => err.message)
          .join(", "),
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid unit ID",
        error: "The provided unit ID is not valid",
      });
    }

    return res.status(500).json({
      message: "Failed to update unit",
      error: error.message || "Unknown error occurred",
    });
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

    // Delete all files from disk
    for (const u of allFiles) {
      const fileName = u.replace(/^\/uploads\//, "");
      const filePath = path.join(__dirname, "..", "uploads", fileName);
      await safeDeleteFile(filePath);
    }

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
