import React, { useContext } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar"; // Import Navbar
import "./styles/theme.css"; // Global theme
import "./styles/Navbar.css"; // Import Navbar styles

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyCode from "./pages/VerifyCode";
import ResetPassword from "./pages/ResetPassword";
import AuthContext from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";

import AdminClasses from "./pages/AdminClasses";
import AdminSubjects from "./pages/AdminSubjects";
import AdminUnits from "./pages/AdminUnits";
import AdminQuizzes from "./pages/AdminQuizzes";
import AddStudent from "./pages/AddStudent";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProfile from "./pages/AdminProfile";
import AdminLayout from "./components/AdminLayout";

import StudentDashboard from "./pages/StudentDashboard";
import StudentProfile from "./pages/StudentProfile";

import StudentUnits from "./pages/StudentUnits";
import StudentQuiz from "./pages/StudentQuiz";
import StudentLayout from "./components/StudentLayout";
import StudentProgress from "./pages/StudentProgress";

const App = () => {
  const { auth } = useContext(AuthContext);

  return (
    <Router>
      <>
        <Navbar /> {/* Navbar added here */}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-code" element={<VerifyCode />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Landing */}
          <Route path="/" element={<Landing />} />

          {/* Protected routes */}
          <Route
            path="/admin/classes"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminClasses />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/add-student"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AddStudent />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/subjects"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminSubjects />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminProfile />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/units"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminUnits />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/quizzes"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminQuizzes />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentLayout>
                  <StudentDashboard />
                </StudentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentLayout>
                  <StudentProfile />
                </StudentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/progress"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentLayout>
                  <StudentProgress />
                </StudentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/units"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentLayout>
                  <StudentUnits />
                </StudentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/quiz"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentLayout>
                  <StudentQuiz />
                </StudentLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </>
    </Router>
  );
};

export default App;
