import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import "../styles/StudentDashboard.css";

const StudentDashboard = () => {
  const { auth } = useContext(AuthContext);
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [progressTree, setProgressTree] = useState(null);
  const [viewingClass, setViewingClass] = useState(null);
  const [classSubjects, setClassSubjects] = useState([]);
  const [quizHistory, setQuizHistory] = useState([]);
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    fetchEnrolledClasses();
    fetchQuizHistory();
    fetchProfile();
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

  const fetchProfile = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/student/profile`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setStudentName(res.data?.name || res.data?.username || "Student");
    } catch (err) {
      // ignore
    }
  };

  const fetchEnrolledClasses = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/student/classes`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setEnrolledClasses(res.data);
    } catch (error) {
      toast.error("Failed to fetch enrolled classes");
    }
  };

  const navigate = useNavigate();

  const fetchQuizHistory = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/student/quiz-history`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setQuizHistory(res.data || []);
    } catch (err) {
      console.warn("Failed to fetch quiz history", err?.message || err);
    }
  };

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

  const handleExplore = (classId) => {
    const cls = enrolledClasses.find((c) => c._id === classId);
    setViewingClass(cls || null);
    fetchSubjectsForClass(classId);
  };

  const fetchSubjectsForClass = async (classId) => {
    try {
      let subjects = [];
      const cls = enrolledClasses.find((c) => c._id === classId);

      if (cls && Array.isArray(cls.subjects) && cls.subjects.length > 0) {
        if (cls.subjects[0] && cls.subjects[0]._id) {
          subjects = cls.subjects;
        } else {
          const allRes = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/subjects/${classId}`,
            { headers: { Authorization: `Bearer ${auth.token}` } }
          );
          const allSubjects = allRes.data || [];
          const allowed = new Set(cls.subjects.map((s) => (s._id ? s._id : s)));
          subjects = allSubjects.filter((s) => allowed.has(s._id));
        }
      } else {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/subjects/${classId}`,
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
        subjects = res.data || [];
      }

      const withCounts = await Promise.all(
        subjects.map(async (s) => {
          try {
            const ures = await axios.get(
              `${import.meta.env.VITE_BACKEND_URL}/api/units/${s._id}`,
              { headers: { Authorization: `Bearer ${auth.token}` } }
            );
            return {
              ...s,
              unitCount: Array.isArray(ures.data) ? ures.data.length : 0,
            };
          } catch (e) {
            return { ...s, unitCount: 0 };
          }
        })
      );
      setClassSubjects(withCounts);
    } catch (err) {
      toast.error("Failed to fetch subjects for class");
      setClassSubjects([]);
    }
  };

  return (
    <div className="student-dashboard-container">
      <h1 className="dashboard-title">
        Welcome, {studentName} {"\u{1F389}"} {"\u{1F4DA}"}
      </h1>

      <h2 className="section-title">Your Enrolled Classes</h2>

      <div className="class-cards">
        {enrolledClasses.length === 0 ? (
          <p className="no-data-text">
            You are not enrolled in any classes yet.
          </p>
        ) : (
          enrolledClasses.map((cls) => (
            <div key={cls._id} className="class-card">
              <div className="class-name">{cls.name}</div>
              <div className="class-info">
                Subjects: {(cls.subjects || []).length}
              </div>
              <div className="class-status">
                {progressTree?.classes?.find(
                  (cc) => String(cc._id) === String(cls._id)
                )?.status || ""}
              </div>
              <div className="class-actions">
                <button
                  className="explore-btn"
                  onClick={() => handleExplore(cls._id)}
                >
                  Explore
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {viewingClass && (
        <div className="subject-section">
          <h2 className="section-title">Subjects in {viewingClass.name}</h2>
          {classSubjects.length === 0 ? (
            <p className="no-data-text">No subjects assigned.</p>
          ) : (
            <div className="subject-cards">
              {classSubjects.map((s) => (
                <div key={s._id} className="subject-card">
                  <div className="subject-name">{s.name}</div>
                  <div className="subject-info">
                    Units: {s.unitCount || "-"}
                  </div>
                  <div className="subject-actions">
                    <button
                      className="explore-btn"
                      onClick={() =>
                        navigate(
                          `/student/units?subjectId=${s._id}&classId=${viewingClass._id}`
                        )
                      }
                    >
                      Explore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
