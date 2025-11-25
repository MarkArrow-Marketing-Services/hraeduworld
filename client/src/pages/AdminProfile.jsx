import React, { useEffect, useState, useContext } from "react";
import AdminLayout from "../components/AdminLayout";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import { toast } from "react-hot-toast";
import "../styles/AdminProfile.css";

const AdminProfile = () => {
  const { auth, logout } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/profile`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setProfile(res.data);
    } catch (err) {
      toast.error("Failed to fetch profile");
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
      window.location.href = "/login";
    }
  };

  return (
    <AdminLayout>
      <h1>Profile</h1>
      {profile ? (
        <div className="profile-card">
          <div className="profile-row">
            <div>
              <p>Full name: {profile.name || profile.username}</p>
              <p>Email: {profile.email || "(not set)"}</p>
            </div>
            <div>
              <button onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </AdminLayout>
  );
};

export default AdminProfile;
