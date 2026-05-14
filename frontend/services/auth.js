import { decodeJwt } from 'jose';

const TOKEN_KEY = 'fidelity_secure_session';

export const AuthService = {
  /**
   * Securely persist token after successful login
   */
  setSession: (accessToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, accessToken);
    }
  },

  /**
   * Retrieve active token, return null if expired or missing
   */
  getAccessToken: () => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    try {
      const decoded = decodeJwt(token);
      const currentTime = Date.now() / 1000;
      // If token expires in less than 30 seconds, consider it dead
      if (decoded.exp < currentTime + 30) {
        return null; 
      }
      return token;
    } catch (e) {
      return null;
    }
  },

  /**
   * Destroy the session (Logout/Bounce)
   */
  destroySession: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/admin/login';
    }
  }
};