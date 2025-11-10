import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "https://hraeduworld-backend.onrender.com/api/password/send-code",
        {
          email,
        }
      );
      const data = res.data || {};
      toast.success(data.message || "Code sent to email if account exists");
      if (data.smtpHelp) {
        toast((t) => <span>{data.smtpHelp}</span>);
      }
      // Pass code/previewUrl to the verify page when available (dev-friendly)
      navigate("/verify-code", {
        state: {
          email,
          code: data.code,
          previewUrl: data.previewUrl,
          smtpHelp: data.smtpHelp,
        },
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send code");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <form onSubmit={handleSend} className="auth-form">
          <h2>Forgot Password</h2>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Send Code</button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
