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
          <span className="material-symbols-outlined">settings</span>
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
                notifications.map(notif => {
                  const isDeadline = notif.content.toLowerCase().includes('prazo') || notif.content.toLowerCase().includes('encerra');
                  return (
                  <div 
                    key={notif.id} 
                    onClick={async () => {
                      if (!notif.isRead) {
                        await handleMarkAsRead(notif.id);
                      }
                      setShowNotif(false);
                      const projId = notif.projectId || notif.project?.id;
                      const taskId = notif.taskId || notif.task?.id;
                      if (projId) {
                        navigate(`/projects/${projId}`);
                      } else if (taskId) {
                        navigate('/tasks');
                      }
                    }}
                    style={{ 
                      padding: '10px', 
                      background: notif.isRead ? 'transparent' : (isDeadline ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-card)'), 
                      borderRadius: '6px', 
                      width: '100%', 
                      cursor: 'pointer',
                      borderLeft: notif.isRead ? '3px solid transparent' : (isDeadline ? '3px solid #f59e0b' : '3px solid var(--primary)'),
                      opacity: notif.isRead ? 0.7 : 1,
                      transition: 'background 0.2s',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isDeadline ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-input)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = notif.isRead ? 'transparent' : (isDeadline ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-card)'); }}
                  >
                    <span className="material-symbols-outlined" style={{ 
                      fontSize: '20px', 
                      color: isDeadline ? '#f59e0b' : 'var(--primary)',
                      marginTop: '2px'
                    }}>
                      {isDeadline ? 'alarm_on' : 'assignment_ind'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '13px', 
                        marginBottom: '4px',
                        color: isDeadline && !notif.isRead ? '#f59e0b' : 'var(--text-primary)',
                        fontWeight: isDeadline && !notif.isRead ? 600 : 400
                      }}>
                        {notif.content}
                      </div>
                      <div style={{ fontSize: '11px', color: '#888' }}>{new Date(notif.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                )})
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
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>dark_mode</span> Escuro
                </button>
                <button
                  className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                  onClick={toggleTheme}
                  title="Tema claro"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>light_mode</span> Claro
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
