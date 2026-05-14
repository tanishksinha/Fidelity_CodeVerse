'use client';

import { createContext, useContext, useState, useEffect } from 'react';
// If using next-themes for dark mode (highly recommended for the dashboard)
// npm install next-themes

// --- Mock Auth Provider for JWT ---
const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function Providers({ children }) {
  const [user, setUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initial JWT Verification Simulation
  useEffect(() => {
    const token = localStorage.getItem('fidelity_jwt');
    if (token) {
      // In production, verify token with backend here
      setUser({ role: 'admin', id: 'USR_001' });
      // If admin, default to War Room dark mode
      setIsDarkMode(true); 
    }
  }, []);

  // Theme Toggle Logic
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <AuthContext.Provider value={{ user, setUser, isDarkMode, setIsDarkMode }}>
      {children}
    </AuthContext.Provider>
  );
}