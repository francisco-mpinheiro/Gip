import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { projectToolsAPI } from '../../utils/projectToolsApi';
import { dateLabel, EmptyState, errorMessage, Field, localDay, Notice, RecordMeta, RequestRecord, ResolutionForm } from './ToolsShared';
import './ProjectTools.css';

const TABS = [
  ['health', 'Saúde', 'heart-pulse'], ['issues', 'Impedimentos', 'exclamation-octagon'],
  ['dependencies', 'Dependências', 'diagram-3'], ['reviews', 'Revisões', 'clipboard-check'],
  ['simulation', 'Simulador', 'sliders'], ['checkIns', 'Check-in', 'calendar-check'],
  ['notes', 'Memória', 'journal-text'], ['requests', 'Departamentos', 'buildings'],
];
const STATUS = { a_fazer: 'A fazer', em_andamento: 'Em andamento', concluido: 'Concluído', cancelado: 'Cancelado' };
const KINDS = { decision: 'Decisão', scope: 'Escopo', lesson: 'Lição aprendida' };
const activeTask = task => !['concluido', 'cancelado'].includes(task.status);
const emptyCheckIn = { completed: '', nextStep: '', needsHelp: '' };

export default function ProjectToolsPanel({ projectId, onChange, refreshKey }) {
  const { user } = useAuth();
  const panelId = useId().replace(/:/g, '');
  const sequence = useRef(0);
  const mutationLock = useRef(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('health');

  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true); setError('');
    try {
      const response = await projectToolsAPI.get(projectId);
      if (sequence.current === request) setData(response.data);
      return true;
    } catch (err) {
      if (sequence.current === request) setError(errorMessage(err, 'Não foi possível carregar as ferramentas.'));
      return false;
    } finally { if (sequence.current === request) setLoading(false); }
  }, [projectId]);

  useEffect(() => { setData(null); setMessage(''); setSaveError(''); setTab('health'); }, [projectId]);
  useEffect(() => { load(); return () => { sequence.current += 1; }; }, [load, refreshKey]);

  const mutate = async (operation, success) => {
    if (mutationLock.current) return false;
    mutationLock.current = true; setBusy(true); setSaveError(''); setMessage('');
    try {
      await operation(); setMessage(success);
      await load();
      if (onChange) onChange();
      return true;
    } catch (err) { setSaveError(errorMessage(err)); return false; }
    finally { mutationLock.current = false; setBusy(false); }
  };
  const changeTab = value => { setTab(value); setSaveError(''); setMessage(''); };
  const shared = { data, projectId, user, busy, mutate };

  return <section className="card pt-panel" aria-labelledby={`${panelId}-title`}>
    <div className="pt-header"><div><h2 id={`${panelId}-title`}><i className="bi bi-tools" aria-hidden="true" /> Ferramentas do projeto</h2><p>Acompanhe riscos, organize entregas e registre o conhecimento da equipe.</p></div>
      <button className="btn btn-ghost btn-sm" type="button" onClick={load} disabled={loading || busy}><i className={`bi bi-arrow-clockwise ${loading ? 'pt-spinning' : ''}`} aria-hidden="true" /> Atualizar</button>
    </div>
    {loading && !data && <div className="pt-loading" role="status"><div className="spinner" />Carregando ferramentas...</div>}
    {error && <Notice error>{error} <button className="btn btn-secondary btn-sm" type="button" onClick={load} disabled={loading || busy}>Tentar novamente</button></Notice>}
    {data && <>
      <div className="pt-tabs" role="tablist" aria-label="Ferramentas do projeto">
        {TABS.map(([key, title, icon], index) => <button type="button" id={`${panelId}-tab-${key}`} key={key} role="tab" aria-selected={tab === key} aria-controls={`${panelId}-content`} tabIndex={tab === key ? 0 : -1} onClick={() => changeTab(key)} onKeyDown={event => {
          const nextIndex = event.key === 'ArrowRight' ? (index + 1) % TABS.length : event.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length : event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : null;
          if (nextIndex !== null) { event.preventDefault(); changeTab(TABS[nextIndex][0]); document.getElementById(`${panelId}-tab-${TABS[nextIndex][0]}`)?.focus(); }
        }}><i className={`bi bi-${icon}`} aria-hidden="true" />{title}</button>)}
      </div>
      <div className="pt-content" id={`${panelId}-content`} role="tabpanel" aria-labelledby={`${panelId}-tab-${tab}`} aria-busy={busy || loading}>
        {saveError && <Notice error>{saveError}</Notice>}{message && <Notice>{message}</Notice>}
        {tab === 'health' && <Health data={data} changeTab={changeTab} />}
        {tab === 'issues' && <Issues {...shared} />}
        {tab === 'dependencies' && <Dependencies {...shared} />}
        {tab === 'reviews' && <Reviews {...shared} />}
        {tab === 'simulation' && <Simulation {...shared} />}
        {tab === 'checkIns' && <CheckIns {...shared} />}
        {tab === 'notes' && <Notes {...shared} />}
        {tab === 'requests' && <Requests {...shared} />}
      </div>
    </>}
  </section>;
}

