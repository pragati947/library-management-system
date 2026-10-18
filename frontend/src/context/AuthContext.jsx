import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [librarian, setLibrarian] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = api.getToken();
      if (savedToken) {
        try {
          const profile = await api.get('/auth/me');
          setLibrarian(profile);
        } catch (err) {
          console.error("Token verification failed:", err);
          api.setToken(null);
          setLibrarian(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    const data = await api.post('/auth/login', { username, password });
    api.setToken(data.access_token);
    setLibrarian(data.librarian);
    return data.librarian;
  };

  const logout = () => {
    api.setToken(null);
    setLibrarian(null);
  };

  return (
    <AuthContext.Provider value={{ librarian, login, logout, loading, isAuthenticated: !!librarian }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

