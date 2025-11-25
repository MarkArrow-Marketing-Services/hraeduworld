import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import AdminLayout from "../components/AdminLayout";
import "../styles/AdminSubjects.css";
import { toast } from "react-hot-toast";
import { useLocation } from "react-router-dom";

const AdminSubjects = () => {
  const { auth } = useContext(AuthContext);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ name: "", description: "" });
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const classId = params.get("classId");
    if (classId) setSelectedClass(classId);
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    if (selectedClass) fetchSubjects(selectedClass);
    else setSubjects([]);
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/classes`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setClasses(res.data);
      if (!selectedClass && res.data.length > 0)
        setSelectedClass(res.data[0]._id);
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
    } catch (error) {
      toast.error("Failed to fetch subjects");
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!selectedClass) {
      toast.error("Select a class first");
      return;
    }
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/subjects`,
        {
          name: subjectName,
          description: subjectDescription,
          classId: selectedClass,
        },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      toast.success("Successfully created subject");
      setSubjectName("");
      setSubjectDescription("");
      fetchSubjects(selectedClass);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add subject");
    }
  };

  const startEdit = (subject) => {
    setEditingId(subject._id);
    setEditValues({
      name: subject.name || "",
      description: subject.description || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ name: "", description: "" });
  };

  const saveEdit = async (id) => {
    try {
      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/subjects/${id}`,
        editValues,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      toast.success("Subject updated");
      cancelEdit();
      fetchSubjects(selectedClass);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update subject");
    }
  };

  const removeSubject = async (id) => {
    if (!window.confirm("Delete this subject?")) return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/subjects/${id}`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      toast.success("Subject deleted");
      fetchSubjects(selectedClass);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete subject");
    }
  };

  return (
    <AdminLayout>
      <div className="admin-subjects-container">
        <h1>Create New Subject</h1>

        <div className="class-select">
          <label>Select Class:</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <form className="add-subject-form" onSubmit={handleAddSubject}>
          <input
            type="text"
            placeholder="Enter subject name"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            required
          />
          <textarea
            placeholder="Enter subject description"
            value={subjectDescription}
            onChange={(e) => setSubjectDescription(e.target.value)}
            rows="3"
          />
          <button type="submit" className="add-btn">
            Add Subject
          </button>
        </form>

        <div className="subject-list">
          {subjects.length === 0 ? (
            <p className="no-subjects">No subjects available for this class.</p>
          ) : (
            subjects.map((subj) => (
              <div key={subj._id} className="created-subject-card">
                {editingId === subj._id ? (
                  <div className="edit-mode">
                    <input
                      value={editValues.name}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                    <textarea
                      value={editValues.description}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows="2"
                    />
                    <div className="action-buttons">
                      <button
                        onClick={() => saveEdit(subj._id)}
                        className="save-btn"
                      >
                        Save
                      </button>
                      <button onClick={cancelEdit} className="cancel-btn">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="content">
                    <div className="content-body">
                      <h3>{subj.name}</h3>
                      <p className="subject-description">
                        {subj.description || "No description available"}
                      </p>

                      <div className="mt-8">
                        <button
                          className="btn btn-edit"
                          onClick={() => startEdit(subj)}
                        >
                          Update
                        </button>
                        <button
                          className="btn btn-delete"
                          onClick={() => removeSubject(subj._id)}
                        >
                          Delete
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() =>
                            (window.location.href = `/admin/units?subjectId=${subj._id}`)
                          }
                        >
                          Explore
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSubjects;