function TaskOptions({ tasks, placeholder = 'Selecione uma tarefa' }) {
  return <><option value="">{placeholder}</option>{tasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</>;
}

function FormSubmit({ busy, children }) {
  return <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>{busy ? 'Salvando...' : children}</button>;
}

function Health({ data, changeTab }) {
  const [taskFilter, setTaskFilter] = useState(null);
  const health = data.health || {};
  const metrics = health.metrics || {};
  const blockedTarget = (data.issues || []).some(issue => issue.status === 'open') ? 'issues' : 'dependencies';
  const cards = [['total', 'Tarefas', null, 'list-task'], ['completed', 'Concluídas', null, 'check-circle'], ['overdue', 'Vencidas', 'overdue', 'clock-history'], ['unassigned', 'Sem responsável', 'unassigned', 'person-dash'], ['blocked', 'Bloqueadas', blockedTarget, 'lock'], ['pendingReviews', 'Revisões pendentes', 'reviews', 'clipboard-check']];
  const today = localDay();
  const selectedTasks = (data.tasks || []).filter(task => {
    if (!activeTask(task)) return false;
    if (taskFilter === 'unassigned') return !task.assigneeId;
    const dueDate = task.dueDate && new Date(task.dueDate);
    return taskFilter === 'overdue' && dueDate && !Number.isNaN(dueDate.getTime()) && dueDate.toISOString().slice(0, 10) < today;
  });
  const detailsTitle = taskFilter === 'overdue' ? 'Tarefas vencidas' : 'Tarefas sem responsável';
  return <div>
    <div className={`pt-health pt-health-${health.level || 'healthy'}`}><i className={`bi bi-${health.level === 'critical' ? 'exclamation-triangle' : health.level === 'attention' ? 'exclamation-circle' : 'check-circle'}`} aria-hidden="true" /><div><strong>{health.label || 'Saudável'}</strong><p>Indicadores calculados a partir das tarefas, impedimentos e revisões atuais.</p></div></div>
    <div className="pt-metrics">{cards.map(([key, label, target, icon]) => <div className="pt-metric" key={key}><i className={`bi bi-${icon}`} aria-hidden="true" /><strong>{metrics[key] || 0}</strong><span>{label}</span>{target && metrics[key] > 0 && <button className="pt-text-button" aria-label={`Ver detalhes de ${label.toLowerCase()}`} onClick={() => ['overdue', 'unassigned'].includes(target) ? setTaskFilter(target) : changeTab(target)} type="button">Ver detalhes <i className="bi bi-arrow-right" aria-hidden="true" /></button>}</div>)}</div>
    {taskFilter && <div className="pt-current-load" role="region" aria-label={detailsTitle}>
      <div className="pt-list-heading"><h3>{detailsTitle}</h3><button className="btn btn-ghost btn-sm" type="button" onClick={() => setTaskFilter(null)}>Ocultar detalhes</button></div>
      {!selectedTasks.length && <EmptyState>Nenhuma tarefa encontrada para este indicador.</EmptyState>}
      {selectedTasks.map(task => <article className="pt-record" key={task.id}><div className="pt-record-heading"><h4>{task.title}</h4><span className="pt-badge pt-neutral">{STATUS[task.status] || task.status}</span></div><p className="pt-context">Prazo: {task.dueDate ? dateLabel(task.dueDate, true) : 'Sem prazo'} · Responsável: {(data.members || []).find(member => member.id === task.assigneeId)?.name || (task.assigneeId ? 'Responsável fora da equipe ativa' : 'Sem responsável')}</p></article>)}
    </div>}
    <h3 className="pt-subtitle">Leitura do projeto</h3>
    {health.reasons?.length ? <ul className="pt-reasons">{health.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul> : <p className="pt-muted">Sem sinais de atenção nas tarefas atuais.</p>}
    <div className="pt-actions"><button className="btn btn-secondary btn-sm" type="button" onClick={() => changeTab('issues')}>Ver impedimentos</button><button className="btn btn-secondary btn-sm" type="button" onClick={() => changeTab('reviews')}>Ver revisões</button></div>
  </div>;
}

function Issues({ data, projectId, user, busy, mutate }) {
  const [form, setForm] = useState({ title: '', reason: '', taskId: '' });
  const [validation, setValidation] = useState('');
  const submit = async event => {
    event.preventDefault(); if (busy) return;
    if (!form.title.trim() || !form.reason.trim()) { setValidation('Preencha o título e o motivo.'); return; }
    setValidation('');
    const payload = { title: form.title.trim(), reason: form.reason.trim(), ...(form.taskId ? { taskId: form.taskId } : {}) };
    if (await mutate(() => projectToolsAPI.createIssue(projectId, payload), 'Impedimento registrado.')) setForm({ title: '', reason: '', taskId: '' });
  };
  return <div className="pt-split"><form className="pt-form" onSubmit={submit}><h3>Registrar impedimento</h3><fieldset disabled={busy}>
    <Field label="Título do impedimento" required><input className="form-input" maxLength={160} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
    <Field label="Motivo e impacto" required><textarea className="form-textarea" maxLength={4000} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={4} /></Field>
    <Field label="Tarefa relacionada"><select className="form-select" value={form.taskId} onChange={e => setForm({ ...form, taskId: e.target.value })}><TaskOptions tasks={data.tasks || []} placeholder="Impedimento geral do projeto" /></select></Field>
    {validation && <Notice error>{validation}</Notice>}<FormSubmit busy={busy}>Registrar impedimento</FormSubmit>
  </fieldset></form><div className="pt-list"><h3>Impedimentos registrados</h3>{!data.issues?.length && <EmptyState>Nenhum impedimento registrado.</EmptyState>}
    {(data.issues || []).map(item => <article className="pt-record" key={item.id}><div className="pt-record-heading"><h4>{item.title}</h4><span className={`pt-badge ${item.status === 'resolved' ? 'pt-good' : 'pt-warn'}`}>{item.status === 'resolved' ? 'Resolvido' : 'Aberto'}</span></div>
      {item.task && <p className="pt-context">{item.task.title}</p>}<p className="pt-text">{item.reason}</p><RecordMeta item={item} />
      {item.resolution && <div className="pt-followup"><strong>Resolução</strong><p className="pt-text">{item.resolution}</p><small>{dateLabel(item.resolvedAt)}</small></div>}
      {item.status === 'open' && (data.canManage || item.authorId === user?.id) && <ResolutionForm label="Resolução do impedimento" buttonLabel="Resolver impedimento" busy={busy} onResolve={resolution => mutate(() => projectToolsAPI.resolveIssue(projectId, item.id, { resolution }), 'Impedimento resolvido.')} />}
    </article>)}
  </div></div>;
}

function Dependencies({ data, projectId, busy, mutate }) {
  const [taskId, setTaskId] = useState('');
  const [dependsOnId, setDependsOnId] = useState('');
  const [validation, setValidation] = useState('');
  const submit = async event => {
    event.preventDefault(); if (busy) return;
    if (!taskId || !dependsOnId || taskId === dependsOnId) { setValidation('Selecione duas tarefas diferentes.'); return; }
    setValidation('');
    if (await mutate(() => projectToolsAPI.createDependency(projectId, { taskId, dependsOnId }), 'Dependência adicionada.')) { setTaskId(''); setDependsOnId(''); }
  };
  return <div className="pt-split"><div>{data.canManage ? <form className="pt-form" onSubmit={submit}><h3>Adicionar dependência</h3><p className="pt-muted">A tarefa que depende só poderá ser concluída após sua predecessora.</p><fieldset disabled={busy}>
    <Field label="Tarefa que depende" required><select className="form-select" value={taskId} onChange={e => { setTaskId(e.target.value); if (dependsOnId === e.target.value) setDependsOnId(''); }}><TaskOptions tasks={data.tasks || []} /></select></Field>
    <Field label="Tarefa predecessora" required><select className="form-select" value={dependsOnId} onChange={e => setDependsOnId(e.target.value)}><TaskOptions tasks={(data.tasks || []).filter(task => task.id !== taskId)} /></select></Field>
    {validation && <Notice error>{validation}</Notice>}<FormSubmit busy={busy}>Adicionar dependência</FormSubmit>
  </fieldset></form> : <p className="pt-permission"><i className="bi bi-lock" aria-hidden="true" /> O gestor do projeto pode organizar as dependências.</p>}</div>
    <div className="pt-list"><h3>Sequência das entregas</h3>{!data.dependencies?.length && <EmptyState>Nenhuma dependência cadastrada.</EmptyState>}
      {(data.dependencies || []).map(item => <article className="pt-record" key={item.id}><div className="pt-dependency"><div><strong>{item.dependsOn?.title}</strong><span>{STATUS[item.dependsOn?.status] || item.dependsOn?.status}</span></div><i className="bi bi-arrow-right" aria-label="antes de" /><div><strong>{item.task?.title}</strong><span>{STATUS[item.task?.status] || item.task?.status}</span></div></div>
        {item.createdAt && <p className="pt-meta">Registrada em {dateLabel(item.createdAt)}</p>}
        {data.canManage && <button className="btn btn-ghost btn-sm pt-danger" type="button" disabled={busy} onClick={() => mutate(() => projectToolsAPI.deleteDependency(projectId, item.id), 'Dependência removida.')}><i className="bi bi-trash" aria-hidden="true" /> Remover dependência</button>}
      </article>)}
    </div></div>;
}

function ReviewDecision({ review, projectId, busy, mutate }) {
  const [feedback, setFeedback] = useState('');
  const [validation, setValidation] = useState('');
  const decide = decision => {
    if (busy) return;
    if (!feedback.trim()) { setValidation('Informe o feedback antes de decidir a revisão.'); return; }
    setValidation('');
    mutate(() => projectToolsAPI.decideReview(projectId, review.id, { decision, feedback: feedback.trim() }), decision === 'approved' ? 'Revisão aprovada e tarefa concluída.' : 'Ajustes solicitados e tarefa reaberta.');
  };
  return <div className="pt-inline-form"><fieldset disabled={busy}>
    <Field label="Feedback da revisão" required><textarea className="form-textarea" value={feedback} onChange={e => setFeedback(e.target.value)} maxLength={4000} rows={2} /></Field>
    {validation && <Notice error>{validation}</Notice>}
    <div className="pt-actions"><button className="btn btn-primary btn-sm" type="button" disabled={busy} onClick={() => decide('approved')}>Aprovar entrega</button><button className="btn btn-secondary btn-sm" type="button" disabled={busy} onClick={() => decide('changes_requested')}>Solicitar ajustes</button></div>
  </fieldset></div>;
}

function Reviews({ data, projectId, user, busy, mutate }) {
  const [form, setForm] = useState({ taskId: '', summary: '', evidence: '' });
  const [validation, setValidation] = useState('');
  const available = (data.tasks || []).filter(task => activeTask(task) && (data.canManage || task.assigneeId === user?.id) && !(data.reviews || []).some(review => review.taskId === task.id && review.status === 'pending'));
  const submit = async event => {
    event.preventDefault(); if (busy) return;
    if (!available.some(task => task.id === form.taskId) || !form.summary.trim()) { setValidation('Selecione uma tarefa disponível e descreva a entrega.'); return; }
    setValidation('');
    const payload = { taskId: form.taskId, summary: form.summary.trim(), ...(form.evidence.trim() ? { evidence: form.evidence.trim() } : {}) };
    if (await mutate(() => projectToolsAPI.submitReview(projectId, payload), 'Entrega enviada para revisão.')) setForm({ taskId: '', summary: '', evidence: '' });
  };
  return <div className="pt-split"><div>{available.length ? <form className="pt-form" onSubmit={submit}><h3>Enviar entrega para revisão</h3><p className="pt-muted">Descreva a entrega e as evidências. Os anexos continuam na própria tarefa.</p><fieldset disabled={busy}>
    <Field label="Tarefa para revisão" required><select className="form-select" value={form.taskId} onChange={e => setForm({ ...form, taskId: e.target.value })}><TaskOptions tasks={available} /></select></Field>
    <Field label="Resumo da entrega" required><textarea className="form-textarea" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} maxLength={4000} rows={3} /></Field>
    <Field label="Evidências"><textarea className="form-textarea" value={form.evidence} onChange={e => setForm({ ...form, evidence: e.target.value })} maxLength={8000} rows={3} placeholder="Resultados, links ou verificações realizadas" /></Field>
    {validation && <Notice error>{validation}</Notice>}<FormSubmit busy={busy}>Enviar para revisão</FormSubmit>
  </fieldset></form> : <p className="pt-permission">Nenhuma tarefa disponível para envio. O responsável ou gestor pode enviar tarefas ativas sem revisão pendente.</p>}</div>
    <div className="pt-list"><h3>Revisões de entrega</h3>{!data.reviews?.length && <EmptyState>Nenhuma revisão registrada.</EmptyState>}
      {(data.reviews || []).map(item => <article className="pt-record" key={item.id}><div className="pt-record-heading"><h4>{item.task?.title || 'Entrega'}</h4><span className={`pt-badge ${item.status === 'approved' ? 'pt-good' : 'pt-warn'}`}>{({ pending: 'Pendente', approved: 'Aprovada', changes_requested: 'Ajustes solicitados' })[item.status] || item.status}</span></div>
        <p className="pt-text">{item.summary}</p>{item.evidence && <div className="pt-followup"><strong>Evidências</strong><p className="pt-text">{item.evidence}</p></div>}<RecordMeta item={item} />
        {item.feedback && <div className="pt-followup"><strong>Feedback</strong><p className="pt-text">{item.feedback}</p><small>{item.reviewer?.name}{item.reviewedAt && <> · {dateLabel(item.reviewedAt)}</>}</small></div>}
        {item.status === 'pending' && data.canManage && <ReviewDecision review={item} projectId={projectId} busy={busy} mutate={mutate} />}
      </article>)}
    </div></div>;
}

function Simulation({ data, projectId }) {
  const [rows, setRows] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const snapshotVersion = useRef(0);
  const tasks = (data.tasks || []).filter(activeTask);
  useEffect(() => {
    snapshotVersion.current += 1;
    setResult(null); setError('');
    const taskIds = new Set((data.tasks || []).filter(activeTask).map(task => task.id));
    const memberIds = new Set((data.members || []).map(member => member.id));
    setRows(previous => previous.filter(row => !row.taskId || taskIds.has(row.taskId))
      .map(row => row.assigneeId && !memberIds.has(row.assigneeId) ? { ...row, assigneeId: '' } : row)
      .slice(0, taskIds.size));
    return () => { snapshotVersion.current += 1; };
  }, [data]);
  const update = (index, key, value) => { setRows(previous => previous.map((row, i) => i === index ? { ...row, [key]: value } : row)); setResult(null); };
  const submit = async event => {
    event.preventDefault(); if (locked.current) return;
    if (rows.some(row => !tasks.some(task => task.id === row.taskId) || !(data.members || []).some(member => member.id === row.assigneeId)) || new Set(rows.map(row => row.taskId)).size !== rows.length) { setError('Selecione tarefa e responsável em todas as linhas, sem repetir tarefas.'); return; }
    const version = snapshotVersion.current;
    locked.current = true; setBusy(true); setError(''); setResult(null);
    try { const response = await projectToolsAPI.simulate(projectId, { assignments: rows.map(({ taskId, assigneeId }) => ({ taskId, assigneeId })) }); if (version === snapshotVersion.current) setResult(response.data); }
    catch (err) { if (version === snapshotVersion.current) setError(errorMessage(err, 'Não foi possível simular a distribuição.')); }
    finally { locked.current = false; setBusy(false); }
  };
  if (!data.canManage) return <p className="pt-permission"><i className="bi bi-lock" aria-hidden="true" /> A simulação de distribuição está disponível para o gestor do projeto.</p>;
  return <div><div className="pt-intro"><h3>Simular distribuição de tarefas</h3><p>Compare a quantidade de tarefas ativas por pessoa em todos os projetos. A simulação não altera responsáveis e não prevê prazos ou horas de trabalho.</p></div>
    <form onSubmit={submit}><fieldset disabled={busy}>
      {!rows.length && <p className="pt-muted">Adicione redistribuições ou simule o cenário atual.</p>}
      {rows.map((row, index) => <div className="pt-simulation-row" key={row.key}>
        <Field label={`Tarefa ${index + 1}`} required><select className="form-select" value={row.taskId} onChange={e => update(index, 'taskId', e.target.value)}><TaskOptions tasks={tasks.filter(task => !rows.some((other, i) => i !== index && other.taskId === task.id))} /></select></Field>
        <Field label={`Novo responsável ${index + 1}`} required><select className="form-select" value={row.assigneeId} onChange={e => update(index, 'assigneeId', e.target.value)}><option value="">Selecione um membro</option>{(data.members || []).map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></Field>
        <button className="btn btn-ghost btn-sm pt-danger" type="button" disabled={busy} aria-label={`Remover redistribuição ${index + 1}`} onClick={() => { setRows(previous => previous.filter((_, i) => i !== index)); setResult(null); }}><i className="bi bi-trash" aria-hidden="true" /></button>
      </div>)}
      <div className="pt-actions"><button className="btn btn-secondary btn-sm" type="button" disabled={busy || rows.length >= Math.min(100, tasks.length)} onClick={() => { setRows(previous => [...previous, { key: `${Date.now()}-${previous.length}`, taskId: '', assigneeId: '' }]); setResult(null); }}><i className="bi bi-plus-lg" aria-hidden="true" /> Adicionar redistribuição</button><button className="btn btn-primary btn-sm" type="submit" disabled={busy}>{busy ? 'Simulando...' : 'Simular distribuição'}</button></div>
    </fieldset></form>
    {error && <Notice error>{error}</Notice>}
    {result && <div className="pt-simulation-result" aria-live="polite"><h3>Resultado da simulação</h3><div className="pt-table-wrap"><table className="pt-table"><thead><tr><th>Membro</th><th>Antes</th><th>Depois</th><th>Variação</th></tr></thead><tbody>{(result.members || []).map(row => <tr key={row.user.id}><td>{row.user.name}</td><td>{row.before}</td><td>{row.after}</td><td>{row.delta > 0 ? '+' : ''}{row.delta}</td></tr>)}</tbody></table></div>{result.warnings?.length > 0 && <ul className="pt-reasons">{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}</div>}
    {!result && <div className="pt-current-load"><h3>Carga atual da equipe</h3>{!data.workload?.length ? <EmptyState>Nenhum membro disponível para simulação.</EmptyState> : <div className="pt-load-grid">{data.workload.map(row => <div className="pt-load-card" key={row.user.id}><strong>{row.user.name}</strong><span>{row.active} {row.active === 1 ? 'tarefa ativa' : 'tarefas ativas'}</span><small>{row.overdue} {row.overdue === 1 ? 'vencida' : 'vencidas'}</small></div>)}</div>}</div>}
  </div>;
}

function CheckIns({ data, projectId, user, busy, mutate }) {
  const today = localDay();
  const existing = (data.checkIns || []).find(item => item.authorId === user?.id && item.day === today);
  const [form, setForm] = useState(() => existing ? { completed: existing.completed, nextStep: existing.nextStep, needsHelp: existing.needsHelp || '' } : emptyCheckIn);
  const [validation, setValidation] = useState('');
  useEffect(() => { setForm(existing ? { completed: existing.completed, nextStep: existing.nextStep, needsHelp: existing.needsHelp || '' } : emptyCheckIn); }, [existing]);
  const submit = async event => {
    event.preventDefault(); if (busy) return;
    if (!form.completed.trim() || !form.nextStep.trim()) { setValidation('Preencha o que foi concluído e o próximo passo.'); return; }
    setValidation('');
    await mutate(() => projectToolsAPI.saveCheckIn(projectId, { completed: form.completed.trim(), nextStep: form.nextStep.trim(), ...(form.needsHelp.trim() ? { needsHelp: form.needsHelp.trim() } : {}) }), 'Check-in de hoje salvo.');
  };
  return <div className="pt-split"><form className="pt-form" onSubmit={submit}><h3>Seu check-in de hoje</h3><p className="pt-muted">{dateLabel(today, true)} · Horário de Brasília. Salvar novamente atualiza seu registro do dia.</p><fieldset disabled={busy}>
    <Field label="O que foi concluído?" required><textarea className="form-textarea" value={form.completed} onChange={e => setForm({ ...form, completed: e.target.value })} maxLength={4000} rows={3} /></Field>
    <Field label="Próximo passo" required><textarea className="form-textarea" value={form.nextStep} onChange={e => setForm({ ...form, nextStep: e.target.value })} maxLength={4000} rows={3} /></Field>
    <Field label="Precisa de ajuda?"><textarea className="form-textarea" value={form.needsHelp} onChange={e => setForm({ ...form, needsHelp: e.target.value })} maxLength={4000} rows={2} /></Field>
    {validation && <Notice error>{validation}</Notice>}<FormSubmit busy={busy}>{existing ? 'Atualizar check-in' : 'Salvar check-in'}</FormSubmit>
  </fieldset></form><div className="pt-list"><h3>Check-ins da equipe</h3>{!data.checkIns?.length && <EmptyState>Nenhum check-in registrado.</EmptyState>}
    {(data.checkIns || []).map(item => <article className="pt-record" key={item.id}><div className="pt-record-heading"><h4>{item.author?.name || 'Membro'}</h4><span className="pt-meta">{dateLabel(item.day, true)}</span></div><div className="pt-checkin-section"><strong>Concluído</strong><p className="pt-text">{item.completed}</p></div><div className="pt-checkin-section"><strong>Próximo passo</strong><p className="pt-text">{item.nextStep}</p></div>{item.needsHelp && <div className="pt-followup"><strong>Precisa de ajuda</strong><p className="pt-text">{item.needsHelp}</p></div>}</article>)}
  </div></div>;
}

function Notes({ data, projectId, busy, mutate }) {
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ kind: 'decision', title: '', content: '' });
  const [validation, setValidation] = useState('');
  const notes = (data.notes || []).filter(item => !filter || item.kind === filter);
  const submit = async event => {
    event.preventDefault(); if (busy) return;
    if (!form.title.trim() || !form.content.trim()) { setValidation('Preencha o título e o conteúdo.'); return; }
    setValidation('');
    if (await mutate(() => projectToolsAPI.createNote(projectId, { kind: form.kind, title: form.title.trim(), content: form.content.trim() }), 'Registro salvo na memória do projeto.')) setForm({ kind: form.kind, title: '', content: '' });
  };
  return <div className="pt-split"><form className="pt-form" onSubmit={submit}><h3>Registrar conhecimento</h3><fieldset disabled={busy}>
    <Field label="Tipo de registro" required><select className="form-select" value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>{Object.entries(KINDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
    <Field label="Título do registro" required><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} maxLength={160} /></Field>
    <Field label="Conteúdo do registro" required><textarea className="form-textarea" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} maxLength={8000} rows={5} /></Field>
    {validation && <Notice error>{validation}</Notice>}<FormSubmit busy={busy}>Salvar registro</FormSubmit>
  </fieldset></form><div className="pt-list"><div className="pt-list-heading"><h3>Memória do projeto</h3><Field label="Filtrar memória"><select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}><option value="">Todos os tipos</option>{Object.entries(KINDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field></div>
    {!notes.length && <EmptyState>Nenhum registro para este filtro.</EmptyState>}{notes.map(item => <article className="pt-record" key={item.id}><div className="pt-record-heading"><h4>{item.title}</h4><span className="pt-badge pt-neutral">{KINDS[item.kind] || item.kind}</span></div><p className="pt-text">{item.content}</p><RecordMeta item={item} /></article>)}
  </div></div>;
}

function Requests({ data, projectId, user, busy, mutate }) {
  const [form, setForm] = useState({ toDepartment: '', title: '', description: '', priority: 'media' });
  const [validation, setValidation] = useState('');
  const departments = (data.departments || []).filter(department => department !== user?.department);
  const submit = async event => {
    event.preventDefault(); if (busy) return;
    if (!departments.includes(form.toDepartment) || !form.title.trim() || !form.description.trim()) { setValidation('Escolha o destino e preencha o título e a descrição.'); return; }
    setValidation('');
    if (await mutate(() => projectToolsAPI.createDepartmentRequest(projectId, { toDepartment: form.toDepartment, title: form.title.trim(), description: form.description.trim(), priority: form.priority }), 'Pedido enviado ao departamento.')) setForm({ toDepartment: '', title: '', description: '', priority: 'media' });
  };
  return <div className="pt-split"><div>{user?.department && departments.length ? <form className="pt-form" onSubmit={submit}><h3>Solicitar apoio de outro departamento</h3><p className="pt-muted">Departamento de origem: {user.department}</p><fieldset disabled={busy}>
    <Field label="Departamento de destino" required><select className="form-select" value={form.toDepartment} onChange={e => setForm({ ...form, toDepartment: e.target.value })}><option value="">Selecione o departamento</option>{departments.map(department => <option key={department} value={department}>{department}</option>)}</select></Field>
    <Field label="Título do pedido" required><input className="form-input" maxLength={160} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
    <Field label="Descrição do pedido" required><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={4000} rows={4} /></Field>
    <Field label="Prioridade do pedido" required><select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></Field>
    {validation && <Notice error>{validation}</Notice>}<FormSubmit busy={busy}>Criar pedido</FormSubmit>
  </fieldset></form> : <p className="pt-permission">{!user?.department ? 'Cadastre seu departamento no perfil para solicitar apoio.' : 'Nenhum outro departamento disponível para receber pedidos.'}</p>}</div>
    <div className="pt-list"><h3>Pedidos do projeto</h3>{!data.requests?.length && <EmptyState>Nenhum pedido interdepartamental registrado.</EmptyState>}{(data.requests || []).map(request => <RequestRecord key={request.id} request={request} busy={busy} canResolve={data.canManage || request.authorId === user?.id || Boolean(user?.department && request.toDepartment === user.department)} onResolve={resolution => mutate(() => projectToolsAPI.resolveDepartmentRequest(projectId, request.id, { resolution }), 'Pedido resolvido.')} />)}</div>
  </div>;
}
