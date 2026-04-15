import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';

const navItems = [
  { path: '/dashboard', icon: 'bi bi-grid', label: 'Dashboard' },
  { path: '/projects', icon: 'bi bi-folder', label: 'Projetos' },
  { path: '/tasks', icon: 'bi bi-check2-square', label: 'Tarefas' },
  { path: '/performance', icon: 'bi bi-graph-up', label: 'Desempenho' },
  { path: '/team', icon: 'bi bi-people', label: 'Equipe' },
  { path: '/users', icon: 'bi bi-shield-lock', label: 'Usuários', adminOnly: true },
  { path: '/settings', icon: 'bi bi-gear', label: 'Configurações' },
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
        <div className="sidebar-logo-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-workspace" viewBox="0 0 16 16">
  <path d="M4 16s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-5.95a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"/>
  <path d="M2 1a2 2 0 0 0-2 2v9.5A1.5 1.5 0 0 0 1.5 14h.653a5.4 5.4 0 0 1 1.066-2H1V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v9h-2.219c.554.654.89 1.373 1.066 2h.653a1.5 1.5 0 0 0 1.5-1.5V3a2 2 0 0 0-2-2z"/>
</svg></div>
        <div className="sidebar-logo-text">
          <strong>GIP</strong>
         
        </div>
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map(item => (
          <button
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <i className={item.icon}></i>
            <span>{item.label}</span>
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
