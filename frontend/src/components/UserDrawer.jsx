import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { usersAPI, chatAPI } from '../utils/api';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';

export default function UserDrawer({ userId, onClose }) {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('perfil');
  const [targetUser, setTargetUser] = useState(null);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Fetch target user data including educations
    usersAPI.getById(userId).then(res => setTargetUser(res.data)).catch(console.error);

    // Fetch chat history
    chatAPI.getHistory(userId).then(res => setMessages(res.data)).catch(console.error);

    // Connect socket
    const token = localStorage.getItem('token');
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('receive_message', (msg) => {
      if (msg.senderId === userId || msg.receiverId === userId) {
        setMessages(prev => [...prev, msg]);
      }
    });

    socket.on('message_sent', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  useEffect(() => {
    // Scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    
    socketRef.current.emit('send_message', {
      receiverId: userId,
      content: inputMsg
    });
    setInputMsg('');
  };

  if (!targetUser) return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer right" onClick={e => e.stopPropagation()}>
        <div style={{ padding: 24 }}>Carregando...</div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        .drawer-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.5); z-index: 1000;
          display: flex; justify-content: flex-end;
        }
        .drawer {
          width: 400px; max-width: 100%; height: 100%;
          background: var(--bg-card);
          box-shadow: -4px 0 24px rgba(0,0,0,0.2);
          display: flex; flex-direction: column;
          animation: slideIn 0.3s ease-out forwards;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .drawer-header {
          padding: 24px; border-bottom: 1px solid var(--border);
          display: flex; align-items: flex-start; gap: 16px; position: relative;
        }
        .drawer-close {
          position: absolute; top: 16px; right: 16px;
          background: none; border: none; color: var(--text-muted);
          cursor: pointer; font-size: 20px; padding: 4px; border-radius: 4px;
        }
        .drawer-close:hover { background: var(--bg-card-hover); color: var(--text-primary); }
        
        .drawer-tabs {
          display: flex; border-bottom: 1px solid var(--border);
        }
        .drawer-tab {
          flex: 1; text-align: center; padding: 12px;
          background: none; border: none; border-bottom: 2px solid transparent;
          color: var(--text-muted); font-weight: 600; cursor: pointer;
        }
        .drawer-tab.active {
          color: var(--accent-blue); border-bottom-color: var(--accent-blue);
        }
        
        .drawer-content {
          flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column;
        }
        
        .chat-bubble {
          max-width: 80%; padding: 10px 14px; border-radius: 12px;
          margin-bottom: 8px; font-size: 14px; line-height: 1.4;
        }
        .chat-bubble.mine {
          background: var(--accent-blue); color: #fff;
          align-self: flex-end; border-bottom-right-radius: 4px;
        }
        .chat-bubble.other {
          background: var(--bg-input); color: var(--text-primary);
          align-self: flex-start; border-bottom-left-radius: 4px;
        }
        
        .chat-input-area {
          padding: 16px; border-top: 1px solid var(--border);
          background: var(--bg-card); display: flex; gap: 8px;
        }
        .chat-input-area input {
          flex: 1; border: 1px solid var(--border); background: var(--bg-input);
          color: var(--text-primary); padding: 10px 14px; border-radius: 20px;
          outline: none;
        }
        .chat-input-area input:focus { border-color: var(--accent-blue); }
        .chat-input-area button {
          background: var(--accent-blue); color: #fff; border: none;
          width: 40px; height: 40px; border-radius: 50%; display: flex;
          align-items: center; justify-content: center; cursor: pointer;
        }
        .chat-input-area button:hover { opacity: 0.9; }
      `}</style>
      
      <div className="drawer-overlay" onClick={onClose}>
        <div className="drawer" onClick={e => e.stopPropagation()}>
          <div className="drawer-header">
            <button className="drawer-close" onClick={onClose}>✕</button>
            <div className="avatar xl" style={{ background: targetUser.active ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'var(--bg-input)' }}>
              {targetUser.avatar}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{targetUser.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{ROLE_LABELS[targetUser.role]}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{targetUser.department}</div>
            </div>
          </div>
          
          <div className="drawer-tabs">
            <button className={`drawer-tab ${activeTab === 'perfil' ? 'active' : ''}`} onClick={() => setActiveTab('perfil')}>Perfil</button>
            <button className={`drawer-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>Chat</button>
          </div>
          
          {activeTab === 'perfil' && (
            <div className="drawer-content">
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Contato</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-muted)' }}>mail</span>
                  {targetUser.email}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Formações & Certificações</div>
                {!targetUser.educations || targetUser.educations.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma formação cadastrada.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {targetUser.educations.map(edu => (
                      <div key={edu.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-input)' }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{edu.degree}</div>
                        <div style={{ fontSize: 13, color: 'var(--accent-blue)', marginTop: 2 }}>{edu.institution}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>
                            {edu.startDate ? new Date(edu.startDate).getFullYear() : ''} - {edu.endDate ? new Date(edu.endDate).getFullYear() : 'Presente'}
                          </span>
                          {edu.certificateUrl && (
                            <a 
                              href={edu.certificateUrl.startsWith('http') ? edu.certificateUrl : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${edu.certificateUrl}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                              Ver anexo
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'chat' && (
            <>
              <div className="drawer-content" style={{ padding: 16, background: 'var(--bg-body)' }}>
                {messages.length === 0 ? (
                  <div style={{ margin: 'auto', color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>
                    Nenhuma mensagem ainda.<br/>Envie um "Olá" para {targetUser.name.split(' ')[0]}!
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.senderId === currentUser.id;
                    return (
                      <div key={msg.id} className={`chat-bubble ${isMine ? 'mine' : 'other'}`}>
                        {msg.content}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <form className="chat-input-area" onSubmit={handleSend}>
                <input 
                  type="text" 
                  placeholder="Digite uma mensagem..." 
                  value={inputMsg} 
                  onChange={e => setInputMsg(e.target.value)} 
                />
                <button type="submit" title="Enviar">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
