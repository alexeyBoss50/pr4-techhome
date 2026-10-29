import { createContext, useContext, useEffect, useState } from 'react';
import { getMe, loginRequest, registerRequest, updateProfile, changePassword as changePasswordRequest } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('auth_user')) || null; } catch { return null; }
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('auth_token')));

  useEffect(() => {
    if (!localStorage.getItem('auth_token')) { setLoading(false); return; }
    getMe().then(data => setUser(data.user)).catch(() => logout()).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem('auth_user', JSON.stringify(user));
    else localStorage.removeItem('auth_user');
  }, [user]);

  async function login(email, password) {
    const data = await loginRequest(email, password);
    localStorage.setItem('auth_token', data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const data = await registerRequest(payload);
    localStorage.setItem('auth_token', data.token);
    setUser(data.user);
    return data.user;
  }

  async function saveProfile(payload) {
    const data = await updateProfile(payload);
    setUser(data.user);
    return data.user;
  }

  async function changePassword(payload) {
    return changePasswordRequest(payload);
  }

  function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout, saveProfile, changePassword }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
