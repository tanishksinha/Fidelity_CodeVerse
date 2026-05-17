'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

/**
 * SocketProvider — Singleton WebSocket connection to the FastAPI/Socket.io backend.
 * Provides: socket instance, connection state, and emit helper.
 * All admin components consume this via useSocket().
 */
export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Retrieve JWT for authenticated socket connections (admin routes)
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('synaptic_access_token')
      : null;

    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {},
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('[SOCKET] Connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[SOCKET] Connection error:', err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    // Return a safe no-op object when used outside the provider (e.g., consumer pages)
    return { socket: null, isConnected: false, emit: () => {} };
  }
  return ctx;
}
