import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateLocal } from '../utils/dateUtils';
import AppLayout from '../components/layout/AppLayout';
import { dashboardAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const STATUS_LABEL = { em_progresso: 'Em Progresso', planejamento: 'Planejamento', concluido: 'Concluído', a_fazer: 'A Fazer', em_andamento: 'Em Andamento' };
const STATUS_CLASS = { em_progresso: 'badge-em_progresso', planejamento: 'badge-planejamento', concluido: 'badge-concluido', a_fazer: 'badge-a_fazer', em_andamento: 'badge-em_andamento', pendente: 'badge-pendente' };
const PRIORITY_CLASS = { alta: 'badge-alta', media: 'badge-media', baixa: 'badge-baixa' };

function timeAgo(date) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

function progressColor(pct) {
  if (pct >= 70) return 'progress-green';
  if (pct >= 30) return 'progress-blue';
  return 'progress-amber';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.get()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <AppLayout>
      <div className="loading"><div className="spinner" />Carregando...</div>
    </AppLayout>
  );

  const { metrics, recentProjects, recentTasks, recentActivities, tasksThisWeek } = data || {};


  return (
    <AppLayout>
      <div className="page-header">
        <h1>Dashboard</h1>

      </div>

      {/* METRIC CARDS */}
      <div className="metric-cards">
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-label" style={{ marginTop: 0 }}>Projetos Ativos</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)' }}>
              <span className="material-icons" style={{ fontSize: '15px', color: 'var(--accent-blue)' }}>rocket_launch</span>
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '10px', color: 'var(--text-primary)' }}>{metrics?.activeProjects || 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-label" style={{ marginTop: 0 }}>Tarefas<br />Concluídas</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)' }}>
              <span className="material-icons" style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>task_alt</span>
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '10px', color: 'var(--text-primary)' }}>{metrics?.completedTasks || 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-label" style={{ marginTop: 0 }}>Membros da<br />Equipe</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)' }}>
              <span className="material-icons" style={{ fontSize: '15px', color: 'var(--accent-amber)' }}>groups</span>
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '10px', color: 'var(--text-primary)' }}>{metrics?.totalMembers || 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-label" style={{ marginTop: 0 }}>Tarefas<br />Atrasadas</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)' }}>
              <span className="material-icons" style={{ fontSize: '15px', color: 'var(--accent-red)' }}>assignment_late</span>
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '10px', color: 'var(--text-primary)' }}>{metrics?.overdueTasks || 0}</div>
        </div>
      </div>

      {/* PROJECTS + TASKS */}
      <div className="grid-2">
        {/* RECENT PROJECTS */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Projetos Recentes</span>
            <span className="card-link" onClick={() => navigate('/projects')}>Ver todos</span>
          </div>
          {recentProjects?.length === 0 && <div className="empty-state"><p>Nenhum projeto ainda</p></div>}
          {recentProjects?.map(p => (
            <div key={p.id} className="project-item" onClick={() => navigate(`/projects/${p.id}`)} style={{ cursor: 'pointer' }}>
              <div className="project-item-header">
                <span className="project-name">{p.name}</span>
                <span className="project-pct">{p.progress}%</span>
              </div>
              <div className="project-meta">
                <span className="project-meta-item">
                  <span className={`badge ${STATUS_CLASS[p.status]}`}>{STATUS_LABEL[p.status] || p.status}</span>
                </span>
                <span className="project-meta-item"><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 2 }}>group</span> {p.memberCount}</span>
                {p.endDate && (
                  <span className="project-meta-item">
                    <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 2 }}>schedule</span> {formatDateLocal(p.endDate, { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
              <div className="progress-bar">
                <div className={`progress-bar-fill ${progressColor(p.progress)}`} style={{ width: `${p.progress}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* RECENT TASKS */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Tarefas Recentes</span>
            <span className="card-link" onClick={() => navigate('/tasks')}>Ver todas</span>
          </div>
          {recentTasks?.length === 0 && <div className="empty-state"><p>Nenhuma tarefa ainda</p></div>}
          {recentTasks?.map(t => (
            <div key={t.id} className="task-item">
              <div className={`task-checkbox ${t.status === 'concluido' ? 'checked' : ''}`} />
              <div className="task-content">
                <div className={`task-title ${t.status === 'concluido' ? 'done' : ''}`}>{t.title}</div>
                <div className="task-meta">
                  {t.project && <span className="task-project">{t.project.name}</span>}
                  <span className={`badge ${PRIORITY_CLASS[t.priority]}`}>{t.priority}</span>
                </div>
              </div>
              <span className={`badge ${STATUS_CLASS[t.status]}`} style={{ fontSize: 10.5, flexShrink: 0 }}>
                {STATUS_LABEL[t.status] || t.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ACTIVITY CHART + RECENT ACTIVITY */}
      <div className="grid-2">
        <div className="card" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <div className="card-header" style={{ position: 'sticky', top: 0, backgroundColor: 'inherit', zIndex: 1, paddingBottom: '10px' }}>
            <span className="card-title">Atividades da Semana</span>
          </div>
          <div className="tasks-this-week-list" style={{ marginTop: '20px' }}>
            {tasksThisWeek?.length === 0 && (
              <div className="empty-state">
                <p>Nenhuma atividade programada para esta semana.</p>
              </div>
            )}
            {tasksThisWeek?.map(t => (
              <div key={t.id} className="task-item">
                <div className={`task-checkbox ${t.status === 'concluido' ? 'checked' : ''}`} />
                <div className="task-content">
                  <div className={`task-title ${t.status === 'concluido' ? 'done' : ''}`}>{t.title}</div>
                  <div className="task-meta">
                    {t.project && <span className="task-project">{t.project.name}</span>}
                    <span className="task-date">
                      Prazo: {formatDateLocal(t.dueDate, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <span className={`badge ${STATUS_CLASS[t.status]}`} style={{ fontSize: 10.5, flexShrink: 0 }}>
                  {STATUS_LABEL[t.status] || t.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <div className="card-header" style={{ position: 'sticky', top: 0, backgroundColor: 'inherit', zIndex: 1, paddingBottom: '10px' }}>
            <span className="card-title">Histórico de Atividades</span>
          </div>
          {recentActivities?.length === 0 && (
            <div className="empty-state" style={{ marginTop: '20px' }}>
              <p>Nenhuma atividade registrada nesta semana.</p>
            </div>
          )}
          {recentActivities?.map(a => (
            <div key={a.id} className="activity-item">
              <div className="avatar sm">{a.user?.avatar || '?'}</div>
              <div>
                <div className="activity-text">
                  <strong>{a.user?.name?.split(' ')[0]}</strong> {a.action}{' '}
                  <strong>{a.target}</strong>
                  {a.project && <span> em <strong>{a.project.name}</strong></span>}
                </div>
                <div className="activity-time">{timeAgo(a.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
