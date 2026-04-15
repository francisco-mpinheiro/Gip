import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export const ROLE_LABELS = {
  admin_platform: 'Admin da Plataforma',
  admin_company: 'Admin da Empresa',
  manager_area: 'Gestor de Área',
  project_manager: 'Gerente de Projeto',
  employee: 'Funcionário',
};

export const canDo = (user, action) => {
  if (!user) return false;
  const role = user.role;
  const isAdmin = ['admin_platform', 'admin_company'].includes(role);
  const isManager = ['admin_platform', 'admin_company', 'manager_area', 'project_manager'].includes(role);

  switch (action) {
    case 'manage_users': return isAdmin;
    case 'create_project': return isManager;
    case 'edit_project': return isManager;
    case 'delete_project': return isAdmin;
    case 'create_task': return isManager;
    case 'view_all_projects': return isManager;
    case 'view_performance': return isManager;
    case 'view_team': return true;
    default: return false;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.me()
        .then(r => setUser(r.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const { data } = await authAPI.register(formData);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, canDo: (action) => canDo(user, action) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
