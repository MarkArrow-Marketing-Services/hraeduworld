import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import AdminLayout from "../components/AdminLayout";
import "../styles/AdminStudentProgress.css";
import { toast } from "react-hot-toast";

const AdminStudentProgress = () => {
  const { auth } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detailed, setDetailed] = useState(null);
  const [quizHistory, setQuizHistory] = useState([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(
        "https://hraeduworld-backend.onrender.com/api/admin/students",
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setStudents(res.data || []);
    } catch (err) {
      toast.error("Failed to fetch students");
    }
  };

  const onSelect = async (s) => {
    setSelected(s);
    setDetailed(null);
    setQuizHistory([]);
    try {
      const [dRes, qRes] = await Promise.all([
        axios.get(
          `https://hraeduworld-backend.onrender.com/api/admin/students/${s._id}/progress`,
          {
            headers: { Authorization: `Bearer ${auth.token}` },
          }
        ),
        axios.get(
          `https://hraeduworld-backend.onrender.com/api/admin/students/${s._id}/quiz-history`,
          {
            headers: { Authorization: `Bearer ${auth.token}` },
          }
        ),
      ]);
      setDetailed(dRes.data);
      setQuizHistory(qRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch student activity");
    }
  };

  return (
    <AdminLayout>
      <h1>Student Activity</h1>+{" "}
      <div className="student-activity">
        <div className="left">
          <h3>Students</h3>+{" "}
          {students.length === 0 ? (
            <p>No students found</p>
          ) : (
            <ul className="student-list">
              +{" "}
              {students.map((s) => (
                <li key={s._id} style={{ marginBottom: 8 }}>
                  <button onClick={() => onSelect(s)} style={{ width: "100%" }}>
                    {s.name || s.email}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        +
        <div className="right">
          {selected ? (
            <div>
              <h3>Activity for {selected.name || selected.email}</h3>
              <div>
                <h4>Detailed Progress</h4>
                {detailed ? (
                  <pre style={{ whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(detailed, null, 2)}
                  </pre>
                ) : (
                  <p>Loading...</p>
                )}
              </div>

              <div style={{ marginTop: 12 }}>
                <h4>Quiz History</h4>
                {quizHistory.length === 0 ? (
                  <p>No quiz attempts found</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: 8 }}>Quiz</th>
                        <th style={{ textAlign: "left", padding: 8 }}>Unit</th>
                        <th style={{ textAlign: "left", padding: 8 }}>Score</th>
                        <th style={{ textAlign: "left", padding: 8 }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizHistory.map((h, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: 8 }}>{h.quizName || "-"}</td>
                          <td style={{ padding: 8 }}>{h.unitTitle || "-"}</td>
                          <td style={{ padding: 8 }}>
                            {typeof h.score === "number"
                              ? `${h.score} / ${h.totalQuestions || "-"}`
                              : "-"}
                          </td>
                          <td style={{ padding: 8 }}>
                            {h.completedAt
                              ? new Date(h.completedAt).toLocaleString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <p>Select a student to view activity</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminStudentProgress;
