import React, { useState, useEffect } from 'react';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../../utils/api';

export default function Topbar({ title }) {
  const { user } = useAuth();
  const { theme, fontSize, toggleTheme, changeFontSize } = usePreferences();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll();
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="topbar">
      <div className="topbar-search">
        <input placeholder="Buscar..." />
      </div>

      <div className="topbar-right">
        <button 
          className="topbar-icon-btn" 
          title="Notificações"
          onClick={() => {
            setShowNotif(!showNotif);
            setShowSettings(false);
          }}
        >
          <span className="material-symbols-outlined">notifications</span>
          {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
        </button>
        <button
          className="topbar-icon-btn"
          onClick={() => {
            setShowSettings(!showSettings);
            setShowNotif(false);
          }}
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

      {/* NOTIFICATIONS MODAL */}
      {showNotif && (
        <div className="settings-dropdown" style={{ right: '120px', width: '300px' }}>
          <div className="settings-section">
            <div className="settings-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Notificações
              {unreadCount > 0 && (
                <button 
                  onClick={async () => {
                    await notificationsAPI.markAllAsRead();
                    loadNotifications();
                  }}
                  style={{ fontSize: '12px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
            
            <div className="settings-item" style={{ flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', alignItems: 'flex-start' }}>
              {notifications.length === 0 ? (
                <span style={{ fontSize: '14px', color: '#888' }}>Nenhuma notificação.</span>
              ) : (
                notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    onClick={() => handleMarkAsRead(notif.id)}
                    style={{ 
                      padding: '10px', 
                      background: notif.isRead ? 'transparent' : 'var(--bg-card)', 
                      borderRadius: '6px', 
                      width: '100%', 
                      cursor: 'pointer',
                      borderLeft: notif.isRead ? '3px solid transparent' : '3px solid var(--primary)',
                      opacity: notif.isRead ? 0.7 : 1
                    }}
                  >
                    <div style={{ fontSize: '13px', marginBottom: '4px' }}>{notif.content}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{new Date(notif.createdAt).toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
          <button className="settings-close" onClick={() => setShowNotif(false)}>✕ Fechar</button>
        </div>
      )}

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
      {(showSettings || showNotif) && (
        <div
          className="settings-overlay"
          onClick={() => {
            setShowSettings(false);
            setShowNotif(false);
          }}
        />
      )}
    </header>
  );
}
