import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/layout/Navbar";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { LearnerDashboard } from "./pages/LearnerDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { Course } from "./pages/Course";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/learner"} replace />;
  }

  return children;
};

function AppContent() {
  const { user, logout } = useAuth();

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar user={user} logout={logout} />
        <main>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route path="/learner" element={
              <ProtectedRoute allowedRoles={['learner', 'admin']}>
                <LearnerDashboard />
              </ProtectedRoute>
            } />

            <Route path="/learner/courses/:id" element={
              <ProtectedRoute allowedRoles={['learner', 'admin']}>
                <Course />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </>
  );
}

export default App;
