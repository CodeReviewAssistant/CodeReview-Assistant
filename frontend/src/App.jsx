import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

import LoginPage from './components/LoginPage';
import ChatInterface from './components/ChatInterface';
import Integrations from './components/new/Integrations';

const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const cookies = typeof document.cookie === 'string' ? document.cookie : '';
  const value = cookies.split('; ').find(row => row.startsWith(name + '='));
  return value ? decodeURIComponent(value.split('=')[1]) : null;
};

const deleteCookie = (name) => {
  if (typeof document === 'undefined') return;
  document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};


function App() {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      localStorage.removeItem('user');
      return null;
    }
  });

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    deleteCookie('access_token');
    // Consider also explicitly navigating to '/login' here if not already handled by redirect
    // navigate('/login'); // if useNavigate is available and desired
  };

  const toggleDarkMode = () => setDarkMode(prevMode => !prevMode);

  const handleSetUser = (userData) => {
    if (userData) {
      try {
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (error) {
        // Optionally handle failed save
      }
    } else {
      localStorage.removeItem('user');
    }
    setUser(userData);
  };

  return (
    <GoogleOAuthProvider clientId="191626543664-1a7pgs0amuou8j4krm4r8qgallq2n4qm.apps.googleusercontent.com">
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              user ? (
                <Navigate replace to="/chat" />
              ) : (
                <LoginPage setUser={handleSetUser} darkMode={darkMode} />
              )
            }
          />
          <Route
            path="/chat"
            element={
              user ? (
                <ChatInterface
                  user={user}
                  onLogout={handleLogout}
                  darkMode={darkMode}
                  toggleDarkMode={toggleDarkMode}
                />
              ) : (
                <Navigate replace to="/login" />
              )
            }
          />
          <Route
            path="/integrations"
            element={
              user ? (
                <Integrations darkMode={darkMode} />
              ) : (
                <Navigate replace to="/login" />
              )
            }
          />
          <Route
            path="/"
            element={<Navigate replace to={user ? "/chat" : "/login"} />}
          />
           <Route path="*" element={<Navigate replace to={user ? "/chat" : "/login"} />} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;