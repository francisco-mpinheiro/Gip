import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: '⊞', title: 'Dashboard Inteligente', desc: 'Métricas e KPIs em tempo real' },
  { icon: '👥', title: 'Gestão de Equipes', desc: 'Colaboração eficiente entre membros' },
  { icon: '✅', title: 'Tarefas & Projetos', desc: 'Organize e acompanhe entregas' },
  { icon: '📈', title: 'Produtividade', desc: 'Relatórios detalhados por papel' },
  { icon: '⏱', title: 'Prazos & Prioridades', desc: 'Controle de tempo e entregáveis' },
  { icon: '🛡', title: 'RBAC Avançado', desc: 'Acesso granular por função' },
];

const DEMO_USERS = [
  { label: 'Admin Plataforma', email: 'admin@taskflow.com', color: '#ef4444' },
  { label: 'Admin Empresa',    email: 'carlos@empresa.com', color: '#f59e0b' },
  { label: 'Gestora de Área',  email: 'ana@empresa.com',    color: '#8b5cf6' },
  { label: 'Gerente Projeto',  email: 'bruno@empresa.com',  color: '#3b82f6' },
  { label: 'Funcionária',      email: 'lucia@empresa.com',  color: '#22c55e' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [mode, setMode]     = useState('login');
  const [form, setForm]     = useState({ email: '', password: '' });
  const [showPass, setShow] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoad]  = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoad(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Credenciais inválidas');
    } finally { setLoad(false); }
  };

  return (
    <div style={css.page}>
      {/* ══ LEFT ══════════════════════════════════════════════════════════ */}
      <div style={css.left}>
        <div style={css.leftGlow} />

        <div style={css.logo}>
          <div style={css.logoBox}>⚡</div>
          <span style={css.logoText}>TaskFlow</span>
        </div>

        <h1 style={css.headline}>
          Transforme a<br />
          <span style={{ color: '#3b82f6' }}>gestão</span> da<br />
          sua equipe
        </h1>

        <p style={css.desc}>
          Centralize projetos, otimize processos e aumente a produtividade
          com controle total, visibilidade e resultados mensuráveis.
        </p>

        <div style={css.features}>
          {FEATURES.map(f => (
            <div key={f.title} style={css.feat}>
              <div style={css.featIcon}>{f.icon}</div>
              <div>
                <div style={css.featTitle}>{f.title}</div>
                <div style={css.featDesc}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={css.stats}>
          {[['4+','Tipos de usuários'],['9','Módulos'],['100%','Controle RBAC']].map(([v,l]) => (
            <div key={l} style={css.stat}>
              <div style={css.statVal}>{v}</div>
              <div style={css.statLabel}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ RIGHT ═════════════════════════════════════════════════════════ */}
      <div style={css.right}>
        <div style={css.card}>
          {/* Icon */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
            <div style={css.cardIcon}>{mode === 'login' ? '→' : '✨'}</div>
          </div>

          <h2 style={css.cardTitle}>{mode === 'login' ? 'Bem-vindo' : 'Criar Conta'}</h2>
          <p style={css.cardSub}>{mode === 'login' ? 'Entre na sua conta para continuar' : 'Junte-se ao TaskFlow hoje'}</p>

          {/* Tabs */}
          <div style={css.tabs}>
            {[['login','Entrar'],['register','Cadastrar']].map(([m,l]) => (
              <button key={m}
                style={{ ...css.tab, ...(mode===m ? css.tabOn : {}) }}
                onClick={() => { setMode(m); setError(''); }}
              >{l}</button>
            ))}
          </div>

          {error && <div style={css.errBox}>⚠ {error}</div>}

          {mode === 'login' ? (
            <>
              <form onSubmit={handleLogin}>
                <div style={css.fieldGroup}>
                  <label style={css.label}>Email ou CPF</label>
                  <div style={css.inputWrap}>
                    <span style={css.inputIcon}>✉</span>
                    <input style={css.input} type="text" placeholder="seu@email.com ou CPF"
                      value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} required />
                  </div>
                </div>

                <div style={css.fieldGroup}>
                  <label style={css.label}>Senha</label>
                  <div style={css.inputWrap}>
                    <span style={css.inputIcon}>🔒</span>
                    <input style={css.input} type={showPass ? 'text' : 'password'} placeholder="••••••••"
                      value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} required />
                    <button type="button" style={css.eyeBtn} onClick={() => setShow(v=>!v)}>
                      {showPass ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <div style={css.remRow}>
                  <label style={css.remLabel}><input type="checkbox" style={{marginRight:6}} />Lembrar de mim</label>
                  <span style={css.forgot}>Esqueceu a senha?</span>
                </div>

                <button style={css.submitBtn} type="submit" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>

              <div style={css.switchLine}>
                Não tem conta?{' '}
                <span style={css.switchLink} onClick={() => setMode('register')}>Criar conta grátis</span>
              </div>

              {/* Demo */}
              <div style={css.demo}>
                <div style={css.demoHead}>🧪 Acesso rápido — demo</div>
                {DEMO_USERS.map(u => (
                  <button key={u.email} style={css.demoBtn} onClick={() => setForm({email:u.email, password:'123456'})}>
                    <span style={{...css.demoDot, background:u.color}} />
                    <span style={css.demoRole}>{u.label}</span>
                    <span style={css.demoEmail}>{u.email}</span>
                  </button>
                ))}
                <div style={css.demoNote}>Senha: 123456 para todos</div>
              </div>
            </>
          ) : (
            <RegisterForm onSuccess={() => navigate('/dashboard')} onBack={() => setMode('login')} />
          )}
        </div>
      </div>
    </div>
  );
}

function RegisterForm({ onSuccess, onBack }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name:'', email:'', password:'', confirmPassword:'', cpf:'', department:'Geral' });
  const [showPass, setShow] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoad]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError('As senhas não coincidem'); return; }
    setError(''); setLoad(true);
    try {
      await register(form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar conta');
    } finally { setLoad(false); }
  };

  const f = (label, key, type, placeholder, required=true) => (
    <div style={css.fieldGroup} key={key}>
      <label style={css.label}>{label}</label>
      <div style={css.inputWrap}>
        <span style={css.inputIcon}>{type==='password'?'🔒':type==='email'?'✉':'👤'}</span>
        <input style={css.input} type={type==='password'?(showPass?'text':'password'):type}
          placeholder={placeholder}
          value={form[key]} onChange={e => setForm(p=>({...p,[key]:e.target.value}))}
          required={required} />
        {type === 'password' && key === 'password' && (
          <button type="button" style={css.eyeBtn} onClick={() => setShow(v=>!v)}>
            {showPass ? '🙈' : '👁'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      {error && <div style={css.errBox}>⚠ {error}</div>}
      {f('Nome completo', 'name', 'text', 'Seu nome')}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {f('Email', 'email', 'email', 'seu@email.com')}
        {f('CPF (opcional)', 'cpf', 'text', '000.000.000-00', false)}
      </div>
      {f('Departamento', 'department', 'text', 'TI, Design, RH...', false)}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {f('Senha', 'password', 'password', 'Mínimo 6 caracteres')}
        {f('Confirmar senha', 'confirmPassword', 'password', 'Repita a senha')}
      </div>
      <button style={css.submitBtn} type="submit" disabled={loading}>
        {loading ? 'Criando conta...' : 'Criar Conta'}
      </button>
      <div style={css.switchLine}>
        Já tem conta?{' '}
        <span style={css.switchLink} onClick={onBack}>Entrar agora</span>
      </div>
    </form>
  );
}

/* ═══════════════════════════════ STYLES ═══════════════════════════════════ */
const css = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    height: '100vh',
    overflow: 'hidden',
  },

  /* LEFT */
  left: {
    flex: '1 1 55%',
    background: 'linear-gradient(145deg, #08101f 0%, #0b1628 50%, #0d1a30 100%)',
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    padding: '48px 64px',
    position: 'relative', overflow: 'hidden',
  },
  leftGlow: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: `radial-gradient(ellipse at 15% 25%, rgba(59,130,246,0.14) 0%, transparent 55%),
                 radial-gradient(ellipse at 85% 75%, rgba(139,92,246,0.09) 0%, transparent 50%),
                 radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.04) 0%, transparent 70%)`,
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 12,
    marginBottom: 44, position: 'relative', zIndex: 1,
  },
  logoBox: {
    width: 46, height: 46,
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
  },
  logoText: { fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' },

  headline: {
    fontSize: 'clamp(30px, 3.2vw, 50px)',
    fontWeight: 800, lineHeight: 1.1, color: '#f1f5f9',
    letterSpacing: '-0.03em', marginBottom: 18, position: 'relative', zIndex: 1,
  },
  desc: {
    fontSize: 15, color: '#94a3b8', lineHeight: 1.7,
    marginBottom: 32, maxWidth: 460, position: 'relative', zIndex: 1,
  },

  features: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: '10px 20px', marginBottom: 32, position: 'relative', zIndex: 1,
  },
  feat: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  featIcon: {
    width: 32, height: 32, flexShrink: 0,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
  },
  featTitle: { fontSize: 12.5, fontWeight: 700, color: '#e2e8f0', marginBottom: 1 },
  featDesc: { fontSize: 11, color: '#64748b', lineHeight: 1.4 },

  stats: { display: 'flex', gap: 32, position: 'relative', zIndex: 1 },
  stat: {},
  statVal: { fontSize: 26, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' },
  statLabel: { fontSize: 11.5, color: '#64748b', marginTop: 2 },

  /* RIGHT */
  right: {
    flex: '0 0 45%',
    background: '#0a0f1c',
    borderLeft: '1px solid rgba(255,255,255,0.05)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '28px 36px', overflowY: 'auto',
  },
  card: { width: '100%', maxWidth: 400 },

  cardIcon: {
    width: 54, height: 54,
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, color: '#fff', boxShadow: '0 8px 28px rgba(59,130,246,0.35)',
  },
  cardTitle: {
    fontSize: 22, fontWeight: 800, color: '#f1f5f9',
    textAlign: 'center', letterSpacing: '-0.02em', marginBottom: 4,
  },
  cardSub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 18 },

  tabs: {
    display: 'flex', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10, padding: 4, gap: 4, marginBottom: 18,
  },
  tab: {
    flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none',
    background: 'transparent', color: '#64748b',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s',
  },
  tabOn: {
    background: '#1c2230', color: '#f1f5f9',
    boxShadow: '0 1px 6px rgba(0,0,0,0.5)',
  },

  errBox: {
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
    borderRadius: 8, padding: '9px 13px', fontSize: 12.5, color: '#f87171', marginBottom: 14,
  },

  fieldGroup: { marginBottom: 12 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 5 },
  inputWrap: { position: 'relative' },
  inputIcon: {
    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
    fontSize: 14, color: '#4a5568', pointerEvents: 'none',
  },
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 9, padding: '10px 38px 10px 36px',
    color: '#f1f5f9', fontSize: 13.5, outline: 'none',
    transition: 'border-color 0.2s', fontFamily: 'inherit',
  },
  eyeBtn: {
    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', fontSize: 14,
    cursor: 'pointer', padding: 4, color: '#4a5568',
  },

  remRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 2 },
  remLabel: { display: 'flex', alignItems: 'center', fontSize: 12.5, color: '#64748b', cursor: 'pointer' },
  forgot: { fontSize: 12.5, color: '#3b82f6', fontWeight: 600, cursor: 'pointer' },

  submitBtn: {
    width: '100%', padding: '11px',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: 'none', borderRadius: 9, color: '#fff',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    transition: 'opacity 0.2s',
    boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
    marginBottom: 12, fontFamily: 'inherit',
  },

  switchLine: { textAlign: 'center', fontSize: 12.5, color: '#64748b', marginBottom: 4 },
  switchLink: { color: '#3b82f6', fontWeight: 600, cursor: 'pointer' },

  demo: {
    marginTop: 16, padding: '12px 14px',
    background: 'rgba(59,130,246,0.05)',
    border: '1px solid rgba(59,130,246,0.12)',
    borderRadius: 10,
  },
  demoHead: { fontSize: 10.5, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' },
  demoBtn: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
    background: 'none', border: 'none', borderRadius: 6,
    padding: '4px 4px', cursor: 'pointer', transition: 'background 0.15s', textAlign: 'left',
    fontFamily: 'inherit',
  },
  demoDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  demoRole: { fontSize: 11.5, color: '#64748b', width: 110, flexShrink: 0 },
  demoEmail: { fontSize: 11.5, color: '#3b82f6', fontWeight: 500 },
  demoNote: { fontSize: 10.5, color: '#4a5568', marginTop: 7 },
};
