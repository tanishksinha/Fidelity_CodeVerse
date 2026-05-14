'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { SocketProvider } from '@/contexts/SocketContext';

// --- Auth Context ---
const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export function Providers({ children }) {
  const [user, setUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('fidelity_access_token');
    if (token) {
      setUser({ role: 'admin', id: 'USR_001' });
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <AuthContext.Provider value={{ user, setUser, isDarkMode, setIsDarkMode }}>
      <SocketProvider>
        {children}
      </SocketProvider>
    </AuthContext.Provider>
  );
}