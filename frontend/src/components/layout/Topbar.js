import React, { useState } from 'react';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useNavigate } from 'react-router-dom';

export default function Topbar({ title }) {
  const { user } = useAuth();
  const { theme, fontSize, toggleTheme, changeFontSize } = usePreferences();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar-search">
        <input placeholder="Buscar..." />
      </div>

      <div className="topbar-right">
        <button className="topbar-icon-btn" title="Notificações">
          🔔
          <span className="notif-badge">3</span>
        </button>
        <button
          className="topbar-icon-btn"
          onClick={() => setShowSettings(!showSettings)}
          title="Configurações"
        >
          ⚙️
        </button>
        <button
          className="topbar-user"
          onClick={() => navigate('/profile')}
          title="Perfil"
        >
          <div className="avatar sm">{user?.avatar}</div>
          <span>{user?.name?.split(' ')[0]}</span>
        </button>
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="settings-dropdown">
          <div className="settings-section">
            <div className="settings-title">Acessibilidade</div>
            
            <div className="settings-item">
              <label className="settings-label">Tamanho da Fonte</label>
              <div className="font-size-controls">
                <button
                  className={`font-btn ${fontSize === 'small' ? 'active' : ''}`}
                  onClick={() => changeFontSize('small')}
                  title="Diminuir fonte"
                >
                  A-
                </button>
                <span className="font-indicator">{fontSize === 'small' ? 'Pequeno' : fontSize === 'large' ? 'Grande' : 'Médio'}</span>
                <button
                  className={`font-btn ${fontSize === 'large' ? 'active' : ''}`}
                  onClick={() => changeFontSize('large')}
                  title="Aumentar fonte"
                >
                  A+
                </button>
              </div>
            </div>
          </div>

          <div className="settings-divider"></div>

          <div className="settings-section">
            <div className="settings-title">Aparência</div>
            
            <div className="settings-item">
              <label className="settings-label">Tema</label>
              <div className="theme-toggle">
                <button
                  className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                  onClick={toggleTheme}
                  title="Tema escuro"
                >
                  🌙 Escuro
                </button>
                <button
                  className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                  onClick={toggleTheme}
                  title="Tema claro"
                >
                  ☀️ Claro
                </button>
              </div>
            </div>
          </div>

          <button
            className="settings-close"
            onClick={() => setShowSettings(false)}
          >
            ✕ Fechar
          </button>
        </div>
      )}

      {/* Fechar modal ao clicar fora */}
      {showSettings && (
        <div
          className="settings-overlay"
          onClick={() => setShowSettings(false)}
        />
      )}
    </header>
  );
}
