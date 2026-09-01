import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileAPI, educationAPI } from '../utils/api';

export default function UserProfile() {
  const { user, updateUser, logout } = useAuth();

  const [local, setLocal] = useState({ name: '', email: '', department: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [educations, setEducations] = useState([]);
  const [showEduModal, setShowEduModal] = useState(false);
  const [eduForm, setEduForm] = useState({ institution: '', degree: '', startDate: '', endDate: '', certificate: null });
  const [preview, setPreview] = useState(null);



  useEffect(() => {
    if (user) setLocal({ name: user.name || '', email: user.email || '', department: user.department || '' });
  }, [user]);

  useEffect(() => {
    fetchEducations();
  }, []);

  const fetchEducations = async () => {
    try {
      const res = await educationAPI.list();
      setEducations(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };



  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleSaveClick = () => setShowConfirmModal(true);

  const performSave = async () => {
    setShowConfirmModal(false);
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await profileAPI.update({ name: local.name, email: local.email, department: local.department });
      if (res.data) updateUser(res.data);
      setSuccess('Perfil atualizado com sucesso');
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

  const hasChanges = user ? (local.name !== (user.name || '') || local.email !== (user.email || '') || local.department !== (user.department || '')) : false;

  return (
    <div>
      <div className="grid-2" style={{ gridTemplateColumns: '320px 1fr', gap: 20 }}>
        <div>
          <div className="card" style={{ textAlign: 'center', padding: 28 }}>
            <div className="avatar xl" style={{ margin: '0 auto 12px', width: 80, height: 80, fontSize: 28, borderRadius: 14, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{user.avatar}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{user.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{user.email}</div>

            {user.department && (
              <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>badge</span>
                <span>{user.department}</span>
              </div>
            )}



          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header" style={{ marginBottom: 12 }}>
              <div className="card-title">Dados Pessoais</div>
              <div>
                {hasChanges && (
                  <button className="btn btn-primary" onClick={handleSaveClick} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Edição'}</button>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nome</label>
              <input className="form-input" value={local.name} onChange={e => setLocal(s => ({ ...s, name: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={local.email} onChange={e => setLocal(s => ({ ...s, email: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Departamento</label>
              <input className="form-input" value={local.department} onChange={e => setLocal(s => ({ ...s, department: e.target.value }))} />
            </div>

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

      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ padding: 24, maxWidth: 400, textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--accent-blue)', marginBottom: 16 }}>help</span>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Salvar Alterações</div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Tem certeza que deseja salvar as alterações no seu perfil?</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn" onClick={() => setShowConfirmModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={performSave}>Sim, Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .toast-animate {
          animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 9999 }}>
        {success && (
          <div className="toast-animate" style={{ background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{success}</span>
          </div>
        )}
        {error && (
          <div className="toast-animate" style={{ background: '#ef4444', color: '#fff', padding: '12px 20px', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>error</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
