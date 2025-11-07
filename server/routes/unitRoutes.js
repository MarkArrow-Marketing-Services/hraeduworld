const express = require("express");
const router = express.Router();
const {
  createUnit,
  getUnitsBySubject,
  updateUnit,
  deleteUnit,
} = require("../controllers/unitController");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

// Simple logger to inspect incoming upload requests
const logRequest = (req, res, next) => {
  console.log("unitRoutes: headers=", req.headers);
  next();
};

router.post(
  "/",
  logRequest,
  protect(["admin"]),
  upload.fields([
    { name: "videos", maxCount: 3 },
    { name: "pdfs", maxCount: 3 },
  ]),
  createUnit
);
router.get("/:subjectId", protect(["admin", "student"]), getUnitsBySubject);
router.put(
  "/update/:id",
  protect(["admin"]),
  upload.fields([
    { name: "videos", maxCount: 5 },
    { name: "pdfs", maxCount: 5 },
  ]),
  updateUnit
);
router.delete("/delete/:id", protect(["admin"]), deleteUnit);

module.exports = router;
