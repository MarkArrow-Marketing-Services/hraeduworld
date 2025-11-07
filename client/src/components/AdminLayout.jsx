import React from "react";
import { Link } from "react-router-dom";
import "../styles/AdminLayout.css";

const AdminLayout = ({ children }) => {
  return (
    <div className="admin-root">
      {/* ✨ Optional top placeholder for navbar spacing */}
      <main className="admin-main">
        <section className="admin-container">{children}</section>
      </main>
    </div>
  );
};

export default AdminLayout;
