import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import "../styles/StudentProfile.css";

const StudentProfile = () => {
  const { auth, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: "", email: "", username: "" });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(
        "https://hraeduworld-backend.onrender.com/api/student/profile",
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setProfile(res.data);
      setForm({
        name: res.data.name || "",
        email: res.data.email || "",
        password: "",
      });
    } catch (error) {
      toast.error("Failed to fetch profile");
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        "https://hraeduworld-backend.onrender.com/api/student/profile",
        form,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      toast.success("Profile updated successfully");
      setEditing(false);
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    }
  };

  return (
    <div className="student-profile-container">
      <h1>Your Profile</h1>
      {!editing ? (
        <div>
          <p>
            <strong>Name:</strong> {profile.name || "N/A"}
          </p>
          <p>
            <strong>Email:</strong> {profile.email || "N/A"}
          </p>
          <p>
            <strong>School:</strong> {profile.schoolName || "N/A"}
          </p>
          <p>
            <strong>Enrolled Classes:</strong>{" "}
            {(profile.enrolledClasses || []).map((c) => c.name).join(", ") ||
              "N/A"}
          </p>
          <div className="profile-actions">
            <button
              onClick={() => {
                const ok = window.confirm("Are you sure you want to logout?");
                if (!ok) return;
                try {
                  // ensure local storage is cleared
                  logout();
                } catch (e) {}
                try {
                  localStorage.removeItem("token");
                  localStorage.removeItem("role");
                } catch (e) {}
                navigate("/login");
              }}
              className="btn-logout"
            >
              Logout
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label>
            Name:
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
            />
          </label>
          <label>
            Email:
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
            />
          </label>
          <label>
            Password:
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Leave blank to keep unchanged"
            />
          </label>
          <button type="submit">Save</button>
          <button type="button" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </form>
      )}
    </div>
  );
};

export default StudentProfile;
