import React, { useContext, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import axios from "axios";
import { FaBars, FaTimes } from "react-icons/fa";
import "../styles/Navbar.css";
import GlobalProgress from "./GlobalProgress";

const Navbar = () => {
  const { auth, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [showProfile, setShowProfile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  const handleLogout = () => {
    try {
      setShowProfile(false);
    } catch (e) {}
    logout();
    navigate("/login", { replace: true });
  };

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  useEffect(() => {
    if (!showProfile) return;
    const fetchProfile = async () => {
      try {
        const endpoint =
          auth?.role === "student"
            ? "https://hraeduworld-backend.onrender.com/api/student/profile"
            : "https://hraeduworld-backend.onrender.com/api/admin/profile";

        const res = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        setProfile(res.data);
      } catch (e) {
        setProfile(null);
      }
    };
    fetchProfile();
  }, [showProfile]);

  useEffect(() => {
    if (!auth?.token) setShowProfile(false);
  }, [auth?.token]);

  return (
    <>
      <nav className="navbar admin-navbar">
        <div className="nav-left">
          <Link
            to={
              auth?.role === "admin"
                ? "/admin/dashboard"
                : auth?.role === "student"
                ? "/student/dashboard"
                : "/"
            }
            className="nav-logo"
          >
            Hetvika Remedial Academy
          </Link>
        </div>

        {/* Center area for compact progress (horizontally centered in navbar) */}
        <div className="nav-center">
          {auth?.role === "student" && auth?.token && !menuOpen && (
            <GlobalProgress compact />
          )}
        </div>

        <button className="menu-toggle" onClick={toggleMenu}>
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <div className={`nav-links ${menuOpen ? "active" : ""}`}>
          {auth.token ? (
            auth.role === "admin" ? (
              <>
                <Link to="/admin/add-student" className="nav-link">
                  Add Student
                </Link>
                <Link to="/admin/classes" className="nav-link">
                  Create Class
                </Link>
                <Link to="/admin/subjects" className="nav-link">
                  Create Subject
                </Link>
                <Link to="/admin/units" className="nav-link">
                  Create Unit
                </Link>
                <Link to="/admin/quizzes" className="nav-button addquiz-btn">
                  <span>+</span> Add Quiz
                </Link>
                <Link
                  to="/admin/dashboard"
                  className="nav-button dashboard-btn"
                >
                  Dashboard
                </Link>
                <button
                  className="nav-profile-wrapper"
                  onClick={() => setShowProfile(true)}
                  aria-label="Open profile"
                >
                  <span className="nav-profile">P</span>
                </button>
              </>
            ) : (
              <>
                {/* mobile/menu progress block - both variants rendered; CSS shows the right one per breakpoint */}
                {menuOpen && (
                  <div className="nav-progress-mobile">
                    <GlobalProgress compact />
                  </div>
                )}

                <Link to="/student/dashboard" className="nav-link">
                  Home
                </Link>
                <Link to="/student/progress" className="nav-link">
                  My Progress
                </Link>
                <button
                  type="button"
                  className="nav-profile-wrapper student"
                  onClick={() => setShowProfile(true)}
                  aria-label="Open profile"
                >
                  <span className="nav-profile student">P</span>
                </button>
              </>
            )
          ) : (
            <Link to="/login" className="nav-link">
              Login
            </Link>
          )}
        </div>
      </nav>

      {showProfile && (
        <>
          <div
            className="profile-backdrop"
            onClick={() => setShowProfile(false)}
          />
          <div className="profile-modal" role="dialog" aria-modal="true">
            <button className="close-btn" onClick={() => setShowProfile(false)}>
              ×
            </button>
            <h3>Profile</h3>
            {profile ? (
              <div>
                <p>
                  <strong>Full name:</strong> {profile.name || profile.username}
                </p>
                <p>
                  <strong>Email:</strong> {profile.email || "(not set)"}
                </p>
                <div className="logout-btn-container">
                  <button className="logout-btn" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <p>Loading...</p>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default Navbar;
