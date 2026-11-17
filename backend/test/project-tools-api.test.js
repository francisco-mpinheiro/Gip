const test = require('node:test');
const assert = require('node:assert/strict');
const prismaPath = require.resolve('../src/config/prisma');
const db = {};
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: db };
const reply = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const manager = { id: 'manager', name: 'Gerente', role: 'project_manager', department: 'TI', active: true };
const member = { id: 'member', name: 'Membro', role: 'employee', department: 'TI', active: true };
const task = { id: 'task', title: 'Tarefa', projectId: 'project', status: 'em_andamento', assigneeId: member.id };
let state;
function reset() {
  state = { project: { id: 'project', managerId: manager.id, manager, members: [member], tasks: [task] }, task: { ...task }, issues: [], dependencies: [], reviews: [], activities: [], notifications: [], writes: 0 };
  Object.assign(db, {
    $queryRaw: async () => [],
    $transaction: async callback => callback(db),
    project: { findUnique: async () => state.project, update: async () => ({}) },
    user: { findMany: async () => [{ department: 'TI' }, { department: 'Design' }] },
    task: {
      findUnique: async () => state.task,
      findFirst: async ({ where }) => where.id === state.task.id && where.projectId === state.task.projectId ? state.task : null,
      findMany: async () => [state.task],
      update: async ({ data }) => { state.writes++; state.task = { ...state.task, ...data }; return state.task; },
      create: async ({ data }) => { state.writes++; return { ...data, id: 'new' }; },
    },
    projectIssue: { findMany: async () => state.issues, findFirst: async () => state.issues[0] || null, create: async ({ data }) => { state.writes++; return data; } },
    taskDependency: { findMany: async ({ where }) => where.dependsOnId ? state.dependencies.filter(d => d.dependsOnId === where.dependsOnId) : state.dependencies, create: async ({ data }) => { state.writes++; return data; } },
    taskReview: {
      findMany: async () => state.reviews.slice(-1),
      findFirst: async ({ where }) => state.reviews.find(review => (!where.id || review.id === where.id) && (!where.status || review.status === where.status)) || null,
      create: async ({ data }) => { state.writes++; const review = { id: 'review', createdAt: new Date(), status: 'pending', ...data }; state.reviews.push(review); return review; },
      update: async ({ where, data }) => { const review = state.reviews.find(item => item.id === where.id); Object.assign(review, data); return review; },
    },
    activity: { create: async ({ data }) => { state.activities.push(data); return data; } },
    notification: { create: async ({ data }) => { state.notifications.push(data); return data; } },
    departmentRequest: { findFirst: async () => null, findMany: async () => [] },
  });
}
function tools() {
  let controller = {};
  try { controller = require('../src/controllers/projectToolsController'); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
  return controller;
}
async function call(name, options = {}, existing = false) {
  const controller = existing ? require('../src/controllers/tasksController') : tools();
  assert.equal(typeof controller[name], 'function', `Endpoint ${name} ainda não implementado`);
  const response = reply();
  await controller[name]({ user: member, params: { id: 'project', itemId: 'item' }, body: {}, ...options }, response);
  return response;
}

test('painel nega gerente externo e não expõe qualquer recurso', async () => {
  reset();
  const response = await call('getTools', { user: { id: 'external', role: 'project_manager' } });
  assert.equal(response.code, 403);
  assert.equal(state.writes, 0);
});

test('impedimento rejeita tarefa pertencente a outro projeto', async () => {
  reset();
  const response = await call('createIssue', { body: { title: 'Bloqueio', reason: 'Sem acesso', taskId: 'external' } });
  assert.equal(response.code, 404);
  assert.equal(state.writes, 0);
});

test('membro não pode criar dependência e ciclo não é persistido', async () => {
  reset();
  const denied = await call('createDependency', { body: { taskId: 'task', dependsOnId: 'other' } });
  assert.equal(denied.code, 403);
  const other = { ...task, id: 'other' };
  db.task.findFirst = async ({ where }) => [state.task, other].find(t => t.id === where.id) || null;
  state.dependencies.push({ taskId: 'other', dependsOnId: 'task' });
  const cycle = await call('createDependency', { user: manager, body: { taskId: 'task', dependsOnId: 'other' } });
  assert.equal(cycle.code, 409);
  assert.equal(state.writes, 0);
});

test('revisão exige responsável ou gestor e impede duas pendentes', async () => {
  reset();
  state.project.members.push({ id: 'colleague', role: 'employee' });
  const denied = await call('submitReview', { user: { id: 'colleague', role: 'employee' }, body: { taskId: 'task', summary: 'Pronto' } });
  assert.equal(denied.code, 403);
  state.reviews.push({ id: 'pending', taskId: 'task', projectId: 'project', status: 'pending', createdAt: new Date() });
  const duplicate = await call('submitReview', { body: { taskId: 'task', summary: 'Pronto' } });
  assert.equal(duplicate.code, 409);
  assert.equal(state.writes, 0);
});

test('aprovação conclui tarefa, registra auditoria e notifica dependente uma vez', async () => {
  reset();
  state.reviews.push({ id: 'item', taskId: 'task', projectId: 'project', status: 'pending', createdAt: new Date(), authorId: member.id });
  const dependency = { dependsOnId: 'task', task: { id: 'dependent', title: 'Dependente', status: 'a_fazer', assigneeId: member.id } };
  state.dependencies = [dependency, dependency];
  db.taskDependency.findMany = async ({ where }) => where.dependsOnId ? state.dependencies : [];
  const response = await call('decideReview', { user: manager, body: { decision: 'approved', feedback: 'Validado' } });
  assert.equal(response.code, 200);
  assert.equal(state.task.status, 'concluido');
  assert.equal(state.reviews[0].status, 'approved');
  assert.equal(state.notifications.length, 1);
  assert.equal(state.activities.length, 1);
});

test('destinatário de departamento resolve pedido sem ser membro do projeto', async () => {
  reset();
  db.departmentRequest.findFirst = async () => ({ id: 'item', projectId: 'project', authorId: member.id, toDepartment: 'Design', status: 'open', title: 'Pedido' });
  db.departmentRequest.update = async ({ data }) => ({ id: 'item', ...data });
  const response = await call('resolveDepartmentRequest', { user: { id: 'destination', role: 'employee', department: 'Design' }, body: { resolution: 'Feito' } });
  assert.equal(response.code, 200);
  assert.equal(response.body.status, 'resolved');
});

test('rota antiga de status nega gerente de outro projeto', async () => {
  reset();
  const response = await call('updateStatus', { user: { id: 'external', role: 'project_manager' }, params: { id: 'task' }, body: { status: 'concluido' } }, true);
  assert.equal(response.code, 403);
  assert.equal(state.writes, 0);
});

test('rotas antigas update e status não contornam impedimento ou revisão', async () => {
  for (const name of ['update', 'updateStatus']) {
    reset();
    state.issues.push({ status: 'open' });
    const blocked = await call(name, { params: { id: 'task' }, body: { status: 'concluido' } }, true);
    assert.equal(blocked.code, 409);
    assert.equal(state.writes, 0);
    reset();
    state.reviews.push({ id: 'pending', status: 'pending', createdAt: new Date() });
    const review = await call(name, { params: { id: 'task' }, body: { status: 'concluido' } }, true);
    assert.equal(review.code, 409);
    assert.equal(state.writes, 0);
  }
});

test('criação de tarefa concluída exige gestão do projeto', async () => {
  reset();
  const response = await call('create', { user: { id: 'external', role: 'project_manager' }, params: {}, body: { projectId: 'project', title: 'Concluída', status: 'concluido' } }, true);
  assert.equal(response.code, 403);
  assert.equal(state.writes, 0);
});

test('conclusão repetida não duplica notificação de dependência', async () => {
  reset();
  const dependency = { dependsOnId: 'task', task: { id: 'dependent', title: 'Dependente', status: 'a_fazer', assigneeId: member.id } };
  db.taskDependency.findMany = async ({ where }) => where.dependsOnId ? [dependency, dependency] : [];
  const request = { params: { id: 'task' }, body: { status: 'concluido' } };
  const first = await call('updateStatus', request, true);
  const second = await call('updateStatus', request, true);
  assert.equal(first.code, 200);
  assert.equal(second.code, 200);
  assert.equal(state.notifications.length, 1);
});

test('painel só expõe perfis públicos e contagens da carga privada', async () => {
  reset();
  Object.assign(state.project, { issues: [], dependencies: [], reviews: [], checkIns: [], notes: [], departmentRequests: [] });
  state.project.manager = { ...manager, password: 'secret', resetToken: 'secret' };
  state.project.members = [{ ...member, email: 'private@example.invalid', password: 'secret' }];
  db.task.findMany = async () => [{ assigneeId: member.id, title: 'Privada fora do projeto', description: 'Segredo', dueDate: null }];
  const response = await call('getTools');
  assert.equal(response.code, 200);
  assert.equal(response.body.workload.find(row => row.user.id === member.id).active, 1);
  assert.equal(JSON.stringify(response.body).includes('secret'), false);
  assert.equal(JSON.stringify(response.body).includes('private@example.invalid'), false);
  assert.equal(JSON.stringify(response.body).includes('Privada fora do projeto'), false);
});

test('simulação gerencial retorna diferenças sem gravar tarefa ou atividade', async () => {
  reset();
  const response = await call('simulate', { user: manager, body: { assignments: [{ taskId: 'task', assigneeId: manager.id }] } });
  assert.equal(response.code, 200);
  assert.equal(response.body.members.find(row => row.user.id === member.id).delta, -1);
  assert.equal(response.body.members.find(row => row.user.id === manager.id).delta, 1);
  assert.equal(state.writes, 0);
  assert.equal(state.activities.length, 0);
  assert.equal(state.task.assigneeId, member.id);
});

test('check-in usa autor autenticado e dia civil atual sem aceitar valores do cliente', async () => {
  reset();
  let saved;
  db.projectCheckIn = { upsert: async ({ where, create }) => { saved = { where, ...create }; return create; } };
  const response = await call('saveCheckIn', { body: { completed: 'Entrega', nextStep: 'Continuar', authorId: 'other', day: '2000-01-01' } });
  assert.equal(response.code, 200);
  assert.equal(saved.authorId, member.id);
  assert.notEqual(saved.day, '2000-01-01');
  assert.match(saved.day, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(saved.where.projectId_authorId_day, { projectId: 'project', authorId: member.id, day: saved.day });
});
