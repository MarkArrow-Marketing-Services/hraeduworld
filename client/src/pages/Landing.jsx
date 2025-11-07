import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import "../styles/Landing.css";

const Landing = () => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // If already authenticated, send user to the correct dashboard and replace history
    if (auth?.token) {
      if (auth.role === "admin") navigate("/admin/classes", { replace: true });
      else navigate("/student/dashboard", { replace: true });
    }
  }, [auth, navigate]);

  return (
    <div className="landing-root">
      <header className="landing-header">
        <h1>HraEduWorld</h1>
      </header>

      <section className="landing-hero">
        <h2>Welcome to HraEduWorld</h2>
        <p>Interactive learning platform for admins and students.</p>
      </section>
    </div>
  );
};

export default Landing;
