import axios from 'axios';

// Dynamically determine the backend host for development vs production
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? '' : 'https://tickets-management-backend-production-df72.up.railway.app');
const API_BASE_URL = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
