import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Auth.css";

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";
  const code = location.state?.code || "";
  const [newPassword, setNewPassword] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/password/reset`,
        {
          email,
          code,
          newPassword,
        }
      );
      toast.success("Password changed successfully");
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <form onSubmit={handleReset} className="auth-form">
          <h2>Reset Password</h2>
          <input
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <button type="submit">Done</button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
