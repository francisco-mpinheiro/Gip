import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { projectToolsAPI } from '../../utils/projectToolsApi';
import { EmptyState, errorMessage, Field, Notice, RequestRecord } from './ToolsShared';
import './ProjectTools.css';

export default function DepartmentRequestsPanel() {
  const titleId = useId().replace(/:/g, '');
  const sequence = useRef(0);
  const lock = useRef(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const load = useCallback(async () => {
    const request = ++sequence.current; setLoading(true); setError('');
    try { const response = await projectToolsAPI.getDepartmentRequests(); if (request === sequence.current) setData(response.data); }
    catch (err) { if (request === sequence.current) setError(errorMessage(err, 'Não foi possível carregar os pedidos.')); }
    finally { if (request === sequence.current) setLoading(false); }
  }, []);
  useEffect(() => { load(); return () => { sequence.current += 1; }; }, [load]);
  const resolve = async (request, resolution) => {
    if (lock.current || !request.canResolve) return false;
    lock.current = true; setBusy(true); setSaveError(''); setMessage('');
    try { await projectToolsAPI.resolveDepartmentRequest(request.projectId, request.id, { resolution }); setMessage('Pedido resolvido.'); await load(); return true; }
    catch (err) { setSaveError(errorMessage(err)); return false; }
    finally { lock.current = false; setBusy(false); }
  };
  const requests = (data?.requests || []).filter(request => (!status || request.status === status) && (!department || request.fromDepartment === department || request.toDepartment === department));
  return <section className="card pt-panel" aria-labelledby={titleId}>
    <div className="pt-header"><div><h2 id={titleId}><i className="bi bi-buildings" aria-hidden="true" /> Pedidos entre departamentos</h2><p>Acompanhe os pedidos em que você ou seu departamento participam.</p></div><button className="btn btn-ghost btn-sm" type="button" onClick={load} disabled={loading || busy}><i className="bi bi-arrow-clockwise" aria-hidden="true" /> Atualizar</button></div>
    {loading && !data && <div className="pt-loading" role="status"><div className="spinner" />Carregando pedidos...</div>}
    {error && <Notice error>{error} <button className="btn btn-secondary btn-sm" type="button" onClick={load} disabled={loading || busy}>Tentar novamente</button></Notice>}
    {data && <div className="pt-content" aria-busy={busy || loading}>
      <div className="pt-filter-row"><Field label="Filtrar status dos pedidos"><select className="form-select" value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos os status</option><option value="open">Abertos</option><option value="resolved">Resolvidos</option></select></Field><Field label="Filtrar departamento dos pedidos"><select className="form-select" value={department} onChange={e => setDepartment(e.target.value)}><option value="">Todos os departamentos</option>{(data.departments || []).map(item => <option key={item} value={item}>{item}</option>)}</select></Field></div>
      {saveError && <Notice error>{saveError}</Notice>}{message && <Notice>{message}</Notice>}
      {!requests.length && <EmptyState>Nenhum pedido encontrado para estes filtros.</EmptyState>}
      <div className="pt-requests-grid">{requests.map(request => <RequestRecord key={request.id} request={request} showProject canResolve={request.canResolve} busy={busy} onResolve={resolution => resolve(request, resolution)} />)}</div>
    </div>}
  </section>;
}
