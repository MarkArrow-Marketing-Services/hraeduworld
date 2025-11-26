import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import AdminLayout from "../components/AdminLayout";
import "../styles/AdminDashboard.css";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
// Using CDN script tags in `index.html` to provide `html2canvas` and `jspdf` as globals

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

  const generatePdf = async () => {
    try {
      // Use the globals provided by the CDN scripts
      const html2canvasLib =
        window.html2canvas || window.html2canvas_default || window.html2canvas;
      const jsPDFConstructor =
        (window.jspdf && window.jspdf.jsPDF) ||
        window.jsPDF ||
        (window.jspdf && window.jspdf.default && window.jspdf.default.jsPDF);
      if (!html2canvasLib) return toast.error("html2canvas not found");
      if (!jsPDFConstructor) return toast.error("jsPDF not found");

      // Build a clean, plain HTML report to avoid style/visibility issues
      const reportWidthPx = 900;
      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-9999px";
      wrapper.style.top = "0";
      wrapper.style.width = `${reportWidthPx}px`;
      wrapper.style.background = "#ffffff";
      wrapper.style.color = "#000000";
      wrapper.style.padding = "24px";
      wrapper.style.fontFamily = "Arial, Helvetica, sans-serif";
      wrapper.style.fontSize = "14px";
      wrapper.style.lineHeight = "1.3";
      wrapper.style.zIndex = "10000";

      const headerHtml = `
        <div style="text-align:center;margin-bottom:12px;">
          <h1 style="margin:0;font-size:20px;color:#444;">Hetvika Remidial Academy</h1>
          <div style="font-weight:600;margin-top:4px;">Improvement Gaurenteed</div>
          <div style="color:#444;margin-top:4px;font-size:12px;">student development and improvement centre</div>
        </div>
      `;

      const studentName =
        selectedStudent?.name || selectedStudent?.email || "Student";
      const overall =
        studentProgress?.overallPercent ??
        selectedStudent?.overallProgress ??
        0;
      const completed = studentProgress?.completedItems ?? "-";
      const totalItems = studentProgress?.totalItems ?? "-";

      let quizRows = "";
      if (!studentQuizHistory || studentQuizHistory.length === 0) {
        quizRows = `<tr><td colspan="5" style="padding:8px;text-align:center;color:#666">No quiz attempts yet.</td></tr>`;
      } else {
        quizRows = studentQuizHistory
          .map((h) => {
            const date = h.completedAt
              ? new Date(h.completedAt).toLocaleString()
              : "";
            const score =
              typeof h.score === "number"
                ? `${h.score} / ${h.totalQuestions || "-"} `
                : "N/A";
            return `<tr>
              <td style="padding:8px;border:1px solid #ddd">${
                h.className || "N/A"
              }</td>
              <td style="padding:8px;border:1px solid #ddd">${
                h.subjectName || "N/A"
              }</td>
              <td style="padding:8px;border:1px solid #ddd">${
                h.unitTitle || "N/A"
              }</td>
              <td style="padding:8px;border:1px solid #ddd">${score}</td>
              <td style="padding:8px;border:1px solid #ddd">${date}</td>
            </tr>`;
          })
          .join("");
      }

      const bodyHtml = `
        <div style="text-align:center;margin-bottom:12px;margin-top:50px;">
          <h2 style="margin:0 0 8px 0;font-size:16px;color:#444">${studentName} — Progress Report</h2>
          <div  style="margin-top:50px;"><strong>Overall Completion:</strong> ${overall}%</div>
          <div><strong>Items Completed:</strong> ${completed} / ${totalItems}</div>
        </div>

        <div style="margin-top:12px;">
          <h3 style="margin:0 0 8px 0;font-size:15px; color:#444">Quiz Scores</h3>
          <table style="width:100%;border-collapse:collapse;border:1px solid #ddd">
            <thead>
              <tr>
                <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Grade</th>
                <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Subject</th>
                <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Unit</th>
                <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Score</th>
                <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5">Date / Time</th>
              </tr>
            </thead>
            <tbody>
              ${quizRows}
            </tbody>
          </table>
        </div>

        <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:center;">
          <div style="text-align:center;flex:1">
            <div style="margin-bottom:24px">_____________________</div>
            <div>Mentor Signature</div>
          </div>
          <div style="text-align:center;flex:1">
            <div style="margin-bottom:24px">_____________________</div>
            <div>Parent Signature</div>
          </div>
        </div>

        <div style="text-align:center;margin-top:12px;color:#666">Hetvika Remidial Academy, 12 Rosewood Lane, Springfield, 560001</div>
      `;

      wrapper.innerHTML = headerHtml + bodyHtml;
      document.body.appendChild(wrapper);

      // Render the wrapper to canvas
      const canvas = await html2canvasLib(wrapper, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");

      // Clean up the temporary node
      if (wrapper && wrapper.parentNode)
        wrapper.parentNode.removeChild(wrapper);

      // Create PDF and add image; handle multi-page if needed
      const pdf = new jsPDFConstructor("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight();

      if (pdfHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      } else {
        // Split into slices per page
        const pxPerMm = canvas.width / pdfWidth;
        let y = 0;
        while (y < canvas.height) {
          const sliceHeightPx = Math.min(
            canvas.height - y,
            Math.floor(pageHeight * pxPerMm)
          );
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceHeightPx;
          const sctx = sliceCanvas.getContext("2d");
          sctx.drawImage(
            canvas,
            0,
            y,
            canvas.width,
            sliceHeightPx,
            0,
            0,
            canvas.width,
            sliceHeightPx
          );
          const sliceData = sliceCanvas.toDataURL("image/png");
          const sliceImgProps = pdf.getImageProperties(sliceData);
          const slicePdfHeight =
            (sliceImgProps.height * pdfWidth) / sliceImgProps.width;
          pdf.addImage(sliceData, "PNG", 0, 0, pdfWidth, slicePdfHeight);
          y += sliceHeightPx;
          if (y < canvas.height) pdf.addPage();
        }
      }

      const filename = `${(selectedStudent?.name || "student").replace(
        /\s+/g,
        "_"
      )}_report.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error("generatePdf error:", err);
      toast.error(`Failed to generate PDF: ${err?.message || err}`);
    }
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
            <div className="academy-header">
              <h1 className="academy-title">Hetvika Remidial Academy</h1>
              <p className="academy-tagline">Improvement Gaurenteed</p>
              <p className="academy-subtag">
                student development and improvement centre
              </p>
            </div>

            <div className="modal-header">
              <h2>
                {selectedStudent.name || selectedStudent.email} — Progress
              </h2>
              <div className="modal-header-actions">
                <button onClick={generatePdf} className="download-btn">
                  Download Report
                </button>
                <button onClick={closeModal} className="close-btn">
                  ✕
                </button>
              </div>
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

            <div className="modal-footer">
              <div className="signatures">
                <div className="signature-block">
                  <div className="signature-line">_____________________</div>
                  <div className="signature-label">Mentor Signature</div>
                </div>

                <div className="signature-block">
                  <div className="signature-line">_____________________</div>
                  <div className="signature-label">Parent Signature</div>
                </div>
              </div>

              <div className="academy-address">
                Hetvika Remidial Academy, 12 Rosewood Lane, Springfield, 560001
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
