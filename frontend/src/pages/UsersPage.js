import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { usersAPI } from '../utils/api';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';

const ROLES = [
  { value: 'admin_platform', label: 'Admin da Plataforma' },
  { value: 'admin_company', label: 'Admin da Empresa' },
  { value: 'manager_area', label: 'Gestor de Área' },
  { value: 'project_manager', label: 'Gerente de Projeto' },
  { value: 'employee', label: 'Funcionário' },
];
const emptyForm = { name: '', email: '', cpf: '', password: '', role: 'employee', department: '' };

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const load = () => {
    setLoading(true);
    usersAPI.getAll()
      .then(r => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, cpf: u.cpf || '', password: '', role: u.role, department: u.department || '' });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password;
      if (editing) await usersAPI.update(editing.id, payload);
      else await usersAPI.create(payload);
      setModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const handleToggle = async (id) => {
    await usersAPI.toggleActive(id).catch(err => alert(err.response?.data?.message));
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este usuário permanentemente?')) return;
    await usersAPI.delete(id).catch(err => alert(err.response?.data?.message));
    load();
  };

  const filtered = users.filter(u => {
    const s = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const r = filterRole ? u.role === filterRole : true;
    return s && r;
  });

  const roleColor = {
    admin_platform: '#ef4444', admin_company: '#f59e0b',
    manager_area: '#8b5cf6', project_manager: '#3b82f6', employee: '#22c55e',
  };

  return (
    <AppLayout>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Gerenciar Usuários</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            {users.length} usuários · {users.filter(u => u.active).length} ativos
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Novo Usuário</button>
      </div>

      {/* ROLE STATS */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {ROLES.map(r => {
          const cnt = users.filter(u => u.role === r.value).length;
          return (
            <div
              key={r.value}
              className="card"
              style={{
                padding: '10px 14px', cursor: 'pointer', flexShrink: 0,
                borderLeft: `3px solid ${roleColor[r.value]}`,
                background: filterRole === r.value ? 'var(--bg-card-hover)' : 'var(--bg-card)',
              }}
              onClick={() => setFilterRole(filterRole === r.value ? '' : r.value)}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: roleColor[r.value] }}>{cnt}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, maxWidth: 100 }}>{r.label}</div>
            </div>
          );
        })}
      </div>

      {/* FILTER */}
      <div className="filter-bar">
        <div className="filter-search">
          <span className="filter-search-icon">🔍</span>
          <input placeholder="Buscar usuários..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Todos os papéis</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Carregando...</div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Email</th>
                  <th>Papel</th>
                  <th>Departamento</th>
                  <th>Cadastro</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ opacity: u.active ? 1 : 0.4 }}>{u.avatar}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.name}</div>
                          {u.cpf && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.cpf}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>
                      <span style={{
                        fontSize: 11.5, fontWeight: 600,
                        color: roleColor[u.role],
                        background: `${roleColor[u.role]}22`,
                        padding: '3px 8px', borderRadius: 5,
                      }}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{u.department || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td>
                      <div
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '3px 10px', borderRadius: 20,
                          background: u.active ? 'rgba(34,197,94,0.1)' : 'rgba(148,163,184,0.1)',
                          cursor: u.id !== currentUser?.id ? 'pointer' : 'default',
                          fontSize: 11.5, fontWeight: 600,
                          color: u.active ? 'var(--accent-green)' : 'var(--text-muted)',
                        }}
                        onClick={() => u.id !== currentUser?.id && handleToggle(u.id)}
                        title={u.id !== currentUser?.id ? 'Clique para alterar' : 'Sua conta'}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                        {u.active ? 'Ativo' : 'Inativo'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(u)} title="Editar">✏</button>
                        {currentUser?.role === 'admin_platform' && u.id !== currentUser?.id && (
                          <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(u.id)} title="Excluir">🗑</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label">Nome Completo *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Nome do usuário" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="email@empresa.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CPF</label>
                    <input className="form-input" value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Papel / Função *</label>
                    <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Departamento</label>
                    <input className="form-input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="Ex: TI, Design..." />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{editing ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</label>
                  <input
                    className="form-input"
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required={!editing}
                    placeholder="••••••••"
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : (editing ? 'Salvar' : 'Criar Usuário')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
