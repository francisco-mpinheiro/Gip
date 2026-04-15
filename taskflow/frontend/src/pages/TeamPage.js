import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { usersAPI } from '../utils/api';
import { ROLE_LABELS } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';

const DEPT_COLORS = {
  'TI': '#3b82f6', 'Desenvolvimento': '#8b5cf6', 'Design': '#ec4899',
  'QA': '#f59e0b', 'Diretoria': '#10b981', 'Geral': '#94a3b8',
};

export default function TeamPage() {
  const { canDo } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [view, setView] = useState('grid');

  useEffect(() => {
    usersAPI.getAll()
      .then(r => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const departments = [...new Set(users.map(u => u.department).filter(Boolean))];
  const filtered = users.filter(u => {
    const s = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const d = filterDept ? u.department === filterDept : true;
    return s && d;
  });

  const grouped = departments.reduce((acc, dept) => {
    acc[dept] = filtered.filter(u => u.department === dept);
    return acc;
  }, {});

  if (loading) return <AppLayout><div className="loading"><div className="spinner" />Carregando...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Equipe</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            {users.filter(u => u.active).length} membros ativos · {departments.length} departamentos
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {['grid', 'table'].map(v => (
              <button
                key={v}
                className="btn btn-ghost btn-sm"
                style={{
                  borderRadius: 0,
                  color: view === v ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: view === v ? 'var(--accent-blue-dim)' : 'transparent',
                  padding: '7px 14px'
                }}
                onClick={() => setView(v)}
              >
                {v === 'grid' ? '⊞ Grade' : '☰ Tabela'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {departments.map(dept => {
          const count = users.filter(u => u.department === dept && u.active).length;
          const color = DEPT_COLORS[dept] || '#94a3b8';
          return (
            <div
              key={dept}
              className="card"
              style={{
                padding: '12px 16px', cursor: 'pointer',
                borderLeft: `3px solid ${color}`,
                background: filterDept === dept ? 'var(--bg-card-hover)' : 'var(--bg-card)',
              }}
              onClick={() => setFilterDept(filterDept === dept ? '' : dept)}
            >
              <div style={{ fontSize: 18, fontWeight: 800, color }}>{count}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>{dept}</div>
            </div>
          );
        })}
      </div>

      {/* FILTER BAR */}
      <div className="filter-bar">
        <div className="filter-search">
          <span className="filter-search-icon">🔍</span>
          <input placeholder="Buscar membros..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">Todos departamentos</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {view === 'grid' ? (
        filterDept ? (
          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {filtered.map(u => <MemberCard key={u.id} user={u} />)}
          </div>
        ) : (
          Object.entries(grouped).map(([dept, members]) =>
            members.length > 0 && (
              <div key={dept} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: DEPT_COLORS[dept] || '#94a3b8', display: 'inline-block' }} />
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{dept}</h3>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>({members.length})</span>
                </div>
                <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                  {members.map(u => <MemberCard key={u.id} user={u} />)}
                </div>
              </div>
            )
          )
        )
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Membro</th>
                  <th>Função</th>
                  <th>Departamento</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar">{u.avatar}</div>
                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                      </div>
                    </td>
                    <td><span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{ROLE_LABELS[u.role]}</span></td>
                    <td>
                      <span style={{ fontSize: 12, color: DEPT_COLORS[u.department] || '#94a3b8', fontWeight: 600 }}>
                        {u.department}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className={`team-status ${u.active ? 'active' : 'inactive'}`} />
                        <span style={{ fontSize: 12, color: u.active ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                          {u.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function MemberCard({ user }) {
  return (
    <div className="team-card">
      <div className="avatar lg" style={{ background: user.active ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'var(--bg-input)' }}>
        {user.avatar}
      </div>
      <div className="team-info">
        <div className="team-name">{user.name}</div>
        <div className="team-role-label">{ROLE_LABELS[user.role]}</div>
        <div className="team-dept">{user.department} · {user.email}</div>
      </div>
      <div className={`team-status ${user.active ? 'active' : 'inactive'}`} title={user.active ? 'Ativo' : 'Inativo'} />
    </div>
  );
}
