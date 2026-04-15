import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { tasksAPI, projectsAPI, usersAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const STATUS_LABEL = { a_fazer: 'A Fazer', em_andamento: 'Em Andamento', concluido: 'Concluído' };
const STATUS_CLASS = { a_fazer: 'badge-a_fazer', em_andamento: 'badge-em_andamento', concluido: 'badge-concluido' };
const PRIORITY_CLASS = { alta: 'badge-alta', media: 'badge-media', baixa: 'badge-baixa' };
const COLUMNS = [
  { key: 'a_fazer', label: 'A Fazer', color: '#94a3b8' },
  { key: 'em_andamento', label: 'Em Andamento', color: '#3b82f6' },
  { key: 'concluido', label: 'Concluído', color: '#22c55e' },
];

const emptyForm = { title: '', description: '', projectId: '', assigneeId: '', status: 'a_fazer', priority: 'media', dueDate: '' };

export default function TasksPage() {
  const { user, canDo } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [dragging, setDragging] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([tasksAPI.getAll(), projectsAPI.getAll(), usersAPI.getAll()])
      .then(([t, p, u]) => { setTasks(t.data); setProjects(p.data); setUsers(u.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({
      title: t.title, description: t.description || '',
      projectId: t.projectId || '', assigneeId: t.assigneeId || '',
      status: t.status, priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '',
    });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await tasksAPI.update(editing.id, form);
      else await tasksAPI.create(form);
      setModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta tarefa?')) return;
    await tasksAPI.delete(id);
    load();
  };

  const handleStatusChange = async (id, status) => {
    await tasksAPI.updateStatus(id, status);
    load();
  };

  const handleDrop = async (col) => {
    if (dragging && dragging.status !== col) {
      await tasksAPI.updateStatus(dragging.id, col);
      load();
    }
    setDragging(null);
  };

  const filtered = tasks.filter(t => {
    const s = t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.project?.name?.toLowerCase().includes(search.toLowerCase());
    const st = filterStatus ? t.status === filterStatus : true;
    const pr = filterPriority ? t.priority === filterPriority : true;
    return s && st && pr;
  });

  const tasksByCol = COLUMNS.reduce((acc, col) => {
    acc[col.key] = filtered.filter(t => t.status === col.key);
    return acc;
  }, {});

  const projectMembers = form.projectId
    ? (projects.find(p => p.id === form.projectId)?.members || [])
    : [];
  const assignableUsers = form.projectId
    ? users.filter(u => projectMembers.includes(u.id))
    : users;

  return (
    <AppLayout>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Tarefas</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{filtered.length} tarefas encontradas</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {['list', 'kanban'].map(v => (
              <button
                key={v}
                className="btn btn-ghost btn-sm"
                style={{ borderRadius: 0, color: view === v ? 'var(--text-primary)' : 'var(--text-muted)', background: view === v ? 'var(--accent-blue-dim)' : 'transparent', padding: '7px 14px' }}
                onClick={() => setView(v)}
              >
                {v === 'list' ? '☰ Lista' : '⊞ Kanban'}
              </button>
            ))}
          </div>
          {canDo('create_task') && (
            <button className="btn btn-primary" onClick={openCreate}>+ Nova Tarefa</button>
          )}
        </div>
      </div>

      {/* FILTERS */}
      <div className="filter-bar">
        <div className="filter-search">
          <span className="filter-search-icon">🔍</span>
          <input placeholder="Buscar tarefas..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos status</option>
          {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <select className="filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">Todas prioridades</option>
          <option value="alta">Alta</option>
          <option value="media">Média</option>
          <option value="baixa">Baixa</option>
        </select>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Carregando...</div>
      ) : view === 'kanban' ? (
        // ── KANBAN VIEW ──────────────────────────────────────────────────────
        <div className="kanban-board">
          {COLUMNS.map(col => (
            <div
              key={col.key}
              className="kanban-col"
              style={{ borderTop: `3px solid ${col.color}` }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(col.key)}
            >
              <div className="kanban-col-header">
                <span className="kanban-col-title" style={{ color: col.color }}>
                  {col.label}
                  <span className="kanban-col-count">{tasksByCol[col.key].length}</span>
                </span>
              </div>
              {tasksByCol[col.key].map(t => (
                <div
                  key={t.id}
                  className="kanban-card"
                  draggable
                  onDragStart={() => setDragging(t)}
                  style={{ borderLeft: t.overdue ? '3px solid var(--accent-red)' : '3px solid transparent' }}
                >
                  <div className="kanban-card-title">{t.title}</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span className={`badge ${PRIORITY_CLASS[t.priority]}`}>{t.priority}</span>
                    {t.project && <span style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '2px 7px', borderRadius: 4 }}>{t.project.name}</span>}
                    {t.overdue && <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>Atrasada</span>}
                  </div>
                  <div className="kanban-card-footer">
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {t.assignee && <div className="avatar sm" title={t.assignee.name}>{t.assignee.avatar}</div>}
                      {t.dueDate && (
                        <span className={`kanban-card-date ${t.overdue ? 'overdue' : ''}`}>
                          🕐 {new Date(t.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                    <button className="btn btn-ghost btn-sm btn-icon" style={{ padding: '3px 6px' }} onClick={() => openEdit(t)}>✏</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        // ── LIST VIEW ────────────────────────────────────────────────────────
        <div className="card">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <p>Nenhuma tarefa encontrada</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Tarefa</th>
                    <th>Projeto</th>
                    <th>Responsável</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th>Prazo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t.title}</div>
                        {t.overdue && <span style={{ fontSize: 11, color: 'var(--accent-red)' }}>⚠ Atrasada</span>}
                      </td>
                      <td>
                        {t.project ? (
                          <span
                            style={{ color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 12.5 }}
                            onClick={() => navigate(`/projects/${t.projectId}`)}
                          >{t.project.name}</span>
                        ) : '—'}
                      </td>
                      <td>
                        {t.assignee ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div className="avatar sm">{t.assignee.avatar}</div>
                            <span style={{ fontSize: 12.5 }}>{t.assignee.name.split(' ')[0]}</span>
                          </div>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td><span className={`badge ${PRIORITY_CLASS[t.priority]}`}>{t.priority}</span></td>
                      <td>
                        <select
                          className="filter-select"
                          style={{ padding: '4px 8px', fontSize: 11.5 }}
                          value={t.status}
                          onChange={e => handleStatusChange(t.id, e.target.value)}
                        >
                          {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                      </td>
                      <td style={{ fontSize: 12.5, color: t.overdue ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(t)}>✏</button>
                          {canDo('create_task') && (
                            <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(t.id)}>🗑</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label">Título *</label>
                  <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Título da tarefa" />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalhes..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Projeto *</label>
                  <select className="form-select" value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value, assigneeId: '' }))} required>
                    <option value="">Selecionar projeto...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Responsável</label>
                    <select className="form-select" value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}>
                      <option value="">Sem responsável</option>
                      {assignableUsers.filter(u => u.active).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prioridade</label>
                    <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                </div>
                {editing && (
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Prazo</label>
                  <input className="form-input" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : (editing ? 'Salvar' : 'Criar Tarefa')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
