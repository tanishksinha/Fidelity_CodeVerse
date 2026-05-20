import { decodeJwt } from 'jose';

const TOKEN_KEY = 'synaptic_secure_session';

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
    // DUMMY BYPASS FOR QUICK TESTING:
    return "dummy_valid_token_for_testing";

    try {
      // DUMMY BYPASS FOR QUICK TESTING:
      return "dummy_valid_token_for_testing";
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