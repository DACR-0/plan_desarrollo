import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: adjunta token almacenado
api.interceptors.request.use(config => {
  const token = localStorage.getItem('sigepu_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: redirige al login si el token expira
// No redirige si el error viene del propio endpoint de login
api.interceptors.response.use(
  r => r,
  err => {
    const isLoginRoute = err.config?.url?.includes('/auth/login');
    if (!isLoginRoute && (err.response?.status === 401 || err.response?.status === 403)) {
      localStorage.removeItem('sigepu_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
