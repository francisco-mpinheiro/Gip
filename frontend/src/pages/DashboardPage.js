import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const { metrics, recentProjects, recentTasks, recentActivities, weeklyActivity } = data || {};
  const maxActivity = Math.max(...(weeklyActivity || []).map(d => d.count), 1);

  return (
    <AppLayout>
      <div className="page-header">
        <h1>Dashboard</h1>
       
      </div>

      {/* METRIC CARDS */}
      <div className="metric-cards">
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-label"> Ativos</div>
            
          </div>
          
        </div>
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-label">Tarefas Concluídas</div>
            
          </div>
          
        </div>
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-label">Membros da Equipe</div>
          </div>
          
        </div>
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-label">Horas Trabalhadas</div>
          </div>
          
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
                <span className="project-meta-item">👥 {p.memberCount}</span>
                {p.endDate && (
                  <span className="project-meta-item">
                    🕐 {new Date(p.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
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
        <div className="card">
          <div className="card-header">
            <span className="card-title">Atividade da Semana</span>
            
          </div>
          
         
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Atividades Recentes</span>
          </div>
          {recentActivities?.slice(0, 6).map(a => (
            <div key={a.id} className="activity-item">
              <div className="avatar sm">{a.user?.avatar || '?'}</div>
              <div>
                <div className="activity-text">
                  <strong>{a.user?.name?.split(' ')[0]}</strong> {a.action}{' '}
                  <strong>{a.target}</strong>
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
