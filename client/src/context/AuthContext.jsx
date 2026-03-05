import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sigepu_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('/auth/me')
        .then(r => setUser(r.data.user))
        .catch(() => { localStorage.removeItem('sigepu_token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('sigepu_token', data.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('sigepu_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const isAdmin     = () => user?.rol === 'admin';
  const isAreaUser  = () => user?.rol === 'area_estrategica';
  const isConsultor = () => user?.rol === 'consultor';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isAreaUser, isConsultor }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
