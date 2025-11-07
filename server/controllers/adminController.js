const Admin = require("../models/Admin");
const Student = require("../models/Student");
const Quiz = require("../models/Quiz");
const nodemailer = require("nodemailer");

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.APP_PASSWORD,
    },
  });
};

// Get Admin Profile
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-password");
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update Admin Profile
exports.updateAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    admin.username = req.body.username || admin.username;
    // Add other updatable fields as required

    if (req.body.password) {
      admin.password = req.body.password; // will be hashed by pre-save hook
    }

    await admin.save();
    res.json({ message: "Admin profile updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Create Admin or Student (used by Add Student page)
exports.createUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      role,
      schoolName,
      classIds,
      subjectIds,
    } = req.body;

    if (!role || !password)
      return res.status(400).json({ message: "Role and password required" });

    // Helper to send welcome email with credentials
    const sendWelcomeEmail = async (
      toEmail,
      displayName,
      pw,
      isAdmin = false
    ) => {
      if (!(process.env.EMAIL_USER && process.env.APP_PASSWORD)) return;
      try {
        const transporter = createTransporter();
        const subject = isAdmin
          ? "Welcome to HraEduWorld - Admin account"
          : "Welcome to HraEduWorld";
        const plainTextBody = `${
          isAdmin ? "Hello Admin" : `Hello ${displayName || "Student"}`
        },\n\nYour account has been created.\n\nLogin email: ${toEmail}\nPassword: ${pw}\n\nPlease change your password after your first login.\n\nRegards,\nHraEduWorld Team`;
        const htmlBody = `<p>${
          isAdmin ? "Hello Admin" : `Hello ${displayName || "Student"}`
        },</p><p>Your account has been created.</p><p><strong>Login email:</strong> ${toEmail}<br/><strong>Password:</strong> ${pw}</p><p>Please change your password after your first login.</p><p>Regards,<br/>HraEduWorld Team</p>`;
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: toEmail,
          subject,
          text: plainTextBody,
          html: htmlBody,
        });
      } catch (emailErr) {
        console.warn(
          "Failed to send welcome email:",
          emailErr && emailErr.message
        );
      }
    };

    if (role === "admin") {
      const existing = await Admin.findOne({ username: email });
      if (existing)
        return res.status(400).json({ message: "Admin already exists" });

      const admin = new Admin({
        username: email,
        name: fullName || email,
        email,
        password,
      });
      await admin.save();

      // send email (if configured) - use the provided name when available
      await sendWelcomeEmail(email, admin.name, password, true);

      const adminOut = admin.toObject
        ? admin.toObject()
        : JSON.parse(JSON.stringify(admin));
      delete adminOut.password;
      return res.status(201).json({
        message: "Admin account successfully created",
        admin: adminOut,
      });
    }

    // Student
    const existingStudent = await Student.findOne({ email });
    if (existingStudent)
      return res.status(400).json({ message: "Student already exists" });

    const student = new Student({
      username: email,
      password,
      name: fullName,
      schoolName,
      email,
      enrolledClasses: classIds || [],
      enrolledSubjects: subjectIds || [],
    });

    await student.save();

    // send email (if configured)
    await sendWelcomeEmail(email, fullName, password, false);

    const studentOut = student.toObject
      ? student.toObject()
      : JSON.parse(JSON.stringify(student));
    delete studentOut.password;
    return res.status(201).json({
      message: "Student account successfully created",
      student: studentOut,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin stats and listings
exports.getStats = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalAdmins = await Admin.countDocuments();
    const totalClasses = await require("../models/Class").countDocuments();
    const totalSubjects = await require("../models/Subject").countDocuments();
    const totalUnits = await require("../models/Unit").countDocuments();
    // Count only quizzes that are tied to an existing unit (ignore orphaned quizzes)
    let totalQuizzes = 0;
    try {
      // load all quizzes' unitIds, then verify which unitIds still exist
      const allQuizzes = await Quiz.find({}).select("_id unitId").lean();
      const unitIds = Array.from(
        new Set(allQuizzes.map((q) => String(q.unitId)).filter(Boolean))
      );
      if (unitIds.length > 0) {
        const Unit = require("../models/Unit");
        const existingUnits = await Unit.find({ _id: { $in: unitIds } })
          .select("_id")
          .lean();
        const existingSet = new Set(existingUnits.map((u) => String(u._id)));
        totalQuizzes = allQuizzes.filter((q) =>
          existingSet.has(String(q.unitId))
        ).length;
      } else {
        totalQuizzes = 0;
      }
    } catch (e) {
      console.warn(
        "getStats: failed to compute totalQuizzes reliably",
        e.message
      );
      totalQuizzes = await Quiz.countDocuments({
        unitId: { $exists: true, $ne: null },
      });
    }
    // Compute total videos and pdfs across all units (batch)
    const Unit = require("../models/Unit");
    const units = await Unit.find({}).select("resources").lean();
    let totalVideos = 0;
    let totalPdfs = 0;
    for (const u of units) {
      totalVideos +=
        u.resources && Array.isArray(u.resources.videos)
          ? u.resources.videos.length
          : 0;
      totalPdfs +=
        u.resources && Array.isArray(u.resources.pdfs)
          ? u.resources.pdfs.length
          : 0;
    }

    console.log("getStats computed:", {
      totalStudents,
      totalAdmins,
      totalClasses,
      totalSubjects,
      totalUnits,
      totalQuizzes,
      totalVideos,
      totalPdfs,
    });

    res.json({
      totalStudents,
      totalAdmins,
      totalClasses,
      totalSubjects,
      totalUnits,
      totalQuizzes,
      totalVideos,
      totalPdfs,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.listStudents = async (req, res) => {
  try {
    // Return both students and admins so admin UI can manage both user types
    const students = await Student.find({})
      .select(
        "name username email schoolName enrolledClasses enrolledSubjects quizProgress overallProgress resourceProgress"
      )
      .populate("enrolledClasses")
      .populate({ path: "enrolledSubjects", select: "name classId" })
      .lean();

    const admins = await Admin.find({})
      .select("_id username email name")
      .lean();

    // Map admins to the same shape and add role
    const adminMapped = admins.map((a) => ({
      _id: a._id,
      name: a.name || a.username,
      username: a.username,
      email: a.email,
      role: "admin",
    }));

    const studentsMapped = students.map((s) => ({
      ...s,
      role: "student",
      name: s.name || s.username,
    }));

    // Combine and exclude the requesting admin's own account from the list
    const combined = [...studentsMapped, ...adminMapped].filter((u) => {
      try {
        return String(u._id) !== String(req.user && req.user.id);
      } catch (e) {
        return true;
      }
    });

    res.json(combined);
  } catch (error) {
    console.error("Error listing students:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update admin by id (admin managing other admins)
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // Allow updating username/email/password
    admin.username = req.body.username ?? admin.username;
    admin.name = req.body.name ?? admin.name;
    admin.email = req.body.email ?? admin.email;
    if (req.body.password) admin.password = req.body.password;

    await admin.save();
    res.json({ message: "Admin updated successfully" });
  } catch (error) {
    console.error("Error updating admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete admin by id (admin)
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    // Prevent deleting own account via this route
    if (String(req.user && req.user.id) === String(id)) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own admin account" });
    }
    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    await Admin.findByIdAndDelete(id);
    res.json({ message: "Admin deleted successfully" });
  } catch (error) {
    console.error("Error deleting admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: get aggregated progress (overallPercent, totalItems, completedItems) for a specific student id
exports.getStudentAggregatedProgressById = async (req, res) => {
  try {
    const studentId = req.params.id;
    const studentController = require("./../controllers/studentController");
    const fakeReq = { user: { id: studentId } };
    const fakeRes = {
      json: (payload) => res.json(payload),
      status: (code) => ({ json: (p) => res.status(code).json(p) }),
    };
    return studentController.getAggregatedProgress(fakeReq, fakeRes);
  } catch (error) {
    console.error("Error in admin getStudentAggregatedProgressById:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: get quiz history for a specific student id
exports.getStudentQuizHistoryById = async (req, res) => {
  try {
    const studentId = req.params.id;
    const studentController = require("./../controllers/studentController");
    const fakeReq = { user: { id: studentId } };
    const fakeRes = {
      json: (payload) => res.json(payload),
      status: (code) => ({ json: (p) => res.status(code).json(p) }),
    };
    return studentController.getStudentQuizHistory(fakeReq, fakeRes);
  } catch (error) {
    console.error("Error in admin getStudentQuizHistoryById:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// List all quizzes (admin only) - useful for debugging/cleanup
exports.listAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({}).select("_id unitId name").lean();
    res.json(quizzes);
  } catch (error) {
    console.error("Error listing quizzes:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Temporary debug: list admin users (id, username, email)
exports.listAllAdmins = async (req, res) => {
  try {
    const admins = await require("../models/Admin")
      .find({})
      .select("_id username email name")
      .lean();
    res.json(admins);
  } catch (error) {
    console.error("Error listing admins:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Temporary debug: set admin email by username

// Temporary: delete a quiz by ID (unauthenticated debug helper)
exports.deleteQuizById = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findByIdAndDelete(id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json({ message: "Quiz deleted", id: quiz._id });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update student by id (admin)
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    student.name = req.body.name ?? student.name;
    // allow updating school name from admin panel
    if (typeof req.body.schoolName !== "undefined") {
      student.schoolName = req.body.schoolName;
    }
    student.email = req.body.email ?? student.email;
    if (req.body.password) student.password = req.body.password;
    if (req.body.enrolledClasses)
      student.enrolledClasses = req.body.enrolledClasses;
    if (req.body.enrolledSubjects) {
      student.enrolledSubjects = req.body.enrolledSubjects;
    }
    // Do not auto-populate enrolledSubjects from enrolledClasses on update.

    await student.save();
    res.json({ message: "Student updated successfully" });
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete student by id (admin)
exports.deleteStudent = async (req, res) => {
  try {
    console.log("deleteStudent called with id=", req.params.id);
    const { id } = req.params;
    const student = await Student.findById(id);
    console.log("found student=", !!student);
    if (!student) return res.status(404).json({ message: "Student not found" });

    await Student.findByIdAndDelete(id);
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error && (error.stack || error));
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
