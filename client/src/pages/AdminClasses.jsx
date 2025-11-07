import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import AdminLayout from "../components/AdminLayout";
import "../styles/AdminClasses.css";
import { toast } from "react-hot-toast";

const AdminClasses = () => {
  const { auth } = useContext(AuthContext);
  const [classes, setClasses] = useState([]);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/classes", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setClasses(res.data);
    } catch (error) {
      toast.error("Failed to fetch classes");
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await axios.put(
          `http://localhost:5000/api/classes/${editing}`,
          { name },
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
        toast.success("Class updated successfully");
        setEditing(null);
      } else {
        await axios.post(
          "http://localhost:5000/api/classes",
          { name },
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
        toast.success("Successfully created class");
      }
      setName("");
      fetchClasses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save class");
    }
  };

  const startEdit = (cls) => {
    setEditing(cls._id);
    setName(cls.name);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this class?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/classes/${id}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      toast.success("Class deleted");
      fetchClasses();
    } catch (error) {
      toast.error("Failed to delete class");
    }
  };

  const explore = (id) => {
    window.location.href = `/admin/subjects?classId=${id}`;
  };

  return (
    <AdminLayout>
      <div className="admin-classes-container">
        <h1 className="admin-title">
          {editing ? "Edit Class" : "Create New Class"}
        </h1>

        <form onSubmit={handleAdd} className="class-form">
          <input
            type="text"
            placeholder="Enter class name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button type="submit" className="primary-btn">
            {editing ? "Update Class" : "Add Class"}
          </button>
        </form>

        <div className="class-list">
          {classes.length === 0 ? (
            <p className="empty-text">No classes created yet.</p>
          ) : (
            classes.map((cls) => (
              <div key={cls._id} className="class-card">
                <div className="class-header">
                  <h2>{cls.name}</h2>
                </div>
                <div className="btn-group">
                  <button className="btn edit" onClick={() => startEdit(cls)}>
                    Update
                  </button>
                  <button
                    className="btn delete"
                    onClick={() => handleDelete(cls._id)}
                  >
                    Delete
                  </button>
                  <button
                    className="btn explore"
                    onClick={() => explore(cls._id)}
                  >
                    Explore
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminClasses;
