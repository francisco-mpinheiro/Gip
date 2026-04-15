import React from 'react';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Topbar({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <button className="topbar-menu-btn">☰</button>

      <div className="topbar-search">
        <span className="topbar-search-icon">🔍</span>
        <input placeholder="Buscar..." />
      </div>

      <div className="topbar-right">
        <button className="topbar-icon-btn">👤</button>
        <button className="topbar-icon-btn">
          🔔
          <span className="notif-badge">3</span>
        </button>
        <div className="topbar-user" onClick={() => navigate('/profile')}>
          <div className="avatar sm">{user?.avatar}</div>
          <span>{user?.name?.split(' ')[0]}</span>
          <span style={{ fontSize: 10 }}>▼</span>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={logout}
          title="Sair"
          style={{ fontSize: 16, padding: '6px 8px' }}
        >
          ⏻
        </button>
      </div>
    </header>
  );
}
