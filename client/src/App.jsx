import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layout
import MainLayout from './components/MainLayout';

// Context
import { LanguageProvider } from './context/LanguageContext';
import { MessagesProvider } from './context/MessagesContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import CreatePost from './pages/CreatePost';
import Travel from './pages/Travel';
import Messages from './pages/Messages';

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const isAuthenticated = !!user;

  if (loading) return null;

  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect Root to Home if authenticated, otherwise to Login */}
        <Route path="/" element={isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} />

        {/* Auth Routes */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/home" replace /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/home" replace /> : <Register />} />

        {/* Main App Routes - Wrapped in Navigation (protected) */}
        <Route
          element={isAuthenticated ? <MainLayout /> : <Navigate to="/" replace />}
        >
          <Route path="/home" element={<Home />} />
          <Route path="/travel" element={<Travel />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:id" element={<Profile />} />
        </Route>

        {/* Catch-all route to redirect unknown URLs to root (login or home) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <MessagesProvider>
          <AppRoutes />
        </MessagesProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
