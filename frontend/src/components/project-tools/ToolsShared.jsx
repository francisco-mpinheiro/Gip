import React, { useId, useState } from 'react';

export const errorMessage = (error, fallback = 'Não foi possível salvar. Tente novamente.') => error?.response?.data?.message || fallback;

export function localDay() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function dateLabel(value, dateOnly = false) {
  if (!value) return '';
  const date = new Date(dateOnly ? `${value.slice(0, 10)}T12:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function Field({ label, children, required = false, hint }) {
  const id = useId().replace(/:/g, '');
  return <div className="pt-field">
    <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
    {React.cloneElement(children, { id, required: required || children.props.required })}
    {hint && <small>{hint}</small>}
  </div>;
}

export function EmptyState({ children }) {
  return <div className="pt-empty"><i className="bi bi-inbox" aria-hidden="true" /><p>{children}</p></div>;
}

export function RecordMeta({ item, children }) {
  return <div className="pt-meta">{item.author?.name || 'Membro'}{item.createdAt && <> · {dateLabel(item.createdAt)}</>}{children}</div>;
}

export function Notice({ error, children }) {
  return <div className={`pt-notice ${error ? 'pt-notice-error' : 'pt-notice-success'}`} role={error ? 'alert' : 'status'}>{children}</div>;
}

export function ResolutionForm({ label = 'Resolução do pedido', buttonLabel = 'Resolver pedido', busy, onResolve }) {
  const [resolution, setResolution] = useState('');
  const [error, setError] = useState('');
  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    if (!resolution.trim()) { setError('Informe a resolução.'); return; }
    setError('');
    if (await onResolve(resolution.trim())) setResolution('');
  };
  return <form className="pt-inline-form" onSubmit={submit}>
    <fieldset disabled={busy}>
      <Field label={label} required><textarea className="form-textarea" value={resolution} onChange={event => setResolution(event.target.value)} maxLength={4000} rows={2} /></Field>
      {error && <Notice error>{error}</Notice>}
      <button className="btn btn-secondary btn-sm" type="submit" disabled={busy}>{busy ? 'Salvando...' : buttonLabel}</button>
    </fieldset>
  </form>;
}

export function RequestRecord({ request, canResolve, busy, onResolve, showProject = false }) {
  const resolved = request.status === 'resolved';
  return <article className="pt-record">
    <div className="pt-record-heading"><h4>{request.title}</h4><span className={`pt-badge ${resolved ? 'pt-good' : 'pt-warn'}`}>{resolved ? 'Resolvido' : 'Aberto'}</span></div>
    {showProject && <p className="pt-project-name">{request.project?.name || 'Projeto'}</p>}
    <p className="pt-context">{request.fromDepartment} <i className="bi bi-arrow-right" aria-label="para" /> {request.toDepartment}{request.priority && <> · Prioridade {({ alta: 'alta', media: 'média', baixa: 'baixa' })[request.priority] || request.priority}</>}</p>
    <p className="pt-text">{request.description}</p>
    <RecordMeta item={request} />
    {request.resolution && <div className="pt-followup"><strong>Resolução</strong><p className="pt-text">{request.resolution}</p>{request.resolvedAt && <small>Resolvido em {dateLabel(request.resolvedAt)}</small>}</div>}
    {!resolved && canResolve && <ResolutionForm busy={busy} onResolve={onResolve} />}
  </article>;
}
