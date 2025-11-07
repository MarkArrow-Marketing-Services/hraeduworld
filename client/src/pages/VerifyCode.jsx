import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Auth.css";

const VerifyCode = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const email = location.state?.email || "";
  // Prefill code from previous response if available (dev preview)
  const initialCode = location.state?.code || "";
  const previewUrl = location.state?.previewUrl || null;
  const smtpHelp = location.state?.smtpHelp || null;
  if (initialCode && !code) setCode(initialCode);

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/password/verify-code", {
        email,
        code,
      });
      toast.success("Code verified");
      navigate("/reset-password", { state: { email, code } });
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid code");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <form onSubmit={handleVerify} className="auth-form">
          <h2>Enter the code sent to your email</h2>
          {previewUrl && (
            <div className="auth-note">
              <a href={previewUrl} target="_blank" rel="noreferrer">
                Open email preview
              </a>
            </div>
          )}
          {smtpHelp && (
            <div className="auth-note" style={{ color: "crimson" }}>
              {smtpHelp}
            </div>
          )}
          <input
            type="text"
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <button type="submit">Done</button>
        </form>
      </div>
    </div>
  );
};

export default VerifyCode;
