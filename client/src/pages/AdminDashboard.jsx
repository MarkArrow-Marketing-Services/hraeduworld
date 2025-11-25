import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import AdminLayout from "../components/AdminLayout";
import "../styles/AdminDashboard.css";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const { auth } = useContext(AuthContext);
  const [stats, setStats] = useState({});
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProgress, setStudentProgress] = useState(null);
  const [studentQuizHistory, setStudentQuizHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchStudents();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/stats`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setStats(res.data);
    } catch {
      toast.error("Failed to load stats");
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/students`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      const onlyStudents = (res.data || []).filter((u) => u.role === "student");
      setStudents(onlyStudents);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch students");
    }
  };

  const onSelectStudent = async (s) => {
    setSelectedStudent(s);
    setStudentProgress(null);
    setStudentQuizHistory([]);
    try {
      const [pRes, qRes] = await Promise.all([
        axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/admin/students/${
            s._id
          }/progress`,
          { headers: { Authorization: `Bearer ${auth.token}` } }
        ),
        axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/admin/students/${
            s._id
          }/quiz-history`,
          { headers: { Authorization: `Bearer ${auth.token}` } }
        ),
      ]);
      setStudentProgress(pRes.data || null);
      setStudentQuizHistory(qRes.data || []);
    } catch {
      toast.error("Failed to fetch student progression");
    }
  };

  const closeModal = () => {
    setSelectedStudent(null);
    setStudentProgress(null);
    setStudentQuizHistory([]);
  };

  return (
    <AdminLayout>
      <div className="dashboard-container">
        <h1 className="dashboard-title">Admin Dashboard</h1>

        {/* --- Stats Section --- */}
        <div className="dashboard-grid">
          {[
            ["Total Students", stats.totalStudents],
            ["Total Admins", stats.totalAdmins],
            ["Total Classes", stats.totalClasses],
            ["Total Subjects", stats.totalSubjects],
            ["Total Units", stats.totalUnits],
            ["Total Videos", stats.totalVideos],
            ["Total PDFs", stats.totalPdfs],
            ["Total Quizzes", stats.totalQuizzes],
          ].map(([label, value], idx) => (
            <div className="stat-card" key={idx}>
              <h3>{label}</h3>
              <p>{value || 0}</p>
            </div>
          ))}
        </div>

        {/* --- Students Section --- */}
        <div className="students-panel">
          <div className="students-list">
            <h3>Students</h3>
            <input
              className="student-search"
              placeholder="Search students by name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {students.length === 0 ? (
              <p className="muted-text">No students found</p>
            ) : (
              <ul className="student-list-ul">
                {students
                  .filter((s) => {
                    const q = searchQuery.trim().toLowerCase();
                    return (
                      !q ||
                      s.name?.toLowerCase().includes(q) ||
                      s.email?.toLowerCase().includes(q)
                    );
                  })
                  .map((s) => (
                    <li key={s._id}>
                      <button
                        className="student-btn"
                        onClick={() => onSelectStudent(s)}
                      >
                        <span className="student-name">
                          {s.name || s.email}
                        </span>
                        <span className="student-progress">
                          {s.overallProgress || 0}% complete
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* --- Student Modal --- */}
      {selectedStudent && (
        <>
          <div className="modal-backdrop" onClick={closeModal} />
          <div className="modal-card">
            <div className="modal-header">
              <h2>
                {selectedStudent.name || selectedStudent.email} — Progress
              </h2>
              <button onClick={closeModal} className="close-btn">
                ✕
              </button>
            </div>

            <div className="modal-content">
              <p>
                <strong>Overall Completion:</strong>{" "}
                {studentProgress?.overallPercent ??
                  selectedStudent.overallProgress ??
                  0}
                %
              </p>
              <p>
                <strong>Items Completed:</strong>{" "}
                {studentProgress?.completedItems ?? "-"} /{" "}
                {studentProgress?.totalItems ?? "-"}
              </p>

              <h3 className="modal-subtitle">Quiz Scores</h3>
              {studentQuizHistory.length === 0 ? (
                <p className="muted-text">No quiz attempts yet.</p>
              ) : (
                <div className="table-container">
                  <table className="quiz-table">
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
                      {studentQuizHistory.map((h, idx) => (
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
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
