import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    if (!pw || pw.length < 6) return setError('Senha deve ter ao menos 6 caracteres');
    if (pw !== confirm) return setError('Senhas não coincidem');
    try {
      await authAPI.resetPassword({ token, newPassword: pw });
      setSuccess('Senha alterada com sucesso! Você pode entrar agora.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao redefinir');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: '40px auto' }}>
      <h2>Redefinir Senha</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {success && <div style={{ color: 'green' }}>{success}</div>}
      <form onSubmit={handleReset}>
        <div style={{ marginTop: 12 }}>
          <label>Nova Senha</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} className="form-input" />
        </div>
        <div style={{ marginTop: 12 }}>
          <label>Confirmar Senha</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="form-input" />
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-primary" type="submit">Redefinir Senha</button>
        </div>
      </form>
    </div>
  );
}
