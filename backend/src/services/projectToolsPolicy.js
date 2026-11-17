const PUBLIC_USER_SELECT = { id: true, name: true, avatar: true, department: true, role: true };
const ACCESS_USER_SELECT = { ...PUBLIC_USER_SELECT, active: true };
const TERMINAL_STATUSES = ['concluido', 'cancelado'];
const isAdmin = (user) => ['admin_platform', 'admin_company'].includes(user.role);

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function projectAccess(user, project) {
  const sameDepartment = user.role === 'manager_area' && Boolean(user.department)
    && [project.manager, ...(project.members || [])].some(member => member?.department === user.department);
  const canManage = isAdmin(user) || project.managerId === user.id || sameDepartment;
  return { canAccess: canManage || (project.members || []).some(member => (member.id || member) === user.id), canManage };
}

function canEditTask(user, task, project) {
  return task.assigneeId === user.id || projectAccess(user, project).canManage;
}

function completionBlockers({ issues = [], dependencies = [], reviews = [] }) {
  const blockers = [];
  if (issues.some(issue => issue.status === 'open')) blockers.push('impedimentos');
  if (dependencies.some(dependency => !TERMINAL_STATUSES.includes(dependency.dependsOn?.status))) blockers.push('dependências');
  const latest = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || String(b.id).localeCompare(String(a.id)))[0];
  if (latest && ['pending', 'changes_requested'].includes(latest.status)) blockers.push('revisão');
  return blockers;
}

function simulateAssignments({ tasks, members, workload, assignments }) {
  if (!Array.isArray(assignments) || assignments.length > 100) throw httpError(400, 'Informe até 100 redistribuições');
  const candidates = members.filter(member => member.active);
  const rows = new Map(candidates.map(member => {
    const before = workload.find(row => row.user.id === member.id)?.active || 0;
    return [member.id, { user: { id: member.id, name: member.name }, before, after: before, delta: 0 }];
  }));
  const seen = new Set();
  for (const assignment of assignments) {
    if (!assignment || typeof assignment.taskId !== 'string' || typeof assignment.assigneeId !== 'string') throw httpError(400, 'Redistribuição inválida');
    const task = tasks.find(item => item.id === assignment.taskId);
    if (!task || TERMINAL_STATUSES.includes(task.status)) throw httpError(400, 'Selecione somente tarefas ativas deste projeto');
    if (seen.has(task.id)) throw httpError(400, 'Uma tarefa não pode aparecer duas vezes');
    seen.add(task.id);
    if (!rows.has(assignment.assigneeId)) throw httpError(400, 'O responsável deve ser membro ou gerente ativo do projeto');
    if (rows.has(task.assigneeId)) rows.get(task.assigneeId).after -= 1;
    rows.get(assignment.assigneeId).after += 1;
  }
  const result = [...rows.values()].map(row => ({ ...row, delta: row.after - row.before }));
  const warnings = result.filter(row => row.after > row.before && row.after >= 6).map(row => `${row.user.name} ficará com ${row.after} tarefas ativas.`);
  return { members: result, warnings };
}

async function loadProject(db, id, user, { manage = false, include = {} } = {}) {
  const project = await db.project.findUnique({
    where: { id },
    include: { manager: { select: ACCESS_USER_SELECT }, members: { select: ACCESS_USER_SELECT }, ...include },
  });
  if (!project) throw httpError(404, 'Projeto não encontrado');
  const access = projectAccess(user, project);
  if (!access.canAccess || (manage && !access.canManage)) throw httpError(403, 'Sem permissão neste projeto');
  return { project, ...access };
}

async function projectTransaction(db, projectId, callback) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "projects" WHERE "id" = ${projectId} FOR UPDATE`;
        return callback(tx);
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error.code === 'P2034' && attempt < 2) continue;
      throw error;
    }
  }
}

async function requireTask(db, projectId, taskId) {
  if (typeof taskId !== 'string' || !taskId.trim()) throw httpError(400, 'Selecione uma tarefa');
  const task = await db.task.findFirst({ where: { id: taskId, projectId } });
  if (!task) throw httpError(404, 'Tarefa não encontrada neste projeto');
  return task;
}

async function assertCanComplete(db, taskId, projectId) {
  const [issues, dependencies, reviews] = await Promise.all([
    db.projectIssue.findMany({ where: { projectId, taskId, status: 'open' }, select: { status: true } }),
    db.taskDependency.findMany({ where: { projectId, taskId }, include: { dependsOn: { select: { status: true } } } }),
    db.taskReview.findMany({ where: { projectId, taskId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1, select: { id: true, status: true, createdAt: true } }),
  ]);
  const blocked = completionBlockers({ issues, dependencies, reviews });
  if (blocked.length) throw httpError(409, `Resolva ${blocked.join(', ')} antes de concluir a tarefa`);
}

async function recalcProgress(db, projectId) {
  const tasks = await db.task.findMany({ where: { projectId, status: { not: 'cancelado' } }, select: { status: true } });
  const progress = tasks.length ? Math.round(100 * tasks.filter(task => task.status === 'concluido').length / tasks.length) : 0;
  await db.project.update({ where: { id: projectId }, data: { progress } });
}

async function notifyDependents(db, before, after) {
  if (before.status === 'concluido' || after.status !== 'concluido') return;
  const dependencies = await db.taskDependency.findMany({
    where: { projectId: after.projectId, dependsOnId: after.id },
    include: { task: { select: { id: true, title: true, status: true, assigneeId: true } } },
  });
  const notified = new Set();
  for (const { task } of dependencies) {
    if (!task?.assigneeId || TERMINAL_STATUSES.includes(task.status) || notified.has(task.id)) continue;
    notified.add(task.id);
    await db.notification.create({ data: {
      content: `A dependência "${after.title}" da sua tarefa "${task.title}" foi concluída.`,
      userId: task.assigneeId, taskId: task.id, projectId: after.projectId,
    } });
  }
}

function sendError(res, error) {
  const status = error.status || (error.code === 'P2002' || error.code === 'P2034' ? 409 : error.code === 'P2025' ? 404 : 500);
  return res.status(status).json({ message: error.status ? error.message : status === 409 ? 'Registro duplicado ou alterado. Atualize e tente novamente.' : status === 404 ? 'Registro não encontrado' : 'Erro interno' });
}

module.exports = { PUBLIC_USER_SELECT, ACCESS_USER_SELECT, TERMINAL_STATUSES, isAdmin, httpError, projectAccess, canEditTask, completionBlockers, simulateAssignments, loadProject, projectTransaction, requireTask, assertCanComplete, recalcProgress, notifyDependents, sendError };
