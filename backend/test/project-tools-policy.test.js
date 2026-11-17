const test = require('node:test');
const assert = require('node:assert/strict');
let policy = {};
try { policy = require('../src/services/projectToolsPolicy'); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
const project = {
  id: 'p', managerId: 'manager', manager: { id: 'manager', department: 'TI' },
  members: [{ id: 'member', department: 'Design' }, { id: 'pm-member', department: 'TI' }],
};
const get = (name) => { assert.equal(typeof policy[name], 'function', `Política ${name} ainda não implementada`); return policy[name]; };

test('gerente membro não recebe gestão de projeto que pertence a outro gerente', () => {
  const access = get('projectAccess')({ id: 'pm-member', role: 'project_manager', department: 'TI' }, project);
  assert.deepEqual(access, { canAccess: true, canManage: false });
});

test('gestor de área só gerencia projeto ligado a departamento não nulo', () => {
  const access = get('projectAccess');
  assert.deepEqual(access({ id: 'area', role: 'manager_area', department: 'Design' }, project), { canAccess: true, canManage: true });
  assert.deepEqual(access({ id: 'area', role: 'manager_area', department: 'RH' }, project), { canAccess: false, canManage: false });
  assert.deepEqual(access({ id: 'area', role: 'manager_area', department: null }, { ...project, manager: { department: null } }), { canAccess: false, canManage: false });
  assert.deepEqual(access({ id: 'outside', role: 'employee', department: 'TI' }, project), { canAccess: false, canManage: false });
});

test('edição de tarefa exige responsável ou gestor daquele projeto', () => {
  const canEdit = get('canEditTask');
  assert.equal(canEdit({ id: 'outsider', role: 'project_manager' }, { assigneeId: 'member' }, project), false);
  assert.equal(canEdit({ id: 'member', role: 'employee' }, { assigneeId: 'member' }, project), true);
  assert.equal(canEdit({ id: 'manager', role: 'project_manager' }, { assigneeId: 'member' }, project), true);
});

test('conclusão bloqueia impedimentos, predecessores ativos e revisão vigente', () => {
  const blockers = get('completionBlockers');
  assert.deepEqual(blockers({ issues: [{ status: 'open' }], dependencies: [{ dependsOn: { status: 'em_andamento' } }], reviews: [{ id: 'r', status: 'pending', createdAt: '2026-11-15' }] }), ['impedimentos', 'dependências', 'revisão']);
  assert.deepEqual(blockers({ issues: [], dependencies: [{ dependsOn: { status: 'cancelado' } }], reviews: [{ id: 'old', status: 'changes_requested', createdAt: '2026-11-14' }, { id: 'new', status: 'approved', createdAt: '2026-11-15' }] }), []);
});

test('simulação usa carga global, remove responsável anterior e não altera entradas', () => {
  const simulate = get('simulateAssignments');
  const input = {
    tasks: [{ id: 'a', title: 'A', status: 'a_fazer', assigneeId: 'one' }, { id: 'b', title: 'B', status: 'em_andamento', assigneeId: null }],
    members: [{ id: 'one', name: 'Um', active: true }, { id: 'two', name: 'Dois', active: true }],
    workload: [{ user: { id: 'one' }, active: 8 }, { user: { id: 'two' }, active: 2 }],
    assignments: [{ taskId: 'a', assigneeId: 'two' }, { taskId: 'b', assigneeId: 'two' }],
  };
  const original = structuredClone(input);
  assert.deepEqual(simulate(input).members, [{ user: { id: 'one', name: 'Um' }, before: 8, after: 7, delta: -1 }, { user: { id: 'two', name: 'Dois' }, before: 2, after: 4, delta: 2 }]);
  assert.deepEqual(input, original);
});

test('simulação rejeita tarefas externas, concluídas, duplicadas e responsáveis inativos', () => {
  const simulate = get('simulateAssignments');
  const base = { tasks: [{ id: 'a', status: 'a_fazer' }, { id: 'done', status: 'concluido' }], members: [{ id: 'one', active: true }, { id: 'inactive', active: false }], workload: [] };
  for (const assignments of [[{ taskId: 'external', assigneeId: 'one' }], [{ taskId: 'done', assigneeId: 'one' }], [{ taskId: 'a', assigneeId: 'inactive' }], [{ taskId: 'a', assigneeId: 'one' }, { taskId: 'a', assigneeId: 'one' }], Array(101).fill({ taskId: 'a', assigneeId: 'one' })]) {
    assert.throws(() => simulate({ ...base, assignments }), (error) => error.status === 400);
  }
  assert.deepEqual(simulate({ ...base, assignments: [] }).members, [{ user: { id: 'one', name: undefined }, before: 0, after: 0, delta: 0 }]);
});
