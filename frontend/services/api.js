import axios from 'axios';
import { AuthService } from './auth';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Inject JWT
api.interceptors.request.use((config) => {
  const token = AuthService.getAccessToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      AuthService.destroySession();
    }
    return Promise.reject(error);
  }
);

// High-level API methods
export const fetchFunnelStats = () => api.get('/admin/funnel-stats').then(res => res.data);
export const fetchBouncedSessions = () => api.get('/admin/bounced-sessions').then(res => res.data);
export const runEngine = () => api.post('/admin/run-engine').then(res => res.data);
export const dispatchInterventions = () => api.post('/admin/dispatch').then(res => res.data);
export const loginAdmin = (username, password) => 
  api.post('/auth/login', { username, password }).then(res => {
    AuthService.setSession(res.data.access_token);
    return res.data;
  });

export default api;