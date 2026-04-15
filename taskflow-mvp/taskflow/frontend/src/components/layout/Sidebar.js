import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';

const navItems = [
  { path: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { path: '/projects', icon: '📁', label: 'Projetos' },
  { path: '/tasks', icon: '✅', label: 'Tarefas' },
  { path: '/performance', icon: '📈', label: 'Desempenho' },
  { path: '/team', icon: '👥', label: 'Equipe' },
  { path: '/users', icon: '🛡', label: 'Usuários', adminOnly: true },
  { path: '/settings', icon: '⚙', label: 'Configurações' },
  { path: '/profile', icon: '👤', label: 'Perfil' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const visibleItems = navItems.filter(item => {
    if (item.adminOnly) return ['admin_platform', 'admin_company'].includes(user?.role);
    return true;
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        <div className="sidebar-logo-text">
          <strong>TaskFlow</strong>
          <span>Gestão Inteligente</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map(item => (
          <button
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-mini" onClick={() => navigate('/profile')}>
          <div className="avatar sm">{user?.avatar}</div>
          <div className="user-mini-info">
            <div className="user-mini-name">{user?.name?.split(' ')[0]}</div>
            <div className="user-mini-role">{ROLE_LABELS[user?.role]}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
