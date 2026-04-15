import React from 'react';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Topbar({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar">
     

      <div className="topbar-search">
        <input placeholder="Buscar..." />
      </div>

      <div className="topbar-right">
        
        
        <button
          className="btn btn-ghost btn-sm"
          onClick={logout}
          title="Sair"
          style={{ fontSize: 16, padding: '6px 8px', backgroundColor: '#dc2626', color: 'white'}}
        >
          Sair
        </button>
      </div>
    </header>
  );
}
