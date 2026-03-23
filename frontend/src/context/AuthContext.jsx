import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/apiService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load — check if token exists and fetch user
  useEffect(() => {
    const token = localStorage.getItem('ef-token');
    if (token) {
      authAPI.getMe()
        .then(data => setUser(data.user))
        .catch(() => {
          localStorage.removeItem('ef-token');
          localStorage.removeItem('ef-user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const register = async (name, email, password, role, walletAddress) => {
    const data = await authAPI.register(name, email, password, role, walletAddress);
    setUser(data.user);
    localStorage.setItem('ef-user', JSON.stringify(data.user));
    return data.user;
  };

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    setUser(data.user);
    localStorage.setItem('ef-user', JSON.stringify(data.user));
    return data.user;
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('ef-user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateUser,
      isLoggedIn: !!user,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
