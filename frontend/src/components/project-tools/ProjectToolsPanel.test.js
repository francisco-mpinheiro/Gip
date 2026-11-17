import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ProjectToolsPanel from './ProjectToolsPanel';
import DepartmentRequestsPanel from './DepartmentRequestsPanel';
import { projectToolsAPI } from '../../utils/projectToolsApi';

const mockUser = { id: 'u1', name: 'Ana', role: 'project_manager', department: 'TI' };
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../utils/projectToolsApi', () => ({ projectToolsAPI: {
  get: jest.fn(), createIssue: jest.fn(), resolveIssue: jest.fn(), createDependency: jest.fn(),
  deleteDependency: jest.fn(), submitReview: jest.fn(), decideReview: jest.fn(), saveCheckIn: jest.fn(),
  createNote: jest.fn(), createDepartmentRequest: jest.fn(), resolveDepartmentRequest: jest.fn(),
  getDepartmentRequests: jest.fn(), simulate: jest.fn(),
} }), { virtual: true });

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const tools = (overrides = {}) => ({
  canManage: true,
  health: { level: 'attention', label: 'Atenção', reasons: ['Há impedimentos abertos'], metrics: { total: 2, completed: 0, overdue: 0, unassigned: 0, blocked: 1, pendingReviews: 0 } },
  tasks: [{ id: 't1', title: 'Preparar relatório', status: 'a_fazer', priority: 'media', assigneeId: 'u1' }, { id: 't2', title: 'Validar entrega', status: 'em_andamento', priority: 'alta', assigneeId: 'u2' }],
  members: [mockUser, { id: 'u2', name: 'Bia', department: 'Design', role: 'employee' }],
  departments: ['TI', 'Design'], issues: [], dependencies: [], reviews: [], checkIns: [], notes: [], requests: [],
  workload: [{ user: mockUser, active: 3, overdue: 1 }, { user: { id: 'u2', name: 'Bia' }, active: 1, overdue: 0 }], ...overrides,
});
let host, root;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  jest.clearAllMocks();
  projectToolsAPI.get.mockResolvedValue({ data: tools() });
  projectToolsAPI.getDepartmentRequests.mockResolvedValue({ data: { requests: [], departments: ['TI', 'Design'] } });
  Object.entries(projectToolsAPI).forEach(([key, fn]) => { if (!['get', 'getDepartmentRequests'].includes(key)) fn.mockResolvedValue({ data: {} }); });
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
async function render(element = <ProjectToolsPanel projectId="p1" />) { await act(async () => { root.render(element); }); }
function button(text) { return Array.from(host.querySelectorAll('button')).find(el => el.textContent.trim() === text); }
async function click(text) { const el = button(text); expect(el).toBeTruthy(); await act(async () => el.click()); }
function input(label) {
  const el = Array.from(host.querySelectorAll('label')).find(l => l.textContent.replace('*', '').trim() === label);
  expect(el).toBeTruthy(); return host.querySelector(`#${el.htmlFor}`);
}
async function fill(label, value) {
  const el = input(label);
  const setter = Object.getOwnPropertyDescriptor(el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set;
  await act(async () => { setter.call(el, value); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}
async function submit(form) { await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }

test('permite tentar novamente após falha de carregamento e mostra oito abas com saúde real', async () => {
  projectToolsAPI.get.mockRejectedValueOnce({ response: { data: { message: 'Conexão indisponível' } } });
  await render(); expect(host.textContent).toContain('Conexão indisponível');
  await click('Tentar novamente');
  expect(host.querySelectorAll('[role="tab"]')).toHaveLength(8);
  expect(host.textContent).toContain('Há impedimentos abertos');
  expect(host.textContent).toContain('2');
});

test('detalhes de tarefas vencidas e sem responsável mostram apenas tarefas ativas na Saúde', async () => {
  projectToolsAPI.get.mockResolvedValueOnce({ data: tools({
    health: { level: 'attention', label: 'Atenção', reasons: ['Há pendências'], metrics: { total: 4, completed: 1, overdue: 1, unassigned: 1, blocked: 0, pendingReviews: 0 } },
    tasks: [
      { id: 'late', title: 'Entrega atrasada', status: 'em_andamento', dueDate: '2000-01-01T00:00:00.000Z', assigneeId: 'u1' },
      { id: 'ownerless', title: 'Definir proprietário', status: 'a_fazer', dueDate: '2099-12-31T00:00:00.000Z', assigneeId: null },
      { id: 'done', title: 'Entrega já concluída', status: 'concluido', dueDate: '2000-01-01T00:00:00.000Z', assigneeId: null },
      { id: 'cancelled', title: 'Entrega cancelada', status: 'cancelado', dueDate: '2000-01-01T00:00:00.000Z', assigneeId: null },
      { id: 'future', title: 'Entrega futura', status: 'a_fazer', dueDate: '2099-12-31T00:00:00.000Z', assigneeId: 'u2' },
    ],
  }) });
  await render();
  const metric = name => Array.from(host.querySelectorAll('.pt-metric')).find(card => Array.from(card.querySelectorAll('span')).some(span => span.textContent === name));
  await act(async () => metric('Vencidas').querySelector('button').click());
  expect(host.querySelector('[role="tab"][aria-selected="true"]').textContent).toBe('Saúde');
  expect(host.textContent).toContain('Entrega atrasada'); expect(host.textContent).toContain('Em andamento'); expect(host.textContent).toContain('01/01/2000'); expect(host.textContent).toContain('Ana');
  expect(host.textContent).not.toContain('Definir proprietário'); expect(host.textContent).not.toContain('Entrega já concluída'); expect(host.textContent).not.toContain('Entrega cancelada'); expect(host.textContent).not.toContain('Entrega futura');
  await act(async () => metric('Sem responsável').querySelector('button').click());
  expect(host.querySelector('[role="tab"][aria-selected="true"]').textContent).toBe('Saúde');
  expect(host.textContent).toContain('Definir proprietário'); expect(host.textContent).toContain('31/12/2099'); expect(host.textContent).toContain('A fazer');
  expect(host.textContent).not.toContain('Entrega atrasada'); expect(host.textContent).not.toContain('Entrega já concluída'); expect(host.textContent).not.toContain('Entrega cancelada');
});

test.each([
  ['impedimentos', [{ id: 'i1', taskId: 't1', title: 'Acesso bloqueado', reason: 'Sem credencial', status: 'open', authorId: 'u2', author: { id: 'u2', name: 'Bia' } }], [], 'Impedimentos', 'Acesso bloqueado'],
  ['dependências', [], [{ id: 'd1', taskId: 't2', dependsOnId: 't1', task: { id: 't2', title: 'Validar entrega', status: 'em_andamento' }, dependsOn: { id: 't1', title: 'Preparar relatório', status: 'a_fazer' } }], 'Dependências', 'Preparar relatório'],
])('detalhes de bloqueio levam ao contexto existente de %s', async (_, issues, dependencies, tab, title) => {
  projectToolsAPI.get.mockResolvedValueOnce({ data: tools({ issues, dependencies }) }); await render();
  const blocked = Array.from(host.querySelectorAll('.pt-metric')).find(card => card.textContent.includes('Bloqueadas'));
  await act(async () => blocked.querySelector('button').click());
  expect(host.querySelector('[role="tab"][aria-selected="true"]').textContent).toBe(tab);
  expect(host.textContent).toContain(title);
});

test('impedimento envia campos preenchidos, bloqueia envio simultâneo e atualiza o projeto', async () => {
  const onChange = jest.fn(); let finish;
  projectToolsAPI.createIssue.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await render(<ProjectToolsPanel projectId="p1" onChange={onChange} />); await click('Impedimentos');
  await fill('Título do impedimento', '  Acesso bloqueado  '); await fill('Motivo e impacto', '  Aguardando permissão  '); await fill('Tarefa relacionada', 't1');
  await submit(host.querySelector('form'));
  expect(button('Salvando...').disabled).toBe(true);
  expect(projectToolsAPI.createIssue).toHaveBeenCalledWith('p1', { title: 'Acesso bloqueado', reason: 'Aguardando permissão', taskId: 't1' });
  await act(async () => finish({ data: {} }));
  expect(onChange).toHaveBeenCalledTimes(1); expect(projectToolsAPI.get).toHaveBeenCalledTimes(2);
  expect(host.textContent).toContain('Impedimento registrado');
});

test('permissão usa canManage do projeto e restringe revisão às tarefas do usuário', async () => {
  projectToolsAPI.get.mockResolvedValue({ data: tools({ canManage: false }) });
  await render(); await click('Dependências');
  expect(button('Adicionar dependência')).toBeUndefined();
  await click('Simulador'); expect(button('Simular distribuição')).toBeUndefined();
  await click('Revisões');
  const options = Array.from(input('Tarefa para revisão').options).map(o => o.textContent);
  expect(options).toContain('Preparar relatório'); expect(options).not.toContain('Validar entrega');
});

test('atualização das tarefas do projeto recarrega ferramentas mantendo a aba selecionada', async () => {
  await render(<ProjectToolsPanel projectId="p1" refreshKey="before" />); await click('Impedimentos');
  projectToolsAPI.get.mockResolvedValueOnce({ data: tools({ issues: [{ id: 'i1', title: 'Novo impedimento', reason: 'Acesso indisponível', authorId: 'u2', status: 'open', author: { id: 'u2', name: 'Bia' } }] }) });
  await render(<ProjectToolsPanel projectId="p1" refreshKey="after" />);
  expect(projectToolsAPI.get).toHaveBeenCalledTimes(2);
  expect(host.textContent).toContain('Novo impedimento');
  expect(host.querySelector('[role="tab"][aria-selected="true"]').textContent).toBe('Impedimentos');
});

test('falha na gravação mantém o formulário preenchido e não anuncia sucesso', async () => {
  projectToolsAPI.createIssue.mockRejectedValueOnce({ response: { data: { message: 'Tarefa removida do projeto' } } });
  await render(); await click('Impedimentos'); await fill('Título do impedimento', 'Sem acesso'); await fill('Motivo e impacto', 'Aguardar retorno');
  await submit(host.querySelector('form'));
  expect(host.textContent).toContain('Tarefa removida do projeto'); expect(host.textContent).not.toContain('Impedimento registrado.');
  expect(input('Título do impedimento').value).toBe('Sem acesso'); expect(projectToolsAPI.get).toHaveBeenCalledTimes(1);
});

test('dependência seleciona predecessora e sucessora sem oferecer a própria tarefa', async () => {
  await render(); await click('Dependências'); await fill('Tarefa que depende', 't2');
  expect(Array.from(input('Tarefa predecessora').options).map(o => o.value)).not.toContain('t2');
  await fill('Tarefa predecessora', 't1'); await submit(host.querySelector('form'));
  expect(projectToolsAPI.createDependency).toHaveBeenCalledWith('p1', { taskId: 't2', dependsOnId: 't1' });
});

test('revisão exige feedback antes de decidir e transmite a decisão correta', async () => {
  projectToolsAPI.get.mockResolvedValue({ data: tools({ reviews: [{ id: 'r1', taskId: 't1', status: 'pending', summary: 'Entregue', evidence: 'Validado em reunião', author: mockUser, task: { id: 't1', title: 'Preparar relatório', status: 'em_andamento', assigneeId: 'u1' }, createdAt: '2026-11-15T12:00:00Z' }] }) });
  await render(); await click('Revisões');
  await click('Solicitar ajustes'); expect(projectToolsAPI.decideReview).not.toHaveBeenCalled();
  expect(host.textContent).toContain('Informe o feedback');
  await fill('Feedback da revisão', 'Detalhar resultados'); await click('Solicitar ajustes');
  expect(projectToolsAPI.decideReview).toHaveBeenCalledWith('p1', 'r1', { decision: 'changes_requested', feedback: 'Detalhar resultados' });
});

test('check-in recupera os campos do dia para o autor e salva sem escolher outro autor', async () => {
  projectToolsAPI.get.mockResolvedValue({ data: tools({ checkIns: [{ id: 'c1', authorId: 'u1', author: mockUser, day: today(), completed: 'Reunião concluída', nextStep: 'Preparar proposta', needsHelp: 'Acesso aos arquivos', createdAt: '2026-11-15T12:00:00Z' }] }) });
  await render(); await click('Check-in');
  expect(input('O que foi concluído?').value).toBe('Reunião concluída');
  await fill('Próximo passo', 'Revisar proposta'); await submit(host.querySelector('form'));
  expect(projectToolsAPI.saveCheckIn).toHaveBeenCalledWith('p1', { completed: 'Reunião concluída', nextStep: 'Revisar proposta', needsHelp: 'Acesso aos arquivos' });
});

test('simulação compara carga de tarefas sem chamar atualização do projeto', async () => {
  const onChange = jest.fn();
  projectToolsAPI.simulate.mockResolvedValue({ data: { members: [{ user: mockUser, before: 3, after: 2, delta: -1 }, { user: { id: 'u2', name: 'Bia' }, before: 1, after: 2, delta: 1 }], warnings: ['Bia recebe mais uma tarefa'] } });
  await render(<ProjectToolsPanel projectId="p1" onChange={onChange} />); await click('Simulador'); await click('Adicionar redistribuição');
  await fill('Tarefa 1', 't1'); await fill('Novo responsável 1', 'u2'); await submit(host.querySelector('form'));
  expect(projectToolsAPI.simulate).toHaveBeenCalledWith('p1', { assignments: [{ taskId: 't1', assigneeId: 'u2' }] });
  expect(onChange).not.toHaveBeenCalled(); expect(projectToolsAPI.get).toHaveBeenCalledTimes(1);
  expect(host.textContent).toContain('Bia recebe mais uma tarefa'); expect(host.textContent).toContain('Depois');
});

test('atualizar as ferramentas invalida o resultado da simulação anterior', async () => {
  projectToolsAPI.simulate.mockResolvedValue({ data: { members: [{ user: mockUser, before: 3, after: 3, delta: 0 }], warnings: [] } });
  await render(); await click('Simulador'); await submit(host.querySelector('form'));
  expect(host.textContent).toContain('Resultado da simulação');
  projectToolsAPI.get.mockResolvedValueOnce({ data: tools({ workload: [{ user: mockUser, active: 7, overdue: 0 }] }) });
  await click('Atualizar');
  expect(host.textContent).not.toContain('Resultado da simulação');
  expect(host.textContent).toContain('7 tarefas ativas');
});

test('novo snapshot remove tarefas inativas do cenário e limpa responsáveis que saíram do projeto', async () => {
  await render(<ProjectToolsPanel projectId="p1" refreshKey="before" />); await click('Simulador');
  await click('Adicionar redistribuição'); await fill('Tarefa 1', 't1'); await fill('Novo responsável 1', 'u2');
  await click('Adicionar redistribuição'); await fill('Tarefa 2', 't2'); await fill('Novo responsável 2', 'u1');
  projectToolsAPI.get.mockResolvedValueOnce({ data: tools({
    tasks: [{ id: 't1', title: 'Preparar relatório', status: 'concluido', priority: 'media', assigneeId: 'u1' }, { id: 't2', title: 'Validar entrega', status: 'em_andamento', priority: 'alta', assigneeId: 'u2' }],
    members: [{ id: 'u2', name: 'Bia', department: 'Design', role: 'employee' }],
  }) });
  await render(<ProjectToolsPanel projectId="p1" refreshKey="after" />);
  expect(host.querySelectorAll('.pt-simulation-row')).toHaveLength(1);
  expect(input('Tarefa 1').value).toBe('t2'); expect(input('Novo responsável 1').value).toBe('');
  await submit(host.querySelector('form')); expect(projectToolsAPI.simulate).not.toHaveBeenCalled();
  await fill('Novo responsável 1', 'u2'); await submit(host.querySelector('form'));
  expect(projectToolsAPI.simulate).toHaveBeenCalledWith('p1', { assignments: [{ taskId: 't2', assigneeId: 'u2' }] });
});

test('resposta de simulação iniciada antes da atualização não repõe resultado obsoleto', async () => {
  let finish;
  projectToolsAPI.simulate.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await render(<ProjectToolsPanel projectId="p1" refreshKey="before" />); await click('Simulador'); await submit(host.querySelector('form'));
  projectToolsAPI.get.mockResolvedValueOnce({ data: tools({ workload: [{ user: mockUser, active: 8, overdue: 0 }] }) });
  await render(<ProjectToolsPanel projectId="p1" refreshKey="after" />);
  await act(async () => finish({ data: { members: [{ user: mockUser, before: 3, after: 3, delta: 0 }], warnings: [] } }));
  expect(host.textContent).not.toContain('Resultado da simulação');
  expect(host.textContent).toContain('8 tarefas ativas');
});

test('memória filtra registros por tipo sem excluir os outros dados', async () => {
  projectToolsAPI.get.mockResolvedValue({ data: tools({ notes: [{ id: 'n1', kind: 'decision', title: 'Decisão técnica', content: 'Usar sistema atual', author: mockUser }, { id: 'n2', kind: 'lesson', title: 'Lição aprendida', content: 'Revisar cedo', author: mockUser }] }) });
  await render(); await click('Memória'); await fill('Filtrar memória', 'lesson');
  expect(host.textContent).toContain('Lição aprendida'); expect(host.textContent).not.toContain('Decisão técnica');
  await fill('Filtrar memória', ''); expect(host.textContent).toContain('Decisão técnica');
});

test('departamentos elimina a origem da escolha e envia os campos do pedido', async () => {
  await render(); await click('Departamentos');
  expect(Array.from(input('Departamento de destino').options).map(o => o.value)).not.toContain('TI');
  await fill('Departamento de destino', 'Design'); await fill('Título do pedido', 'Revisar identidade'); await fill('Descrição do pedido', 'Precisamos de uma avaliação');
  await submit(host.querySelector('form'));
  expect(projectToolsAPI.createDepartmentRequest).toHaveBeenCalledWith('p1', { toDepartment: 'Design', title: 'Revisar identidade', description: 'Precisamos de uma avaliação', priority: 'media' });
});

test('pedidos globais permitem resolver pelo canResolve mesmo sem acesso ao projeto', async () => {
  projectToolsAPI.getDepartmentRequests.mockResolvedValue({ data: { departments: ['TI', 'Design'], requests: [{ id: 'q1', projectId: 'private', project: { id: 'private', name: 'Projeto reservado' }, title: 'Conferir material', description: 'Avaliar cores', fromDepartment: 'Design', toDepartment: 'TI', priority: 'alta', status: 'open', author: { id: 'u2', name: 'Bia' }, canResolve: true, createdAt: '2026-11-15T12:00:00Z' }] } });
  await render(<DepartmentRequestsPanel />);
  expect(host.querySelector('a')).toBeNull();
  await fill('Resolução do pedido', 'Material conferido'); await submit(host.querySelector('form'));
  expect(projectToolsAPI.resolveDepartmentRequest).toHaveBeenCalledWith('private', 'q1', { resolution: 'Material conferido' });
  expect(projectToolsAPI.getDepartmentRequests).toHaveBeenCalledTimes(2);
});

test('pedidos globais respeitam filtros e não mostram ação sem canResolve', async () => {
  projectToolsAPI.getDepartmentRequests.mockResolvedValue({ data: { departments: ['TI', 'Design'], requests: [{ id: 'q1', projectId: 'p1', project: { id: 'p1', name: 'Projeto' }, title: 'Pedido finalizado', description: 'Feito', fromDepartment: 'TI', toDepartment: 'Design', status: 'resolved', resolution: 'Concluído', author: mockUser, canResolve: false }] } });
  await render(<DepartmentRequestsPanel />); expect(host.textContent).toContain('Pedido finalizado');
  expect(button('Resolver pedido')).toBeUndefined(); await fill('Filtrar status dos pedidos', 'open');
  expect(host.textContent).not.toContain('Pedido finalizado'); expect(host.textContent).toContain('Nenhum pedido');
});
