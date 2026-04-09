import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AIChatbot from './components/AIChatbot';

import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import BorrowerDashboard from './pages/BorrowerDashboard';
import LenderDashboard from './pages/LenderDashboard';
import CreateLoan from './pages/CreateLoan';
import KYCVerification from './pages/KYCVerification';
import LoginRegister from './pages/LoginRegister';
import LoanDetail from './pages/LoanDetail';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import NGOPage from './pages/NGOPage';
import ChatPage from './pages/ChatPage';

function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('ef-admin-token');
  if (!token) return <Navigate to="/admin/login" replace />;
  let user = null;
  try { user = JSON.parse(localStorage.getItem('ef-admin-user')); } catch (e) {}
  if (!user || user.role !== 'admin') return <Navigate to="/admin/login" replace />;
  return children;
}

function AppRoutes() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdminPage && <Navbar />}
      <main>
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/login"       element={<LoginRegister />} />
          <Route path="/loan/:id"    element={<LoanDetail />} />
          <Route path="/ngo"         element={<NGOPage />} />
          <Route path="/borrow"      element={<ProtectedRoute><BorrowerDashboard /></ProtectedRoute>} />
          <Route path="/lend"        element={<ProtectedRoute><LenderDashboard /></ProtectedRoute>} />
          <Route path="/create-loan" element={<ProtectedRoute><CreateLoan /></ProtectedRoute>} />
          <Route path="/kyc"         element={<ProtectedRoute><KYCVerification /></ProtectedRoute>} />
          <Route path="/profile"     element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin"       element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="*"  element={<Navigate to="/" replace />} 
          />
          <Route path="/chat/:loanId/:otherAddress" element={<ChatPage />} />
        </Routes>
      </main>

      {/* ✅ AIChatbot OUTSIDE <Routes> — this was the crash */}
      {!isAdminPage && <AIChatbot />}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
