const Student = require("../models/Student");

// Helper: normalize resource url (strip host) so comparisons match regardless of absolute vs relative URLs
function normalizeResourceUrl(u) {
  if (!u) return "";
  try {
    if (
      typeof u === "string" &&
      (u.startsWith("http://") || u.startsWith("https://"))
    ) {
      const parsed = new URL(u);
      return parsed.pathname || u;
    }
  } catch (e) {
    // fallthrough
  }
  return u;
}

// Build set of subject ids the student should be considered enrolled in.
// If the student has explicit enrolledSubjects set (non-empty), we treat that as a filter
// for class subjects; otherwise all subjects from enrolledClasses are included.
function buildStudentSubjectIds(student) {
  const enrolledSubjectIds = new Set(
    (student.enrolledSubjects || []).map((s) =>
      s && s._id ? s._id.toString() : s.toString()
    )
  );

  const subjectIds = new Set();
  (student.enrolledClasses || []).forEach((cls) => {
    (cls.subjects || []).forEach((s) => {
      try {
        const id = s && s._id ? s._id.toString() : s.toString();
        if (enrolledSubjectIds.size > 0) {
          // Only include class subject if it's also explicitly enrolled
          if (enrolledSubjectIds.has(id)) subjectIds.add(id);
        } else {
          subjectIds.add(id);
        }
      } catch (e) {
        // ignore malformed subject
      }
    });
  });

  // Also include any enrolledSubjects that might not belong to enrolledClasses
  (student.enrolledSubjects || []).forEach((s) => {
    try {
      const id = s && s._id ? s._id.toString() : s.toString();
      subjectIds.add(id);
    } catch (e) {}
  });

  return subjectIds;
}

