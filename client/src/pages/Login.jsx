import React, { useState, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import "../styles/Auth.css";
import { toast } from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // If already authenticated, redirect to appropriate dashboard
  if (login && typeof login === "function") {
    // noop — keep lint happy
  }

  React.useEffect(() => {
    if (localStorage.getItem("token")) {
      const role = localStorage.getItem("role");
      if (role === "admin") navigate("/admin/classes", { replace: true });
      else navigate("/student/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/login`,
        { username, password }
      );
      login(response.data.token, response.data.role);
      toast.success("Login Successful");
      // Redirect based on role (replace history so back button doesn't return to login)
      if (response.data.role === "admin")
        navigate("/admin/classes", { replace: true });
      else navigate("/student/dashboard", { replace: true });
    } catch (error) {
      const msg = error.response?.data?.message;
      if (msg === "You do not have access.") {
        toast.error("You do not have access.");
      } else {
        toast.error(msg || "Login failed");
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Login</h2>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
          <div className="auth-note">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
