import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import { toast } from "react-hot-toast";
import "../styles/AddStudent.css";
import "../styles/theme.css";

const AddStudent = () => {
  const { auth } = useContext(AuthContext);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [schoolName, setSchoolName] = useState("");
  const [classes, setClasses] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [editRole, setEditRole] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({
    name: "",
    email: "",
    schoolName: "",
  });
  const [editSelectedClasses, setEditSelectedClasses] = useState([]);
  const [editSelectedSubjects, setEditSelectedSubjects] = useState([]);

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await axios.get(
        "https://hraeduworld-backend.onrender.com/api/classes",
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setClasses(res.data);
    } catch {
      toast.error("Failed to fetch classes");
    }
  };

  const fetchSubjectsForClass = async (classId) => {
    try {
      const res = await axios.get(
        `https://hraeduworld-backend.onrender.com/api/subjects/${classId}`,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      return res.data;
    } catch {
      return [];
    }
  };

  const toggleClass = (classId) => {
    setSelectedClasses((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  };

  const toggleSubject = (subjectId) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  // Edit-mode handlers (separate state from create-mode)
  const toggleEditClass = (classId) => {
    setEditSelectedClasses((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  };

  const toggleEditSubject = (subjectId) => {
    setEditSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleEditClassToggleWithSubjects = async (classId) => {
    const nowChecked = !editSelectedClasses.includes(classId);
    toggleEditClass(classId);
    if (!nowChecked) {
      try {
        const subs = await fetchSubjectsForClass(classId);
        const subIds = subs.map((s) => s._id);
        setEditSelectedSubjects((prev) =>
          prev.filter((id) => !subIds.includes(id))
        );
      } catch {}
    }
  };

  const handleClassToggleWithSubjects = async (classId) => {
    const nowChecked = !selectedClasses.includes(classId);
    toggleClass(classId);
    if (!nowChecked) {
      try {
        const subs = await fetchSubjectsForClass(classId);
        const subIds = subs.map((s) => s._id);
        setSelectedSubjectIds((prev) =>
          prev.filter((id) => !subIds.includes(id))
        );
      } catch {}
    }
  };

  const calculatePasswordStrength = (pw) => {
    if (!pw) return { score: 0, label: "Too short", color: "#ccc" };

    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    const labels = ["Too short", "Very weak", "Weak", "Good", "Strong"];
    const colors = ["#ccc", "#ff4d4f", "#ff7a45", "#ffc53d", "#52c41a"];

    return {
      score: Math.min(score, 4),
      label: labels[Math.min(score, 4)],
      color: colors[Math.min(score, 4)],
    };
  };

  const getPasswordConditions = (pw) => ({
    min8: pw?.length >= 8,
    min12: pw?.length >= 12,
    upperAndLower: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    hasNumber: /[0-9]/.test(pw),
    hasSpecial: /[^A-Za-z0-9]/.test(pw),
  });

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!fullName || !email || !password) {
      return toast.error("Please fill all required fields.");
    }
    if (role === "student" && !schoolName.trim()) {
      return toast.error("Please enter the school name.");
    }
    if (role === "student" && selectedClasses.length === 0) {
      return toast.error("Please assign at least one class.");
    }

    const strength = calculatePasswordStrength(password);
    if (strength.score < 3) {
      return toast.error(
        `Password is too weak (${strength.label}). Please choose a stronger password.`
      );
    }

    try {
      const payload = {
        fullName,
        email,
        password,
        role,
        schoolName,
        classIds: selectedClasses,
        subjectIds: selectedSubjectIds,
      };
      await axios.post(
        "https://hraeduworld-backend.onrender.com/api/admin/create-user",
        payload,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      toast.success(
        `${
          role === "admin" ? "Admin" : "Student"
        } account successfully created.`
      );
      setFullName("");
      setEmail("");
      setPassword("");
      setSchoolName("");
      setSelectedClasses([]);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create account");
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get(
        "https://hraeduworld-backend.onrender.com/api/admin/users",
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setStudentsList(res.data || []);
    } catch {
      toast.error("Failed to fetch students");
    }
  };

  const startEdit = (s) => {
    setEditingId(s._id);
    setEditRole(s.role || "student");
    setEditValues({
      name: s.name || "",
      email: s.email || "",
      schoolName: s.schoolName || "",
    });
    setEditSelectedClasses((s.enrolledClasses || []).map((c) => c._id));
    setEditSelectedSubjects((s.enrolledSubjects || []).map((sub) => sub._id));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ name: "", email: "" });
    setEditSelectedClasses([]);
    setEditSelectedSubjects([]);
    setEditRole(null);
  };

  const saveEdit = async (id) => {
    try {
      const payload = {
        name: editValues.name,
        email: editValues.email,
        schoolName: editValues.schoolName,
        enrolledClasses: editSelectedClasses,
        enrolledSubjects: editSelectedSubjects,
      };

      const url =
        editRole === "admin"
          ? `https://hraeduworld-backend.onrender.com/api/admin/admins/${id}`
          : `https://hraeduworld-backend.onrender.com/api/admin/students/${id}`;

      await axios.put(url, payload, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      toast.success(editRole === "admin" ? "Admin updated" : "Student updated");
      cancelEdit();
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update user");
    }
  };

  const removeStudent = async (id, role) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      const url =
        role === "admin"
          ? `https://hraeduworld-backend.onrender.com/api/admin/admins/${id}`
          : `https://hraeduworld-backend.onrender.com/api/admin/students/${id}`;

      await axios.delete(url, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      toast.success("User deleted");
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete user");
    }
  };

  return (
    <div className="add-student-container container">
      <div className="card">
        <h2>Add New User</h2>
        <form onSubmit={handleCreate} className="add-student-form">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter full name"
            required
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            type="email"
            required
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            type="password"
            required
          />

          {/* Password Strength */}
          {password && (
            <div className="password-meter">
              {(() => {
                const s = calculatePasswordStrength(password);
                return (
                  <>
                    <div
                      style={{
                        height: 8,
                        background: "#eee",
                        borderRadius: 4,
                      }}
                    >
                      <div
                        style={{
                          width: `${(s.score / 4) * 100}%`,
                          height: 8,
                          background: s.color,
                          borderRadius: 4,
                        }}
                      />
                    </div>
                    <small style={{ color: s.color }}>{s.label}</small>
                  </>
                );
              })()}
            </div>
          )}

          {/* Password conditions */}
          <div className="password-conditions">
            {(() => {
              const c = getPasswordConditions(password);
              const item = (ok, text) => (
                <div className="condition-item">
                  <span style={{ color: ok ? "#52c41a" : "#999" }}>
                    {ok ? "✓" : "✗"}
                  </span>
                  <span>{text}</span>
                </div>
              );
              return (
                <>
                  {item(c.min8, "At least 8 characters")}
                  {item(c.min12, "12+ characters (recommended)")}
                  {item(c.upperAndLower, "Upper and lowercase letters")}
                  {item(c.hasNumber, "At least one number")}
                  {item(c.hasSpecial, "At least one special character")}
                </>
              );
            })()}
          </div>

          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="admin">Admin</option>
            <option value="student">Student</option>
          </select>

          {role === "student" && (
            <>
              <input
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Enter school name"
                required
              />
              <div className="class-assign">
                <h4>Assign Classes & Subjects</h4>
                {classes.map((c) => (
                  <div key={c._id} className="class-item">
                    <label className="class-left">
                      <span className="class-chip">
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(c._id)}
                          onChange={() => handleClassToggleWithSubjects(c._id)}
                        />
                        <strong>{c.name}</strong>
                      </span>
                    </label>
                    <div className="subject-list">
                      {c.subjects?.length ? (
                        c.subjects.map((s) => (
                          <label key={s._id} className="subject-item">
                            <input
                              type="checkbox"
                              checked={selectedSubjectIds.includes(s._id)}
                              onChange={() => toggleSubject(s._id)}
                            />
                            {s.name}
                          </label>
                        ))
                      ) : (
                        <small>No subjects</small>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <button type="submit">Create Account</button>
        </form>

        {/* Student List */}
        <div className="student-list card">
          <h3>Students</h3>
          <input
            placeholder="Search by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {studentsList
            .filter((s) => {
              const q = searchQuery.toLowerCase();
              return (
                !q ||
                s.name?.toLowerCase().includes(q) ||
                s.email?.toLowerCase().includes(q)
              );
            })
            .map((s) => (
              <div key={s._id} className="user-card">
                {editingId === s._id ? (
                  <div className="edit-mode">
                    <input
                      value={editValues.name}
                      onChange={(e) =>
                        setEditValues((v) => ({
                          ...v,
                          name: e.target.value,
                        }))
                      }
                    />
                    <input
                      value={editValues.email}
                      onChange={(e) =>
                        setEditValues((v) => ({
                          ...v,
                          email: e.target.value,
                        }))
                      }
                    />

                    {editRole === "student" && (
                      <>
                        <input
                          value={editValues.schoolName}
                          onChange={(e) =>
                            setEditValues((v) => ({
                              ...v,
                              schoolName: e.target.value,
                            }))
                          }
                          placeholder="Enter school name"
                        />
                        <div className="class-assign">
                          <h4>Assign Classes & Subjects</h4>
                          {classes.map((c) => (
                            <div key={c._id} className="class-item">
                              <label className="class-left">
                                <span className="class-chip">
                                  <input
                                    type="checkbox"
                                    checked={editSelectedClasses.includes(
                                      c._id
                                    )}
                                    onChange={() =>
                                      handleEditClassToggleWithSubjects(c._id)
                                    }
                                  />
                                  <strong>{c.name}</strong>
                                </span>
                              </label>
                              <div className="subject-list">
                                {c.subjects?.length ? (
                                  c.subjects.map((s) => (
                                    <label key={s._id} className="subject-item">
                                      <input
                                        type="checkbox"
                                        checked={editSelectedSubjects.includes(
                                          s._id
                                        )}
                                        onChange={() =>
                                          toggleEditSubject(s._id)
                                        }
                                      />
                                      {s.name}
                                    </label>
                                  ))
                                ) : (
                                  <small>No subjects</small>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="edit-actions">
                      <button
                        className="btn-save"
                        onClick={() => saveEdit(s._id)}
                      >
                        Save
                      </button>
                      <button className="btn-cancel" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="user-view">
                    <div className="user-details">
                      <strong>{s.name}</strong> ({s.role}) — {s.email}
                    </div>
                    <div className="actions">
                      <button onClick={() => startEdit(s)}>Edit</button>
                      <button onClick={() => removeStudent(s._id, s.role)}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default AddStudent;