// @desc    Get logged-in student's profile
// @route   GET /api/student/profile
// @access  Private (student)
exports.getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id)
      .select("-password")
      .populate("enrolledClasses");
    if (!student) return res.status(404).json({ message: "Student not found" });

    res.json(student);
  } catch (error) {
    console.error("Error fetching student profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update logged-in student's profile
// @route   PUT /api/student/profile
// @access  Private (student)
exports.updateStudentProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    student.name = req.body.name || student.name;
    student.email = req.body.email || student.email;
    if (req.body.password) {
      student.password = req.body.password; // Will be hashed by pre-save hook
    }

    await student.save();
    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating student profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get classes enrolled by the student
// @route   GET /api/student/classes
// @access  Private (student)
exports.getEnrolledClasses = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id)
      .populate({
        path: "enrolledClasses",
        populate: { path: "subjects" },
      })
      .populate("enrolledSubjects");
    if (!student) return res.status(404).json({ message: "Student not found" });

    // If student.enrolledSubjects is set, filter each class's subjects to only those the student is enrolled in
    const enrolledSubjectIds = new Set(
      (student.enrolledSubjects || []).map((s) =>
        s._id ? s._id.toString() : s.toString()
      )
    );

    const classesFiltered = (student.enrolledClasses || []).map((cls) => {
      const copy = { ...(cls.toObject ? cls.toObject() : cls) };
      if (Array.isArray(copy.subjects) && enrolledSubjectIds.size > 0) {
        copy.subjects = copy.subjects.filter((sub) => {
          try {
            const id = sub && sub._id ? sub._id.toString() : sub.toString();
            return enrolledSubjectIds.has(id);
          } catch (e) {
            return false;
          }
        });
      }
      return copy;
    });

    res.json(classesFiltered);
  } catch (error) {
    console.error("Error fetching enrolled classes:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc Get student's quiz history (populated)
// @route GET /api/student/quiz-history
// @access Private (student)
exports.getStudentQuizHistory = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const quizIds = (student.quizProgress || [])
      .map((p) => p.quizId)
      .filter(Boolean);
    const Quiz = require("../models/Quiz");
    const Unit = require("../models/Unit");

    // Fetch subjects and classes for mapping
    const Subject = require("../models/Subject");
    const Class = require("../models/Class");
    const quizzes = await Quiz.find({ _id: { $in: quizIds } }).lean();
    const unitIds = quizzes
      .map((q) => q.unitId)
      .filter(Boolean)
      .map((id) => id.toString());
    const units = await Unit.find({ _id: { $in: unitIds } }).lean();
    const unitMap = new Map(units.map((u) => [u._id.toString(), u]));

    // Prepare subject and class maps once (avoid await inside map)
    const subjectIds = Array.from(
      new Set(
        units
          .map((u) => (u.subjectId ? u.subjectId.toString() : null))
          .filter(Boolean)
      )
    );
    const subjects = subjectIds.length
      ? await Subject.find({ _id: { $in: subjectIds } }).lean()
      : [];
    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), s]));

    const classIds = Array.from(
      new Set(
        subjects
          .map((s) => (s.classId ? s.classId.toString() : null))
          .filter(Boolean)
      )
    );
    const classes = classIds.length
      ? await Class.find({ _id: { $in: classIds } }).lean()
      : [];
    const classMap = new Map(classes.map((c) => [c._id.toString(), c]));

    const history = (student.quizProgress || []).map((p) => {
      const q = quizzes.find((qq) => qq._id.toString() === p.quizId.toString());
      const unit = q && q.unitId ? unitMap.get(q.unitId.toString()) : null;
      const subject =
        unit && unit.subjectId
          ? subjectMap.get(unit.subjectId.toString())
          : null;
      const cls =
        subject && subject.classId
          ? classMap.get(subject.classId.toString())
          : null;
      return {
        quizId: p.quizId,
        score: p.score,
        completedAt: p.completedAt,
        quizName: q ? q.name || null : null,
        unitId: q ? q.unitId : null,
        unitTitle: unit ? unit.title : null,
        subjectId: subject ? subject._id : null,
        subjectName: subject ? subject.name : null,
        classId: cls ? cls._id : null,
        className: cls ? cls.name : null,
        totalQuestions:
          q && Array.isArray(q.questions) ? q.questions.length : 0,
      };
    });

    res.json(history);
  } catch (error) {
    console.error("Error fetching quiz history", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update quiz progress for the student
// @route   POST /api/student/quiz-progress
// @access  Private (student)
exports.updateQuizProgress = async (req, res) => {
  try {
    const { quizId, score } = req.body;
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const progressIndex = student.quizProgress.findIndex(
      (p) => p.quizId.toString() === quizId
    );
    if (progressIndex !== -1) {
      student.quizProgress[progressIndex].score = score;
      student.quizProgress[progressIndex].completedAt = new Date();
    } else {
      student.quizProgress.push({ quizId, score, completedAt: new Date() });
    }

    await student.save();
    // Recompute aggregated progress to reflect the newly submitted quiz
    try {
      await student.populate({
        path: "enrolledClasses",
        populate: { path: "subjects" },
      });

      const Unit = require("../models/Unit");
      const Quiz = require("../models/Quiz");

      // Build effective subject IDs for this student (respect explicit enrolledSubjects)
      const subjectIds = buildStudentSubjectIds(student);
      const subjectIdArray = Array.from(subjectIds);

      if (subjectIdArray.length === 0) {
        student.overallProgress = 0;
        await student.save();
        return res.json({
          message: "Quiz progress updated",
          overallPercent: 0,
        });
      }

      const units = await Unit.find({ subjectId: { $in: subjectIdArray } });
      const unitIds = units.map((u) => u._id.toString());

      const quizzes = await Quiz.find({ unitId: { $in: unitIds } });
      const unitHasQuiz = new Set(quizzes.map((q) => q.unitId.toString()));

      // Unique units and resource keys
      const uniqueUnitsMap = new Map();
      units.forEach((u) => {
        try {
          uniqueUnitsMap.set(u._id.toString(), u);
        } catch (e) {}
      });
      const uniqueUnits = Array.from(uniqueUnitsMap.values());

      const resourceKeySet = new Set();
      for (const u of uniqueUnits) {
        const uid = u._id.toString();
        (u.resources?.videos || []).forEach((v) => {
          const urlStr = String(v?.url ?? v ?? "");
          const key = `${uid}::video::${normalizeResourceUrl(urlStr)}`;
          resourceKeySet.add(key);
        });
        (u.resources?.pdfs || []).forEach((p) => {
          const urlStr = String(p?.url ?? p ?? "");
          const key = `${uid}::pdf::${normalizeResourceUrl(urlStr)}`;
          resourceKeySet.add(key);
        });
      }

      const quizUnitCount = unitHasQuiz.size;
      const totalItems = resourceKeySet.size + quizUnitCount;

      // Completed resources
      const resourceSet = new Set();
      (student.resourceProgress || []).forEach((r) => {
        try {
          const rUrl = normalizeResourceUrl(String(r.resourceUrl || ""));
          const key = `${r.unitId?.toString() || ""}::${
            r.resourceType || ""
          }::${rUrl || ""}`;
          resourceSet.add(key);
        } catch (e) {}
      });
      const completedResources = resourceSet.size;

      const quizSet = new Set();
      (student.quizProgress || []).forEach((q) => {
        try {
          quizSet.add(q.quizId?.toString());
        } catch (e) {}
      });
      const completedQuizzes = quizSet.size;

      let completedItems = completedResources + completedQuizzes;
      if (completedItems > totalItems) completedItems = totalItems;

      let overallPercent =
        totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
      if (overallPercent < 0) overallPercent = 0;
      if (overallPercent > 100) overallPercent = 100;

      student.overallProgress = overallPercent;
      await student.save();

      if (process.env.DEBUG_PROGRESS === "1") {
        console.log("[DEBUG_PROGRESS] updateQuizProgress ->", {
          userId: student._id.toString(),
          subjectCount: subjectIdArray.length,
          unitCount: uniqueUnits.length,
          totalItems,
          resourceKeyCount: resourceKeySet.size,
          completedResources,
          completedQuizzes,
          completedItems,
          overallPercent,
        });
      }

      return res.json({ message: "Quiz progress updated", overallPercent });
    } catch (e) {
      // If recompute fails, still return success for quiz save
      return res.json({ message: "Quiz progress updated" });
    }
  } catch (error) {
    console.error("Error updating quiz progress:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Log resource progress (video watched or pdf opened)
// @route   POST /api/student/resource-progress
// @access  Private (student)
exports.logResourceProgress = async (req, res) => {
  try {
    const { unitId, resourceType, resourceUrl } = req.body;
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Avoid duplicate logs for same resource (normalize URL for consistency)
    const normResourceUrl = normalizeResourceUrl(resourceUrl);
    const exists = (student.resourceProgress || []).some((r) => {
      try {
        const rUrl = normalizeResourceUrl(r.resourceUrl);
        return (
          r.unitId?.toString() === String(unitId) &&
          r.resourceType === resourceType &&
          (rUrl === normResourceUrl || (!rUrl && !normResourceUrl))
        );
      } catch (e) {
        return false;
      }
    });
    if (!exists) {
      student.resourceProgress.push({
        unitId,
        resourceType,
        resourceUrl: normResourceUrl,
        completedAt: new Date(),
      });
      await student.save();
    }

    // compute updated aggregated progress (robustly)
    const Unit = require("../models/Unit");
    const Quiz = require("../models/Quiz");

    await student.populate({
      path: "enrolledClasses",
      populate: { path: "subjects" },
    });

    // Build effective subject IDs for this student (respect explicit enrolledSubjects)
    const subjectIds = buildStudentSubjectIds(student);
    const subjectIdArray = Array.from(subjectIds);
    if (subjectIdArray.length === 0) {
      student.overallProgress = 0;
      await student.save();
      return res.json({
        message: "Resource progress logged",
        overallPercent: 0,
      });
    }

    const units = await Unit.find({ subjectId: { $in: subjectIdArray } });
    const unitIds = units.map((u) => u._id.toString());

    const quizzes = await Quiz.find({ unitId: { $in: unitIds } });
    const unitHasQuiz = new Set(quizzes.map((q) => q.unitId.toString()));

    // Ensure units are unique by id (defensive) and build a set of unique
    // resource keys across all units: unitId::type::normalizedUrl
    const uniqueUnitsMap = new Map();
    units.forEach((u) => {
      try {
        uniqueUnitsMap.set(u._id.toString(), u);
      } catch (e) {
        // ignore
      }
    });
    const uniqueUnits = Array.from(uniqueUnitsMap.values());

    const resourceKeySet = new Set();
    for (const u of uniqueUnits) {
      const uid = u._id.toString();
      (u.resources?.videos || []).forEach((v) => {
        const urlStr = String(v?.url ?? v ?? "");
        const key = `${uid}::video::${normalizeResourceUrl(urlStr)}`;
        resourceKeySet.add(key);
      });
      (u.resources?.pdfs || []).forEach((p) => {
        const urlStr = String(p?.url ?? p ?? "");
        const key = `${uid}::pdf::${normalizeResourceUrl(urlStr)}`;
        resourceKeySet.add(key);
      });
    }

    // Count units that have at least one quiz (one quiz count per unit)
    const quizUnitCount = unitHasQuiz.size;
    const totalItems = resourceKeySet.size + quizUnitCount;

    // Deduplicate student's logged resources into keys and count quizzes
    const resourceSet = new Set();
    (student.resourceProgress || []).forEach((r) => {
      try {
        const rUrl = normalizeResourceUrl(String(r.resourceUrl || ""));
        const key = `${r.unitId?.toString() || ""}::${r.resourceType || ""}::${
          rUrl || ""
        }`;
        resourceSet.add(key);
      } catch (e) {}
    });
    const completedResources = resourceSet.size;

    const quizSet = new Set();
    (student.quizProgress || []).forEach((q) => {
      try {
        quizSet.add(q.quizId?.toString());
      } catch (e) {}
    });
    const completedQuizzes = quizSet.size;

    let completedItems = completedResources + completedQuizzes;
    if (completedItems > totalItems) completedItems = totalItems;

    let overallPercent =
      totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
    if (overallPercent < 0) overallPercent = 0;
    if (overallPercent > 100) overallPercent = 100;

    student.overallProgress = overallPercent;
    await student.save();

    if (process.env.DEBUG_PROGRESS === "1") {
      console.log("[DEBUG_PROGRESS] logResourceProgress ->", {
        userId: student._id.toString(),
        subjectCount: subjectIdArray.length,
        unitCount: uniqueUnits.length,
        unitIds: uniqueUnits.map((u) => u._id?.toString()),
        totalItems,
        resourceKeyCount: resourceKeySet.size,
        completedResources,
        completedQuizzes,
        completedItems,
        overallPercent,
      });
    }

    return res.json({ message: "Resource progress logged", overallPercent });
  } catch (error) {
    console.error("Error logging resource progress:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get aggregated progress for the student
// @route   GET /api/student/progress
// @access  Private (student)
exports.getAggregatedProgress = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).populate({
      path: "enrolledClasses",
      populate: { path: "subjects" },
    });

    if (!student) return res.status(404).json({ message: "Student not found" });

    // Fetch units and quizzes for enrolled subjects to compute total items
    const Subject = require("../models/Subject");
    const Unit = require("../models/Unit");
    const Quiz = require("../models/Quiz");

    // Build effective subject IDs for this student (respect explicit enrolledSubjects)
    const subjectIds = buildStudentSubjectIds(student);
    // For each subject, get units
    const subjectIdArray = Array.from(subjectIds);
    if (subjectIdArray.length === 0) {
      // Nothing to compute
      student.overallProgress = 0;
      await student.save();
      return res.json({ overallPercent: 0, totalItems: 0, completedItems: 0 });
    }

    const units = await Unit.find({ subjectId: { $in: subjectIdArray } });
    const unitIds = units.map((u) => u._id.toString());

    // Batch quizzes
    const quizzes = await Quiz.find({ unitId: { $in: unitIds } });
    const unitHasQuiz = new Set(quizzes.map((q) => q.unitId.toString()));

    // Ensure units are unique by id (defensive) and build resource keys
    const uniqueUnitsMap = new Map();
    units.forEach((u) => {
      try {
        uniqueUnitsMap.set(u._id.toString(), u);
      } catch (e) {}
    });
    const uniqueUnits = Array.from(uniqueUnitsMap.values());

    const resourceKeySet = new Set();
    for (const u of uniqueUnits) {
      const uid = u._id.toString();
      (u.resources?.videos || []).forEach((v) => {
        const urlStr = String(v?.url ?? v ?? "");
        const key = `${uid}::video::${normalizeResourceUrl(urlStr)}`;
        resourceKeySet.add(key);
      });
      (u.resources?.pdfs || []).forEach((p) => {
        const urlStr = String(p?.url ?? p ?? "");
        const key = `${uid}::pdf::${normalizeResourceUrl(urlStr)}`;
        resourceKeySet.add(key);
      });
    }

    // Count units that have at least one quiz (one per unit)
    const quizUnitCount = unitHasQuiz.size;
    const totalItems = resourceKeySet.size + quizUnitCount;

    // Deduplicate student's logged resources into keys and count quizzes
    const resourceSet = new Set();
    (student.resourceProgress || []).forEach((r) => {
      try {
        const rUrl = normalizeResourceUrl(String(r.resourceUrl || ""));
        const key = `${r.unitId?.toString() || ""}::${r.resourceType || ""}::${
          rUrl || ""
        }`;
        resourceSet.add(key);
      } catch (e) {}
    });
    const completedResources = resourceSet.size;

    const quizSet = new Set();
    (student.quizProgress || []).forEach((q) => {
      try {
        quizSet.add(q.quizId?.toString());
      } catch (e) {}
    });
    const completedQuizzes = quizSet.size;

    let completedItems = completedResources + completedQuizzes;
    if (completedItems > totalItems) completedItems = totalItems;

    let overallPercent =
      totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
    if (overallPercent < 0) overallPercent = 0;
    if (overallPercent > 100) overallPercent = 100;

    // Optionally update cached overallProgress
    student.overallProgress = overallPercent;
    await student.save();

    if (process.env.DEBUG_PROGRESS === "1") {
      console.log("[DEBUG_PROGRESS] getAggregatedProgress ->", {
        userId: student._id.toString(),
        subjectCount: subjectIdArray.length,
        unitCount: uniqueUnits.length,
        totalItems,
        resourceKeyCount: resourceKeySet.size,
        completedResources,
        completedQuizzes,
        completedItems,
        overallPercent,
      });
    }

    res.json({ overallPercent, totalItems, completedItems });
  } catch (error) {
    console.error("Error computing aggregated progress:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get detailed progress tree for the student (class -> subject -> unit -> resources)
// @route   GET /api/student/progress-detailed
// @access  Private (student)
exports.getDetailedProgress = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id)
      .populate({ path: "enrolledClasses", populate: { path: "subjects" } })
      .populate("enrolledSubjects");

    if (!student) return res.status(404).json({ message: "Student not found" });

    // Build effective subject IDs for this student (respect explicit enrolledSubjects)
    const subjectIds = buildStudentSubjectIds(student);

    const Subject = require("../models/Subject");
    const Unit = require("../models/Unit");
    const Quiz = require("../models/Quiz");

    const subjectIdArray = Array.from(subjectIds);

    // Fetch all units for enrolled subjects
    const units = subjectIdArray.length
      ? await Unit.find({ subjectId: { $in: subjectIdArray } }).lean()
      : [];

    const unitIds = units.map((u) => u._id.toString());

    // Fetch quizzes for all these units in batch
    const quizzes = unitIds.length
      ? await Quiz.find({ unitId: { $in: unitIds } }).lean()
      : [];
    const quizzesByUnit = new Map();
    quizzes.forEach((q) => {
      const k = q.unitId ? q.unitId.toString() : null;
      if (!k) return;
      if (!quizzesByUnit.has(k)) quizzesByUnit.set(k, []);
      quizzesByUnit.get(k).push(q);
    });

    // Build sets of completed resources and quizzes for quick lookup
    const resourceSet = new Set();
    (student.resourceProgress || []).forEach((r) => {
      try {
        const rUrl = normalizeResourceUrl(r.resourceUrl);
        const key = `${r.unitId?.toString() || ""}::${r.resourceType || ""}::${
          rUrl || ""
        }`;
        resourceSet.add(key);
      } catch (e) {}
    });

    const completedQuizSet = new Set();
    (student.quizProgress || []).forEach((q) => {
      try {
        completedQuizSet.add(q.quizId?.toString());
      } catch (e) {}
    });

    // Helper to compute resource status
    const resourceStatus = (unitId, type, url) => {
      const key = `${unitId}::${type}::${normalizeResourceUrl(url || "")}`;
      return resourceSet.has(key) ? "completed" : "not-started";
    };

    // Prepare units map by subject
    const unitsBySubject = new Map();
    units.forEach((u) => {
      const sid = u.subjectId ? u.subjectId.toString() : null;
      if (!sid) return;
      if (!unitsBySubject.has(sid)) unitsBySubject.set(sid, []);
      unitsBySubject.get(sid).push(u);
    });

    // Build response tree
    const classesOut = (student.enrolledClasses || []).map((cls) => {
      const clsObj = {
        _id: cls._id ? cls._id.toString() : cls._id,
        name: cls.name,
        subjects: [],
      };
      const subjects = Array.isArray(cls.subjects) ? cls.subjects : [];
      for (const s of subjects) {
        const sid = s && s._id ? s._id.toString() : s.toString();
        const subj = {
          _id: sid ? sid.toString() : sid,
          name: s.name || s,
          units: [],
        };
        const susUnits = unitsBySubject.get(sid) || [];
        for (const u of susUnits) {
          const uid = u._id.toString();
          const resVideos = (u.resources?.videos || []).map((v) => ({
            type: "video",
            url: v.url || v,
            name: v.name || null,
            status: resourceStatus(uid, "video", v.url || v),
          }));
          const resPdfs = (u.resources?.pdfs || []).map((p) => ({
            type: "pdf",
            url: p.url || p,
            name: p.name || null,
            status: resourceStatus(uid, "pdf", p.url || p),
          }));

          // quiz handling: consider a unit may have multiple quizzes; treat unit quiz as completed if any quiz for the unit is completed
          const unitQuizzes = quizzesByUnit.get(uid) || [];
          let quizStatus = "not-started";
          if (unitQuizzes.length > 0) {
            const anyCompleted = unitQuizzes.some((q) =>
              completedQuizSet.has(q._id.toString())
            );
            quizStatus = anyCompleted ? "completed" : "not-started";
          } else {
            quizStatus = "not-applicable";
          }

          // Determine unit status
          const allResources = [...resVideos, ...resPdfs];
          let completedCount = allResources.filter(
            (r) => r.status === "completed"
          ).length;
          let totalCount =
            allResources.length + (unitQuizzes.length > 0 ? 1 : 0);
          if (unitQuizzes.length > 0 && quizStatus === "completed")
            completedCount += 1;
          let unitStatus = "not-started";
          if (totalCount === 0) unitStatus = "not-applicable";
          else if (completedCount === 0) unitStatus = "not-started";
          else if (completedCount >= totalCount) unitStatus = "completed";
          else unitStatus = "started";

          subj.units.push({
            _id: uid ? uid.toString() : uid,
            title: u.title,
            status: unitStatus,
            videos: resVideos,
            pdfs: resPdfs,
            hasQuiz: unitQuizzes.length > 0,
            quizStatus,
          });
        }

        // Determine subject status from units (ignore not-applicable units)
        const su = subj.units || [];
        const applicableUnits = su.filter(
          (uu) => uu.status !== "not-applicable"
        );
        if (applicableUnits.length === 0) subj.status = "not-applicable";
        else if (applicableUnits.every((uu) => uu.status === "completed"))
          subj.status = "completed";
        else if (
          applicableUnits.some(
            (uu) => uu.status === "started" || uu.status === "completed"
          )
        )
          subj.status = "started";
        else subj.status = "not-started";

        subj.unitCount = su.length;
        clsObj.subjects.push(subj);
      }

      // Determine class status from subjects (ignore not-applicable subjects)
      const cs = clsObj.subjects || [];
      const applicableSubjects = cs.filter(
        (s) => s.status !== "not-applicable"
      );
      if (applicableSubjects.length === 0) clsObj.status = "not-applicable";
      else if (applicableSubjects.every((s) => s.status === "completed"))
        clsObj.status = "completed";
      else if (
        applicableSubjects.some(
          (s) => s.status === "started" || s.status === "completed"
        )
      )
        clsObj.status = "started";
      else clsObj.status = "not-started";

      return clsObj;
    });

    res.json({ classes: classesOut });
  } catch (error) {
    console.error("Error computing detailed progress:", error);
    res.status(500).json({ message: "Server error" });
  }
};
