import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layout
import MainLayout from './components/MainLayout';

// Context
import { LanguageProvider } from './context/LanguageContext';
import { MessagesProvider } from './context/MessagesContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import CreatePost from './pages/CreatePost';
import Travel from './pages/Travel';
import Messages from './pages/Messages';

function App() {
  const getStoredUser = React.useCallback(() => {
    const sessionUser = sessionStorage.getItem('currentUser');
    if (sessionUser) return sessionUser;
    const localUser = localStorage.getItem('currentUser');
    return localUser || null;
  }, []);

  const [isAuthenticated, setIsAuthenticated] = React.useState(
    () => getStoredUser() !== null
  );

  React.useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (!sessionStorage.getItem('currentUser') && stored) {
      sessionStorage.setItem('currentUser', stored);
      window.dispatchEvent(new Event('authchange'));
    }

    const handleAuthChange = () => {
      setIsAuthenticated(getStoredUser() !== null);
    };
    window.addEventListener('authchange', handleAuthChange);
    return () => window.removeEventListener('authchange', handleAuthChange);
  }, [getStoredUser]);

  return (
    <LanguageProvider>
      <MessagesProvider>
        <BrowserRouter>
          <Routes>
            {/* Redirect Root to Home if authenticated, otherwise to Login */}
            <Route path="/" element={isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} />

            {/* Auth Routes */}
            <Route path="/login" element={isAuthenticated ? <Navigate to="/home" replace /> : <Login setIsAuthenticated={setIsAuthenticated} />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/home" replace /> : <Register setIsAuthenticated={setIsAuthenticated} />} />

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
      </MessagesProvider>
    </LanguageProvider>
  );
}

export default App;
