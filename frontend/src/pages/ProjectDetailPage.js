import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { projectsAPI, tasksAPI, usersAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const COLUMNS = [
  { key: 'a_fazer', label: 'A Fazer', color: '#94a3b8' },
  { key: 'em_andamento', label: 'Em Andamento', color: '#3b82f6' },
  { key: 'concluido', label: 'Concluído', color: '#22c55e' },
];
const PRIORITY_CLASS = { alta: 'badge-alta', media: 'badge-media', baixa: 'badge-baixa' };
const emptyTask = { title: '', description: '', assigneeId: '', priority: 'media', dueDate: '' };

function isOverdue(task) {
  return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'concluido';
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canDo } = useAuth();
  const [project, setProject] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const load = useCallback(() => {
    Promise.all([projectsAPI.getById(id), usersAPI.getAll()])
      .then(([p, u]) => { setProject(p.data); setAllUsers(u.data); })
      .catch(() => navigate('/projects'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(load, [load]);

  const openCreateTask = () => { setEditingTask(null); setTaskForm(emptyTask); setTaskModal(true); };
  const openEditTask = (t) => {
    setEditingTask(t);
    setTaskForm({
      title: t.title, description: t.description || '',
      assigneeId: t.assigneeId || '', priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '',
    });
    setTaskModal(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTask) {
        await tasksAPI.update(editingTask.id, taskForm);
      } else {
        await tasksAPI.create({ ...taskForm, projectId: id });
      }
      setTaskModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao salvar tarefa');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Excluir esta tarefa?')) return;
    await tasksAPI.delete(taskId);
    load();
  };

  const handleDragStart = (task) => setDragging(task);
  const handleDragOver = (col, e) => { e.preventDefault(); setDragOver(col); };
  const handleDrop = async (col) => {
    if (dragging && dragging.status !== col) {
      await tasksAPI.updateStatus(dragging.id, col);
      load();
    }
    setDragging(null);
    setDragOver(null);
  };

  if (loading) return <AppLayout><div className="loading"><div className="spinner" />Carregando...</div></AppLayout>;
  if (!project) return null;

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = (project.tasks || []).filter(t => t.status === col.key);
    return acc;
  }, {});

  const members = project.members || [];

  return (
    <AppLayout>
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>← Projetos</button>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{project.name}</span>
        </div>
        <div className="flex-between">
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>{project.name}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{project.description}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {canDo('create_task') && (
              <button className="btn btn-primary" onClick={openCreateTask}>+ Nova Tarefa</button>
            )}
          </div>
        </div>

        {/* PROJECT META */}
        <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
          <div className="card" style={{ display: 'flex', gap: 20, padding: '14px 20px', flex: 1, minWidth: 300 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{project.progress}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Progresso</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="progress-bar" style={{ marginBottom: 6 }}>
                <div className="progress-bar-fill progress-blue" style={{ width: `${project.progress}%` }} />
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>📋 {project.tasks?.length || 0} tarefas</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>👥 {members.length} membros</span>
                {project.endDate && (
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    🕐 {new Date(project.endDate).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', gap: 12, padding: '14px 20px', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 4 }}>Equipe:</div>
            <div className="project-members">
              {members.slice(0, 6).map(m => (
                <div key={m.id} className="avatar sm" title={m.name}>{m.avatar}</div>
              ))}
              {members.length > 6 && (
                <div className="avatar sm" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: 10 }}>+{members.length - 6}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div className="kanban-board">
        {COLUMNS.map(col => {
          const colTasks = tasksByStatus[col.key] || [];
          return (
            <div
              key={col.key}
              className="kanban-col"
              style={{ borderTop: `3px solid ${col.color}`, opacity: dragOver === col.key ? 0.85 : 1 }}
              onDragOver={e => handleDragOver(col.key, e)}
              onDrop={() => handleDrop(col.key)}
            >
              <div className="kanban-col-header">
                <span className="kanban-col-title" style={{ color: col.color }}>
                  {col.label}
                  <span className="kanban-col-count">{colTasks.length}</span>
                </span>
                {canDo('create_task') && (
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={openCreateTask} title="Adicionar tarefa">+</button>
                )}
              </div>

              {colTasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: 12, border: '2px dashed var(--border-light)', borderRadius: 8 }}>
                  Sem tarefas aqui
                </div>
              )}

              {colTasks.map(task => {
                const assignee = task.assignee || members.find(m => m.id === task.assigneeId);
                const overdue = isOverdue(task);
                return (
                  <div
                    key={task.id}
                    className="kanban-card"
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    onDragEnd={() => setDragging(null)}
                    style={{ borderLeft: overdue ? '3px solid var(--accent-red)' : '3px solid transparent' }}
                  >
                    <div className="kanban-card-title">{task.title}</div>
                    {task.description && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.4 }}>
                        {task.description.length > 70 ? task.description.slice(0, 70) + '...' : task.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                      <span className={`badge ${PRIORITY_CLASS[task.priority]}`}>{task.priority}</span>
                      {overdue && <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>Atrasada</span>}
                    </div>
                    <div className="kanban-card-footer">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {assignee && (
                          <div className="avatar sm" title={assignee.name}>{assignee.avatar}</div>
                        )}
                        {task.dueDate && (
                          <span className={`kanban-card-date ${overdue ? 'overdue' : ''}`}>
                            🕐 {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" style={{ padding: '3px 6px', fontSize: 12 }} onClick={() => openEditTask(task)}>✏</button>
                        {canDo('create_task') && (
                          <button className="btn btn-ghost btn-sm btn-icon" style={{ padding: '3px 6px', fontSize: 12, color: 'var(--accent-red)' }} onClick={() => handleDeleteTask(task.id)}>🗑</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* TASK MODAL */}
      {taskModal && (
        <div className="modal-overlay" onClick={() => setTaskModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
              <button className="modal-close" onClick={() => setTaskModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSaveTask}>
                <div className="form-group">
                  <label className="form-label">Título *</label>
                  <input className="form-input" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} required placeholder="Ex: Revisar código de autenticação" />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <textarea className="form-textarea" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalhes da tarefa..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Responsável</label>
                    <select className="form-select" value={taskForm.assigneeId} onChange={e => setTaskForm(f => ({ ...f, assigneeId: e.target.value }))}>
                      <option value="">Sem responsável</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prioridade</label>
                    <select className="form-select" value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}>
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Prazo</label>
                  <input className="form-input" type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setTaskModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : (editingTask ? 'Salvar' : 'Criar Tarefa')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
