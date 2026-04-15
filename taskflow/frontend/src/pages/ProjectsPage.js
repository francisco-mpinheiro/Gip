import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { projectsAPI, usersAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTS = [
  { value: 'planejamento', label: 'Planejamento' },
  { value: 'em_progresso', label: 'Em Progresso' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
];
const PRIORITY_OPTS = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
];
const STATUS_CLASS = { em_progresso: 'badge-em_progresso', planejamento: 'badge-planejamento', concluido: 'badge-concluido', cancelado: 'badge-cancelado' };
const STATUS_LABEL = { em_progresso: 'Em Progresso', planejamento: 'Planejamento', concluido: 'Concluído', cancelado: 'Cancelado' };
const progressColor = (p) => p >= 70 ? 'progress-green' : p >= 30 ? 'progress-blue' : 'progress-amber';

const emptyForm = { name: '', description: '', status: 'planejamento', priority: 'media', startDate: '', endDate: '', managerId: '', members: [] };

export default function ProjectsPage() {
  const { user, canDo } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([projectsAPI.getAll(), usersAPI.getAll()])
      .then(([p, u]) => { setProjects(p.data); setUsers(u.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (p, e) => {
    e.stopPropagation();
    setEditing(p);
    setForm({
      name: p.name, description: p.description || '', status: p.status,
      priority: p.priority, startDate: p.startDate ? p.startDate.slice(0, 10) : '',
      endDate: p.endDate ? p.endDate.slice(0, 10) : '',
      managerId: p.managerId || '', members: p.members || [],
    });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing) await projectsAPI.update(editing.id, payload);
      else await projectsAPI.create(payload);
      setModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Excluir este projeto?')) return;
    await projectsAPI.delete(id).catch(err => alert(err.response?.data?.message));
    load();
  };

  const toggleMember = (uid) => {
    setForm(f => ({
      ...f,
      members: f.members.includes(uid) ? f.members.filter(m => m !== uid) : [...f.members, uid]
    }));
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus ? p.status === filterStatus : true;
    return matchSearch && matchStatus;
  });

  return (
    <AppLayout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Projetos</h1>
          <p>{projects.length} projetos no total</p>
        </div>
        {canDo('create_project') && (
          <button className="btn btn-primary" onClick={openCreate}>+ Novo Projeto</button>
        )}
      </div>

      {/* FILTER BAR */}
      <div className="filter-bar">
        <div className="filter-search">
         
          <input
            placeholder="Buscar projetos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Carregando...</div>
      ) : filtered.length === 0 ? (
    <div className="empty-state">
  <div className="empty-state-icon">
    <i className="bi bi-folder"></i>
  </div>

  <p>Nenhum projeto encontrado</p>

  {canDo('create_project') && (
    <button
      className="btn btn-primary"
      style={{ marginTop: 16 }}
      onClick={openCreate}
    >
      + Criar Projeto
    </button>
  )}
</div>
      ) : (
        <div className="projects-grid">
          {filtered.map(p => {
            const memberAvatars = (p.members || []).slice(0, 4).map(uid => users.find(u => u.id === uid)).filter(Boolean);
            return (
              <div key={p.id} className="project-card" onClick={() => navigate(`/projects/${p.id}`)}>
                <div className="project-card-header">
                  <div>
                    <span className={`badge ${STATUS_CLASS[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                    <div className="project-card-name" style={{ marginTop: 8 }}>{p.name}</div>
                  </div>
                  <span className={`badge badge-${p.priority}`} style={{ marginTop: 2 }}>{p.priority}</span>
                </div>
                <p className="project-card-desc">{p.description || 'Sem descrição'}</p>

                <div className="flex-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Progresso</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{p.progress}%</span>
                </div>
                <div className="progress-bar" style={{ marginBottom: 14 }}>
                  <div className={`progress-bar-fill ${progressColor(p.progress)}`} style={{ width: `${p.progress}%` }} />
                </div>

                <div className="project-card-footer">
                  <div className="project-members">
                    {memberAvatars.map(u => (
                      <div key={u.id} className="avatar sm" title={u.name}>{u.avatar}</div>
                    ))}
                    {p.memberCount > 4 && (
                      <div className="avatar sm" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: 10 }}>+{p.memberCount - 4}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {p.endDate && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        🕐 {new Date(p.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                    {canDo('edit_project') && (
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={e => openEdit(p, e)} title="Editar">✏</button>
                    )}
                    {canDo('delete_project') && (
                      <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--accent-red)' }} onClick={e => handleDelete(p.id, e)} title="Excluir">🗑</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Editar Projeto' : 'Novo Projeto'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label">Nome do Projeto *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex: Sistema de Gestão v2.0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreva o projeto..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prioridade</label>
                    <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                      {PRIORITY_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Data de Início</label>
                    <input className="form-input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data de Prazo</label>
                    <input className="form-input" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Gerente do Projeto</label>
                  <select className="form-select" value={form.managerId} onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}>
                    <option value="">Selecionar...</option>
                    {users.filter(u => u.active).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Membros da Equipe</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px', background: 'var(--bg-input)', borderRadius: 6, border: '1px solid var(--border)', maxHeight: 160, overflowY: 'auto' }}>
                    {users.filter(u => u.active).map(u => (
                      <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 8px', borderRadius: 5, background: form.members.includes(u.id) ? 'var(--accent-blue-dim)' : 'transparent', border: `1px solid ${form.members.includes(u.id) ? 'var(--accent-blue)' : 'transparent'}`, transition: 'all 0.15s' }}>
                        <input type="checkbox" checked={form.members.includes(u.id)} onChange={() => toggleMember(u.id)} style={{ display: 'none' }} />
                        <div className="avatar sm">{u.avatar}</div>
                        <span style={{ fontSize: 12, color: form.members.includes(u.id) ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{u.name.split(' ')[0]}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : (editing ? 'Salvar Alterações' : 'Criar Projeto')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
