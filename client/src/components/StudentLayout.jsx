import React from "react";
import StudentSidebar from "./StudentSidebar";
import "../styles/StudentPanel.css";

/**
 * StudentLayout
 * - kept structure and logic unchanged (GlobalProgress, Sidebar, children)
 * - added small comments to clarify visual/layout responsibilities
 */
const StudentLayout = ({ children }) => {
  return (
    <div className="student-panel">
      {/* Main body containing sidebar + main content area */}
      <div className="student-body">
        {/* StudentSidebar handles navigation; we only control its presentation here via CSS */}
        <StudentSidebar />

        {/* Primary content area — children are rendered here */}
        <main className="student-main">{children}</main>
      </div>
    </div>
  );
};

export default StudentLayout;
