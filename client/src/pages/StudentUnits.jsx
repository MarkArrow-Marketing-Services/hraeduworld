import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "../styles/StudentUnits.css";

const StudentUnits = () => {
  const { auth } = useContext(AuthContext);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [progressTree, setProgressTree] = useState(null);
  const [playing, setPlaying] = useState({ url: null, name: null });
  const navigate = useNavigate();

  useEffect(() => {
    fetchEnrolledClasses();
    fetchDetailedProgress();
    const onProgress = () => fetchDetailedProgress();
    window.addEventListener("student-progress-updated", onProgress);
    const onStorage = (e) => {
      if (e.key === "student-progress-updated") fetchDetailedProgress();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("student-progress-updated", onProgress);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const fetchDetailedProgress = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/student/progress-detailed`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setProgressTree(res.data || null);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (selectedSubject) fetchUnits(selectedSubject);
  }, [selectedSubject]);

  const fetchEnrolledClasses = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/student/classes`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setClasses(res.data);
      // selection handled via sidebar navigation
    } catch (error) {
      toast.error("Failed to fetch classes");
    }
  };

  const fetchSubjects = async (classId) => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/subjects/${classId}`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setSubjects(res.data);
      if (res.data.length > 0) setSelectedSubject(res.data[0]._id);
    } catch (error) {
      toast.error("Failed to fetch subjects");
    }
  };

  const fetchUnits = async (subjectId) => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/units/${subjectId}`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      const unitsData = res.data || [];
      // For each unit, check if a quiz exists
      const quizChecks = await Promise.all(
        unitsData.map(async (u) => {
          try {
            const qres = await axios.get(
              `${import.meta.env.VITE_BACKEND_URL}/api/quizzes/${u._id}`,
              { headers: { Authorization: `Bearer ${auth.token}` } }
            );
            const qdata = qres.data;
            const hasQuiz = Array.isArray(qdata) ? qdata.length > 0 : !!qdata;
            // keep the primary quiz (most recent) on the unit for navigation
            const quizObj = Array.isArray(qdata)
              ? qdata[0] || null
              : qdata || null;
            return { ...u, hasQuiz, quiz: quizObj };
          } catch (e) {
            return { ...u, hasQuiz: false, quiz: null };
          }
        })
      );
      setUnits(quizChecks);
      if (quizChecks.length > 0) {
        // Prefer selecting the first unit that has a quiz, otherwise first unit
        const firstWithQuiz = quizChecks.find((u) => u.hasQuiz);
        setSelectedUnit(firstWithQuiz || quizChecks[0]);
      }
    } catch (error) {
      toast.error("Failed to fetch units");
    }
  };

  // Read query params for subjectId/classId (sidebar navigation will set these)
  const location = useLocation();
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const subjectId = q.get("subjectId");
    const classId = q.get("classId");
    if (classId) setSelectedClass(classId);
    if (subjectId) setSelectedSubject(subjectId);
  }, [location.search]);

  return (
    <div className="student-units-container">
      <h1>Your Units</h1>

      {/* Controls moved to left sidebar. Units page displays units for selected subject from sidebar navigation. */}

      <div className="unit-list">
        <h2>Units</h2>
        <ul>
          {units.map((unit) => (
            <li
              key={unit._id}
              className={`unit-item ${
                unit._id === selectedUnit?._id ? "selected" : ""
              }`}
              onClick={() => setSelectedUnit(unit)}
            >
              <div className="title-row">
                <span>{unit.title}</span>
                <span className="status-badge">
                  {progressTree?.classes
                    ?.flatMap((cc) => cc.subjects || [])
                    ?.flatMap((ss) => ss.units || [])
                    ?.find((uu) => uu._id === unit._id)?.status || ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {selectedUnit && (
        <div className="unit-detail">
          <h3>{selectedUnit.title}</h3>
          <p>{selectedUnit.description}</p>

          <div>
            <h4>Videos</h4>
            {selectedUnit.resources?.videos?.length === 0 ? (
              <p>No videos available</p>
            ) : (
              <ul>
                {selectedUnit.resources.videos.map((video, idx) => {
                  const status =
                    progressTree?.classes
                      ?.flatMap((cc) => cc.subjects || [])
                      ?.flatMap((ss) => ss.units || [])
                      ?.find(
                        (uu) => String(uu._id) === String(selectedUnit._id)
                      )
                      ?.videos?.find(
                        (v) => String(v.url || v) === String(video.url || video)
                      )?.status || "";
                  return (
                    <li key={idx} className="resource-row">
                      <button
                        className="resource-button"
                        onClick={() =>
                          setPlaying({
                            url: `${import.meta.env.VITE_BACKEND_URL}${
                              video.url || video
                            }`,
                            name: video.name || `Video ${idx + 1}`,
                          })
                        }
                      >
                        {video.name || `Video ${idx + 1}`}
                      </button>
                      <div
                        className="status-badge"
                        style={{
                          color:
                            status === "completed"
                              ? "green"
                              : status === "started"
                              ? "#ff9800"
                              : "#666",
                        }}
                      >
                        {status}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div>
            <h4>PDF Resources</h4>
            {selectedUnit.resources.pdfs?.length === 0 ? (
              <p>No PDFs available</p>
            ) : (
              selectedUnit.resources.pdfs.map((pdf, idx) => {
                const status =
                  progressTree?.classes
                    ?.flatMap((cc) => cc.subjects || [])
                    ?.flatMap((ss) => ss.units || [])
                    ?.find((uu) => String(uu._id) === String(selectedUnit._id))
                    ?.pdfs?.find(
                      (p) => String(p.url || p) === String(pdf.url || pdf)
                    )?.status || "";
                return (
                  <div key={idx} className="resource-row">
                    <button
                      className="resource-button"
                      onClick={async () => {
                        try {
                          const res = await axios.post(
                            `${
                              import.meta.env.VITE_BACKEND_URL
                            }/api/student/resource-progress`,
                            {
                              unitId: selectedUnit._id,
                              resourceType: "pdf",
                              resourceUrl: pdf.url || pdf,
                            },
                            {
                              headers: {
                                Authorization: `Bearer ${auth.token}`,
                              },
                            }
                          );
                          try {
                            const overallPercent = res.data?.overallPercent;
                            const ev = new CustomEvent(
                              "student-progress-updated",
                              { detail: { overallPercent } }
                            );
                            window.dispatchEvent(ev);
                            try {
                              localStorage.setItem(
                                "student-progress-updated",
                                String(Date.now())
                              );
                            } catch (e) {}
                          } catch (e) {}
                          window.open(
                            `${import.meta.env.VITE_BACKEND_URL}${
                              pdf.url || pdf
                            }`,
                            "_blank"
                          );
                        } catch (err) {}
                      }}
                    >
                      {pdf.name || `PDF ${idx + 1}`}
                    </button>
                    <div
                      className="status-badge"
                      style={{
                        color:
                          status === "completed"
                            ? "green"
                            : status === "started"
                            ? "#ff9800"
                            : "#666",
                      }}
                    >
                      {status}
                    </div>
                  </div>
                );
              })
            )}

            {/* Place Take Quiz button under PDFs */}
            <div className="mt-12">
              {selectedUnit.hasQuiz ? (
                <button
                  onClick={() => {
                    const quizId = selectedUnit.quiz?._id || "";
                    const q = quizId
                      ? `/student/quiz?unitId=${selectedUnit._id}&quizId=${quizId}`
                      : `/student/quiz?unitId=${selectedUnit._id}`;
                    navigate(q);
                  }}
                  className="take-quiz-btn"
                  disabled={selectedUnit.quiz?.enabled === false}
                  title={
                    selectedUnit.quiz?.enabled === false
                      ? "This quiz is currently disabled"
                      : "Take the quiz"
                  }
                >
                  Take Quiz
                </button>
              ) : (
                <div className="muted">No quiz for this unit</div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal player for videos */}
      {playing.url && (
        <div
          className="player-backdrop"
          onClick={() => setPlaying({ url: null, name: null })}
        >
          <div className="player-box" onClick={(e) => e.stopPropagation()}>
            <h4>{playing.name}</h4>
            <video
              className="player-video"
              controls
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
              onContextMenu={(e) => e.preventDefault()}
              onEnded={async () => {
                try {
                  const res = await axios.post(
                    `${
                      import.meta.env.VITE_BACKEND_URL
                    }/api/student/resource-progress`,
                    {
                      unitId: selectedUnit._id,
                      resourceType: "video",
                      resourceUrl: playing.url,
                    },
                    { headers: { Authorization: `Bearer ${auth.token}` } }
                  );
                  try {
                    const overallPercent = res.data?.overallPercent;
                    const ev = new CustomEvent("student-progress-updated", {
                      detail: { overallPercent },
                    });
                    window.dispatchEvent(ev);
                    try {
                      localStorage.setItem(
                        "student-progress-updated",
                        String(Date.now())
                      );
                    } catch (e) {}
                  } catch (e) {}
                } catch (err) {}
              }}
            >
              <source src={playing.url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div style={{ textAlign: "right", marginTop: 8 }}>
              <button onClick={() => setPlaying({ url: null, name: null })}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentUnits;
