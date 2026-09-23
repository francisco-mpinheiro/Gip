import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI, searchAPI } from '../../utils/api';

export default function Topbar({ title }) {
  const { user } = useAuth();
  const { theme, fontSize, toggleTheme, changeFontSize } = usePreferences();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const searchRef = useRef(null);
  const searchRequestRef = useRef(0);
  const searchTimerRef = useRef(null);

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

  // ─── BUSCA GLOBAL ─────────────────────────────────────────────────────────

  const executeSearch = async (value) => {
    const query = String(value || '').trim();

    if (!query) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearchLoading(false);
      return;
    }

    setSearchOpen(true);
    setSearchLoading(true);

    const requestId = ++searchRequestRef.current;

    try {
      const res = await searchAPI.global(query);

      if (requestId !== searchRequestRef.current) return;

      setSearchResults(res.data || []);
    } catch (err) {
      console.error('Erro na busca global:', err);

      if (requestId === searchRequestRef.current) {
        setSearchResults([]);
      }
    } finally {
      if (requestId === searchRequestRef.current) {
        setSearchLoading(false);
      }
    }
  };

  // Busca enquanto digita, com debounce de aproximadamente 300 ms.
  useEffect(() => {
    const query = searchTerm.trim();

    if (!query) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearchLoading(false);
      return undefined;
    }

    setSearchOpen(true);
    setSearchLoading(true);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = setTimeout(() => {
      executeSearch(query);
    }, 300);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchTerm]);

  // Fecha o dropdown ao clicar fora.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);

      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      const query = searchTerm.trim();
      if (!query) return;

      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }

      await executeSearch(query);
    }

    if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  const handleSearchResultClick = (result) => {
    setSearchOpen(false);
    setSearchTerm('');

    if (result?.url) {
      navigate(result.url);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const avatarIsImage = user?.avatar && String(user.avatar).startsWith('/uploads/');
  const avatarInitials = user?.name
    ? user.name.split(' ').filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <header
      className="topbar"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      }}
    >

      {/* BUSCA GLOBAL */}
      <div
        ref={searchRef}
        style={{
          position: 'relative',
          flex: 1,
          maxWidth: 500,
          marginRight: 20,
        }}
      >
        <div
          className="topbar-search"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            height: 40,
            padding: '0 12px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxSizing: 'border-box',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 20,
              color: 'var(--text-muted)',
              flexShrink: 0,
            }}
          >
            search
          </span>

          <input
            type="text"
            placeholder="Buscar projetos, tarefas ou membros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              if (searchTerm.trim()) {
                setSearchOpen(true);
              }
            }}
            onKeyDown={handleSearchKeyDown}
            aria-label="Buscar projetos, tarefas ou membros"
            style={{
              width: '100%',
              minWidth: 0,
              border: 0,
              outline: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: 13,
            }}
          />
        </div>

        {searchOpen && searchTerm.trim() && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
              overflow: 'hidden',
              zIndex: 2000,
            }}
          >
            {searchLoading ? (
              <div
                style={{
                  padding: 16,
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                }}
              >
                Buscando...
              </div>
            ) : searchResults.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                }}
              >
                Nenhum resultado encontrado
              </div>
            ) : (
              searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  onClick={() => handleSearchResultClick(result)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: 'transparent',
                    border: 0,
                    borderBottom: '1px solid var(--border-light)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span
                    style={{
                      minWidth: 70,
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {result.typeLabel}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {result.name}
                    </div>

                    {result.meta && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {result.meta}
                      </div>
                    )}
                  </div>

                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 18,
                      color: 'var(--text-muted)',
                    }}
                  >
                    arrow_forward
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="topbar-right">
        <button 
          className="topbar-icon-btn" 
          title="Notificações"
          onClick={() => {
            setShowNotif(!showNotif);
            setShowSettings(false);
            setSearchOpen(false);
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
            setSearchOpen(false);
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
          <div className="avatar sm" style={{ overflow: 'hidden', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            {avatarIsImage ? (
              <img src={user.avatar} alt={user.name || 'Usuário'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <span>{avatarInitials}</span>
            )}
          </div>
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
