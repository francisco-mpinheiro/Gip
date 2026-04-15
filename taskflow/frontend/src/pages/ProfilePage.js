import React, { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';
import { usersAPI } from '../utils/api';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', department: user?.department || '', password: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.password && form.password !== form.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = { name: form.name, email: form.email, department: form.department };
      if (form.password) payload.password = form.password;
      await usersAPI.update(user.id, payload);
      setSuccess('Perfil atualizado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao atualizar');
    } finally { setSaving(false); }
  };

  const roleColor = {
    admin_platform: '#ef4444', admin_company: '#f59e0b',
    manager_area: '#8b5cf6', project_manager: '#3b82f6', employee: '#22c55e',
  };

  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Meu Perfil</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Gerencie suas informações pessoais</p>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '320px 1fr', gap: 20 }}>
        {/* PROFILE CARD */}
        <div>
          <div className="card" style={{ textAlign: 'center', padding: 28 }}>
            <div className="avatar xl" style={{ margin: '0 auto 16px', width: 72, height: 72, fontSize: 24 }}>
              {user?.avatar}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{user?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{user?.email}</div>
            <div style={{ marginTop: 12 }}>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
                color: roleColor[user?.role],
                background: `${roleColor[user?.role]}22`,
              }}>
                {ROLE_LABELS[user?.role]}
              </span>
            </div>
            {user?.department && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-muted)' }}>🏢 {user.department}</div>
            )}
            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>—</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Projetos</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>—</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Tarefas</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16, padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Permissões</div>
            {[
              { label: 'Gerenciar Usuários', ok: ['admin_platform', 'admin_company'].includes(user?.role) },
              { label: 'Criar Projetos', ok: ['admin_platform', 'admin_company', 'manager_area', 'project_manager'].includes(user?.role) },
              { label: 'Criar Tarefas', ok: ['admin_platform', 'admin_company', 'manager_area', 'project_manager'].includes(user?.role) },
              { label: 'Ver Desempenho', ok: ['admin_platform', 'admin_company', 'manager_area', 'project_manager'].includes(user?.role) },
              { label: 'Ver Equipe', ok: true },
            ].map(p => (
              <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{p.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: p.ok ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                  {p.ok ? '✓ Sim' : '✕ Não'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* EDIT FORM */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: 20 }}>
            <span className="card-title">Editar Informações</span>
          </div>

          {success && (
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#4ade80', marginBottom: 16 }}>
              ✓ {success}
            </div>
          )}
          {error && (
            <div className="auth-error" style={{ marginBottom: 16 }}>⚠ {error}</div>
          )}

          <form onSubmit={handleSave}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Departamento</label>
              <input className="form-input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="Ex: Desenvolvimento" />
            </div>
            <div className="form-group">
              <label className="form-label">Função / Papel</label>
              <input className="form-input" value={ROLE_LABELS[user?.role]} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>
            <div className="divider" />
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Alterar Senha</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nova Senha</label>
                <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Deixe em branco para manter" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmar Senha</label>
                <input className="form-input" type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repita a nova senha" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn btn-danger" onClick={logout}>Sair da Conta</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Alterações'}</button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
