import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import { toast } from "react-hot-toast";
import "../styles/StudentProgress.css";

const StudentProgress = () => {
  const { auth } = useContext(AuthContext);
  const [progress, setProgress] = useState({
    overallPercent: 0,
    totalItems: 0,
    completedItems: 0,
  });
  const [quizHistory, setQuizHistory] = useState([]);

  const fetchProgress = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/student/progress`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setProgress(
        res.data || { overallPercent: 0, totalItems: 0, completedItems: 0 }
      );
    } catch (err) {
      toast.error("Failed to fetch progress");
    }
  };

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

  useEffect(() => {
    if (auth?.token) {
      fetchProgress();
      fetchQuizHistory();
    }

    const onStorage = (e) => {
      if (e.key === "student-progress-updated") {
        if (auth?.token) {
          fetchProgress();
          fetchQuizHistory();
        }
      }
    };

    const onCustom = (e) => {
      const provided = e?.detail?.overallPercent;
      if (auth?.token) {
        fetchProgress();
        fetchQuizHistory();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("student-progress-updated", onCustom);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("student-progress-updated", onCustom);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  return (
    <div className="student-progress-container">
      <h1>My Progress</h1>
      <div className="progress-panel">
        <div className="progress-summary">
          <strong>Overall Completion:</strong> {progress.overallPercent}%
        </div>
        <div>
          <strong>Items Completed:</strong> {progress.completedItems} /{" "}
          {progress.totalItems}
        </div>
        <div style={{ marginTop: 18 }}>
          <h3>Quiz Scores</h3>
          {quizHistory.length === 0 ? (
            <p>No quiz attempts yet.</p>
          ) : (
            <div className="quiz-table">
              <table>
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>Subject</th>
                    <th>Unit</th>
                    <th>Score</th>
                    <th>Date / Time</th>
                  </tr>
                </thead>
                <tbody>
                  {quizHistory.map((h, idx) => (
                    <tr key={idx}>
                      <td>{h.className || "N/A"}</td>
                      <td>{h.subjectName || "N/A"}</td>
                      <td>{h.unitTitle || "N/A"}</td>
                      <td>
                        {typeof h.score === "number"
                          ? `${h.score} / ${h.totalQuestions || "-"}`
                          : "N/A"}
                      </td>
                      <td>
                        {h.completedAt
                          ? new Date(h.completedAt).toLocaleString()
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentProgress;
