import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileAPI, educationAPI, projectsAPI, tasksAPI } from '../utils/api';

export default function UserProfile() {
  const { user, updateUser, logout } = useAuth();

  const [mode, setMode] = useState('read');
  const [local, setLocal] = useState({ name: '', email: '', department: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [educations, setEducations] = useState([]);
  const [showEduModal, setShowEduModal] = useState(false);
  const [eduForm, setEduForm] = useState({ institution: '', degree: '', startDate: '', endDate: '', certificate: null });
  const [preview, setPreview] = useState(null);

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    if (user) setLocal({ name: user.name || '', email: user.email || '', department: user.department || '' });
  }, [user]);

  useEffect(() => {
    fetchEducations();
    fetchProjects();
    fetchTasks();
  }, []);

  const fetchEducations = async () => {
    try {
      const res = await educationAPI.list();
      setEducations(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await projectsAPI.getAll();
      setProjects(res.data || []);
    } catch (err) {
      console.error(err);
      setProjects([]);
    } finally { setLoadingProjects(false); }
  };

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await tasksAPI.getAll();
      setTasks(res.data || []);
    } catch (err) {
      console.error(err);
      setTasks([]);
    } finally { setLoadingTasks(false); }
  };

  const beginEdit = () => setMode('edit');
  const cancelEdit = () => { setMode('read'); setError(''); };

  const save = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await profileAPI.update({ name: local.name, email: local.email, department: local.department });
      if (res.data) updateUser(res.data);
      setSuccess('Perfil atualizado com sucesso');
      setMode('read');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  // change password
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const changePassword = async (e) => {
    e.preventDefault();
    if (!pwCurrent || !pwNew) { setError('Preencha as senhas'); return; }
    try {
      await profileAPI.changePassword({ currentPassword: pwCurrent, newPassword: pwNew });
      setSuccess('Senha alterada'); setPwCurrent(''); setPwNew('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao alterar senha');
    }
  };

  // educations
  const handleEduFile = (e) => setEduForm(f => ({ ...f, certificate: e.target.files[0] }));
  const handleCreateEdu = async (ev) => {
    ev.preventDefault();
    if (!eduForm.institution || !eduForm.degree || !eduForm.certificate) { setError('Preencha todos os campos'); return; }
    const fd = new FormData();
    fd.append('institution', eduForm.institution);
    fd.append('degree', eduForm.degree);
    if (eduForm.startDate) fd.append('startDate', eduForm.startDate);
    if (eduForm.endDate) fd.append('endDate', eduForm.endDate);
    fd.append('certificate', eduForm.certificate);
    try {
      await educationAPI.create(fd);
      setSuccess('Formação adicionada'); setShowEduModal(false);
      setEduForm({ institution: '', degree: '', startDate: '', endDate: '', certificate: null });
      fetchEducations();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao adicionar formação');
    }
  };
  const handleDeleteEdu = async (id) => {
    if (!window.confirm('Remover formação?')) return;
    try {
      await educationAPI.remove(id);
      setSuccess('Formação removida'); fetchEducations();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao remover');
    }
  };

  if (!user) return <div>Carregando...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Meu Perfil</h1>
        <p>Visão geral dos seus projetos, tarefas e formações.</p>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '320px 1fr', gap: 20 }}>
        <div>
          <div className="card" style={{ textAlign: 'center', padding: 28 }}>
            <div className="avatar xl" style={{ margin: '0 auto 12px', width: 80, height: 80, fontSize: 28, borderRadius: 14, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{user.avatar}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{user.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{user.email}</div>
            <div style={{ marginTop: 12 }}>
              <span className="badge" style={{ padding: '6px 12px' }}>{user.role}</span>
            </div>
            {user.department && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>🏢 {user.department}</div>}
            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <div className="metric-value" style={{ fontSize: 20 }}>{loadingProjects ? '…' : projects.length}</div>
                <div className="metric-label">Projetos</div>
              </div>
              <div>
                <div className="metric-value" style={{ fontSize: 20 }}>{loadingTasks ? '…' : tasks.length}</div>
                <div className="metric-label">Tarefas</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header" style={{ marginBottom: 12 }}>
              <div className="card-title">Dados Pessoais</div>
              <div>
                {mode === 'read' ? (
                  <button className="btn" onClick={() => setMode('edit')}>Editar</button>
                ) : (
                  <>
                    <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
                    <button className="btn btn-ghost" onClick={cancelEdit}>Cancelar</button>
                  </>
                )}
              </div>
            </div>

            {success && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#4ade80', marginBottom: 12 }}>✓ {success}</div>}
            {error && <div className="auth-error" style={{ marginBottom: 12 }}>⚠ {error}</div>}

            <div className="form-group">
              <label className="form-label">Nome</label>
              <input className="form-input" value={local.name} onChange={e => setLocal(s => ({ ...s, name: e.target.value }))} disabled={mode === 'read'} />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={local.email} onChange={e => setLocal(s => ({ ...s, email: e.target.value }))} disabled={mode === 'read'} />
            </div>

            <div className="form-group">
              <label className="form-label">Departamento</label>
              <input className="form-input" value={local.department} onChange={e => setLocal(s => ({ ...s, department: e.target.value }))} disabled={mode === 'read'} />
            </div>

            <div className="divider" />

            {mode === 'read' && (
              <div style={{ marginTop: 12 }}>
                <div className="card-header"><div className="card-title">Projetos</div></div>
                {loadingProjects ? (
                  <div style={{ color: 'var(--text-secondary)' }}>Carregando projetos...</div>
                ) : projects.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)' }}>Nenhum projeto encontrado.</div>
                ) : (
                  <div>
                    {projects.map(p => (
                      <div key={p.id} className="project-item">
                        <div className="project-item-header">
                          <div className="project-name">{p.name}</div>
                          <div className="project-pct">{p.progress || 0}%</div>
                        </div>
                        <div className="project-meta">
                          <div className="project-meta-item">{p.status}</div>
                          <div className="project-meta-item">{(p.memberCount || 0) + ' membros'}</div>
                        </div>
                        <div className="progress-bar" style={{ marginTop: 8 }}>
                          <div className={`progress-bar-fill progress-blue`} style={{ width: `${p.progress || 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ height: 16 }} />

                <div className="card-header"><div className="card-title">Tarefas</div></div>
                {loadingTasks ? (
                  <div style={{ color: 'var(--text-secondary)' }}>Carregando tarefas...</div>
                ) : tasks.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)' }}>Nenhuma tarefa encontrada.</div>
                ) : (
                  <div>
                    {tasks.map(t => (
                      <div key={t.id} className="task-item">
                        <div className={`task-checkbox ${t.status === 'concluido' ? 'checked' : ''}`} />
                        <div className="task-content">
                          <div className={`task-title ${t.status === 'concluido' ? 'done' : ''}`}>{t.title}</div>
                          <div className="task-meta">
                            <div className="task-project">{t.project?.name || ''}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.assignee?.name || ''}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: t.overdue ? 'var(--accent-red)' : 'var(--text-secondary)' }}>{t.status}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {mode === 'edit' && (
              <>
                <div className="divider" style={{ marginTop: 14 }} />

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Segurança</div>
                  <form onSubmit={changePassword}>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Senha Atual</label><input className="form-input" type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} /></div>
                      <div className="form-group"><label className="form-label">Nova Senha</label><input className="form-input" type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} /></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                      <button type="submit" className="btn btn-primary">Alterar Senha</button>
                    </div>
                  </form>
                </div>
              </>
            )}

            <div className="divider" style={{ marginTop: 14 }} />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn btn-danger" onClick={logout}>Sair da Conta</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div className="card">
          <div className="card-header" style={{ marginBottom: 10 }}>
            <div className="card-title">Formações Acadêmicas</div>
            <div><button className="btn btn-sm" onClick={() => setShowEduModal(true)}>+ Adicionar Formação</button></div>
          </div>
          <div style={{ marginTop: 6 }}>
            {educations.length === 0 && <div style={{ color: 'var(--text-secondary)', padding: 12 }}>Nenhuma formação cadastrada.</div>}
            {educations.map(ed => (
              <div key={ed.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{ed.institution} — {ed.degree}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ed.startDate ? new Date(ed.startDate).toLocaleDateString() : ''} {ed.endDate ? `— ${new Date(ed.endDate).toLocaleDateString()}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {ed.certificateUrl && (
                    ed.certificateUrl.match(/\.(jpg|jpeg|png)$/i) ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => setPreview({ type: 'image', url: ed.certificateUrl })}>Visualizar</button>
                    ) : (
                      <a className="btn btn-ghost btn-sm" href={ed.certificateUrl} target="_blank" rel="noreferrer">Ver Certificado</a>
                    )
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteEdu(ed.id)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showEduModal && (
        <div className="modal-overlay" onClick={() => setShowEduModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ padding: 18 }}>
            <div className="modal-header">
              <div className="modal-title">Adicionar Formação</div>
              <button className="modal-close btn-ghost" onClick={() => setShowEduModal(false)}>✕</button>
            </div>
            <div style={{ padding: '0 20px 20px' }}>
              <form onSubmit={handleCreateEdu}>
                <div className="form-group">
                  <label className="form-label">Instituição</label>
                  <input className="form-input" value={eduForm.institution} onChange={e => setEduForm(f => ({ ...f, institution: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Grau / Curso</label>
                  <input className="form-input" value={eduForm.degree} onChange={e => setEduForm(f => ({ ...f, degree: e.target.value }))} required />
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Início</label><input className="form-input" type="date" value={eduForm.startDate} onChange={e => setEduForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Fim</label><input className="form-input" type="date" value={eduForm.endDate} onChange={e => setEduForm(f => ({ ...f, endDate: e.target.value }))} /></div>
                </div>
                <div className="form-group">
                  <label className="form-label">Certificado (PDF/JPG/PNG, máx 5MB)</label>
                  <input className="form-input" type="file" accept="application/pdf,image/*" onChange={handleEduFile} required />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" className="btn" onClick={() => setShowEduModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="modal-overlay" onClick={() => setPreview(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ padding: 16, maxWidth: '90vw' }}>
            <div style={{ textAlign: 'right' }}><button className="modal-close btn-ghost" onClick={() => setPreview(null)}>✕</button></div>
            <div style={{ padding: '6px 12px 18px' }}>
              {preview.type === 'image' ? (
                <img src={preview.url} alt="Certificado" style={{ maxWidth: '60vw', maxHeight: '70vh', display: 'block', margin: '0 auto', borderRadius: 8, border: '1px solid var(--border)', padding: 8, background: 'var(--bg-card)' }} />
              ) : (
                <iframe src={preview.url} title="Certificado" style={{ width: '80vw', height: '80vh' }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
