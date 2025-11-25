import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosConfig";
import AuthContext from "../context/AuthContext";
import "../styles/StudentSidebar.css";

/*
  StudentSidebar
  - Preserves all original fetching logic and navigation behavior.
  - Adds a responsive mobile drawer with an accessible toggle (so the sidebar works like a mobile app panel).
  - Keeps expand/collapse behavior for classes and existing navigation to units.
*/
const StudentSidebar = () => {
  const [classes, setClasses] = useState([]);
  const [progressTree, setProgressTree] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [mobileOpen, setMobileOpen] = useState(false); // controls mobile drawer visibility
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get("/api/student/classes");
        const classesWithSubjects = res.data || [];

        for (const c of classesWithSubjects) {
          if (
            !c.subjects ||
            !Array.isArray(c.subjects) ||
            c.subjects.length === 0 ||
            (Array.isArray(c.subjects) && c.subjects.some((s) => !(s && s._id)))
          ) {
            try {
              const sres = await axios.get(`/api/subjects/${c._id}`);
              c.subjects = sres.data || [];
            } catch (e) {
              c.subjects = [];
            }
          }

          for (const s of c.subjects) {
            const sid = s && (s._id || s.id);
            if (!sid) {
              s.unitCount = 0;
              continue;
            }
            try {
              const ures = await axios.get(`/api/units/${sid}`);
              s.unitCount = Array.isArray(ures.data) ? ures.data.length : 0;
            } catch (e) {
              s.unitCount = 0;
            }
          }
        }

        setClasses(classesWithSubjects);

        try {
          const pres = await axios.get("/api/student/progress-detailed");
          setProgressTree(pres.data || null);
        } catch (e) {
          // non-critical: keep progressTree null if request fails
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching enrolled classes:", err);
        setClasses([]);
        setLoading(false);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to fetch classes"
        );
      }
    };
    if (auth.token) fetch();
  }, [auth.token]);

  // Refresh progress when student updates progress (quizzes, resources, etc.)
  useEffect(() => {
    const refreshProgress = async () => {
      try {
        const pres = await axios.get("/api/student/progress-detailed");
        setProgressTree(pres.data || null);
      } catch (e) {
        console.error("Error refreshing progress:", e);
      }
    };

    // Listen for custom events fired from other components when progress updates
    window.addEventListener("student-progress-updated", refreshProgress);

    // Listen for localStorage changes (for cross-tab updates)
    const onStorage = (e) => {
      if (e.key === "student-progress-updated") {
        refreshProgress();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("student-progress-updated", refreshProgress);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // toggle expand for class row
  const toggleExpand = (id) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  // mobile close handler (also used when navigating)
  const handleNavigate = (path) => {
    navigate(path);
    // if viewing on mobile, close drawer to create mobile-app style UX
    setMobileOpen(false);
  };

  return (
    <>
      {/* MOBILE: Floating button to open sidebar on small screens */}
      <button
        className="mobile-sidebar-toggle"
        aria-label={
          mobileOpen ? "Close classes sidebar" : "Open classes sidebar"
        }
        onClick={() => setMobileOpen((v) => !v)}
      >
        <span className="icon">📚</span>
        <span className="label">Classes</span>
      </button>

      {/* Overlay for mobile when drawer is open */}
      <div
        className={`mobile-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />

      {/* Desktop / Drawer aside */}
      <aside
        className={`student-sidebar ${mobileOpen ? "mobile-open" : ""}`}
        aria-hidden={false}
      >
        <div
          className="sidebar-inner"
          role="navigation"
          aria-label="Enrolled classes"
        >
          <div className="sidebar-header">
            <h4 className="title">Enrolled Classes</h4>
            {/* close button visible on mobile drawer */}
            <button
              className="close-btn"
              onClick={() => setMobileOpen(false)}
              aria-label="Close sidebar"
            >
              &times;
            </button>
          </div>

          {/* Loading / Error / Empty states */}
          {loading && <div className="muted state">Loading classes...</div>}
          {!loading && error && (
            <div className="error state">Error: {error}</div>
          )}
          {!loading && !error && classes.length === 0 && (
            <div className="muted state">No classes enrolled</div>
          )}

          {/* Class list */}
          <div className="class-list">
            {classes.map((c) => {
              const classStatus =
                progressTree?.classes?.find(
                  (cc) => String(cc._id) === String(c._id)
                )?.status || "";
              const isExpanded = !!expanded[c._id];

              return (
                <div key={c._id} className="class-row">
                  {/* main clickable area toggles expansion */}
                  <button
                    className="class-main"
                    onClick={() => toggleExpand(c._id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="class-left">
                      <div className="class-title">{c.name}</div>
                      <div className="class-status muted small">
                        {classStatus}
                      </div>
                    </div>
                    <div
                      className={`chevron ${isExpanded ? "expanded" : ""}`}
                      aria-hidden="true"
                    >
                      {/* chevron uses rotation animation */}▶
                    </div>
                  </button>

                  {/* subject list — keeps original navigation logic */}
                  {isExpanded && (
                    <div
                      className="subject-list"
                      role="group"
                      aria-label={`${c.name} subjects`}
                    >
                      {(c.subjects || []).length === 0 && (
                        <div className="muted small no-subjects">
                          No subjects
                        </div>
                      )}
                      {(c.subjects || []).map((s) => {
                        const subjStatus =
                          progressTree?.classes
                            ?.find((cc) => String(cc._id) === String(c._id))
                            ?.subjects?.find(
                              (ss) => String(ss._id) === String(s._id)
                            )?.status || "";

                        return (
                          <div
                            key={s._id || s.id || s.name}
                            className="subject-row"
                          >
                            <button
                              className="subject-btn"
                              onClick={() =>
                                handleNavigate(
                                  `/student/units?subjectId=${s._id}&classId=${c._id}`
                                )
                              }
                            >
                              {/* subject label */}
                              <span className="subject-name">{s.name}</span>
                              {/* unit count badge */}
                              <span className="unit-badge" aria-hidden="true">
                                {s.unitCount ? `${s.unitCount}` : "0"}
                              </span>
                            </button>

                            <div className="subject-meta">
                              <div className="muted small">{subjStatus}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
};

export default StudentSidebar;
