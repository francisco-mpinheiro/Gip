const prisma = require('../config/prisma');
const { computeProjectHealth, wouldCreateCycle } = require('../services/projectInsights');
const {
  PUBLIC_USER_SELECT, ACCESS_USER_SELECT, TERMINAL_STATUSES, isAdmin, httpError, projectAccess,
  canEditTask, simulateAssignments, loadProject, projectTransaction, requireTask,
  assertCanComplete, recalcProgress, notifyDependents, sendError,
} = require('../services/projectToolsPolicy');

const AUTHOR = { select: { id: true, name: true } };
const TASK_SELECT = { id: true, title: true, status: true, priority: true, dueDate: true, assigneeId: true };
const REVIEW_INCLUDE = { author: AUTHOR, reviewer: AUTHOR, task: { select: { id: true, title: true, status: true, assigneeId: true } } };
const DEPENDENCY_INCLUDE = { task: { select: { id: true, title: true, status: true } }, dependsOn: { select: { id: true, title: true, status: true } } };
const RECENT = [{ createdAt: 'desc' }, { id: 'desc' }];

function text(value, label, max = 4000, optional = false) {
  if (optional && (value === undefined || value === null || value === '')) return null;
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw httpError(400, `${label} é obrigatório e deve ter até ${max} caracteres`);
  return value.trim();
}
function option(value, allowed, label) {
  if (!allowed.includes(value)) throw httpError(400, `${label} inválido`);
  return value;
}
function publicUser(user) {
  return Object.fromEntries(Object.keys(PUBLIC_USER_SELECT).map(key => [key, user[key]]));
}
function candidates(project) {
  return [...new Map([project.manager, ...project.members].filter(Boolean).map(user => [user.id, user])).values()];
}
async function departments(db) {
  const users = await db.user.findMany({ where: { department: { not: null } }, select: { department: true }, distinct: ['department'], orderBy: { department: 'asc' } });
  return users.map(user => user.department).filter(value => typeof value === 'string' && value.trim());
}
function saoPauloDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = type => parts.find(item => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
async function workload(db, users) {
  const activeUsers = users.filter(user => user.active);
  const tasks = await db.task.findMany({ where: { assigneeId: { in: activeUsers.map(user => user.id) }, status: { notIn: TERMINAL_STATUSES } }, select: { assigneeId: true, dueDate: true } });
  const today = saoPauloDay();
  return activeUsers.map(user => ({
    user: { id: user.id, name: user.name, avatar: user.avatar, department: user.department },
    active: tasks.filter(task => task.assigneeId === user.id).length,
    overdue: tasks.filter(task => task.assigneeId === user.id && task.dueDate && new Date(task.dueDate).toISOString().slice(0, 10) < today).length,
  }));
}
async function item(db, model, projectId, id) {
  const result = await db[model].findFirst({ where: { id, projectId } });
  if (!result) throw httpError(404, 'Registro não encontrado neste projeto');
  return result;
}
async function activity(db, user, projectId, action, target, taskId = null) {
  await db.activity.create({ data: { userId: user.id, projectId, taskId, action, target } });
}
function mutation(handler, status = 200) {
  return async (req, res) => {
    try {
      const result = await projectTransaction(prisma, req.params.id, tx => handler(tx, req));
      return res.status(status).json(result);
    } catch (error) { return sendError(res, error); }
  };
}

exports.getTools = async (req, res) => {
  try {
    const { project, canManage } = await loadProject(prisma, req.params.id, req.user, { include: {
      tasks: { select: TASK_SELECT },
      issues: { include: { author: AUTHOR, task: { select: { id: true, title: true } } }, orderBy: RECENT },
      dependencies: { include: DEPENDENCY_INCLUDE, orderBy: RECENT },
      reviews: { include: REVIEW_INCLUDE, orderBy: RECENT },
      checkIns: { include: { author: AUTHOR }, orderBy: RECENT },
      notes: { include: { author: AUTHOR }, orderBy: RECENT },
      departmentRequests: { include: { author: AUTHOR }, orderBy: RECENT },
    } });
    const users = candidates(project);
    const [allDepartments, loads] = await Promise.all([departments(prisma), workload(prisma, users)]);
    res.json({
      canManage, health: computeProjectHealth(project), tasks: project.tasks,
      members: users.filter(user => user.active).map(publicUser), departments: allDepartments,
      issues: project.issues, dependencies: project.dependencies, reviews: project.reviews,
      checkIns: project.checkIns, notes: project.notes, requests: project.departmentRequests, workload: loads,
    });
  } catch (error) { return sendError(res, error); }
};

exports.createIssue = mutation(async (tx, req) => {
  await loadProject(tx, req.params.id, req.user);
  const title = text(req.body.title, 'Título', 160);
  const reason = text(req.body.reason, 'Motivo');
  const taskId = req.body.taskId || null;
  if (taskId) await requireTask(tx, req.params.id, taskId);
  const result = await tx.projectIssue.create({ data: { projectId: req.params.id, authorId: req.user.id, taskId, title, reason }, include: { author: AUTHOR, task: { select: { id: true, title: true } } } });
  await activity(tx, req.user, req.params.id, 'registrou um impedimento', title, taskId);
  return result;
}, 201);

exports.resolveIssue = mutation(async (tx, req) => {
  const { canManage } = await loadProject(tx, req.params.id, req.user);
  const issue = await item(tx, 'projectIssue', req.params.id, req.params.itemId);
  if (!canManage && issue.authorId !== req.user.id) throw httpError(403, 'Somente o autor ou gestor pode resolver o impedimento');
  if (issue.status !== 'open') throw httpError(409, 'Este impedimento já foi resolvido');
  const resolution = text(req.body.resolution, 'Resolução');
  const result = await tx.projectIssue.update({ where: { id: issue.id }, data: { status: 'resolved', resolution, resolvedAt: new Date() }, include: { author: AUTHOR, task: { select: { id: true, title: true } } } });
  await activity(tx, req.user, req.params.id, 'resolveu um impedimento', issue.title, issue.taskId);
  return result;
});

exports.createDependency = mutation(async (tx, req) => {
  await loadProject(tx, req.params.id, req.user, { manage: true });
  const task = await requireTask(tx, req.params.id, req.body.taskId);
  const predecessor = await requireTask(tx, req.params.id, req.body.dependsOnId);
  const dependencies = await tx.taskDependency.findMany({ where: { projectId: req.params.id }, select: { taskId: true, dependsOnId: true } });
  if (task.id === predecessor.id || wouldCreateCycle(dependencies, task.id, predecessor.id)) throw httpError(409, 'A dependência criaria um ciclo');
  if (dependencies.some(dependency => dependency.taskId === task.id && dependency.dependsOnId === predecessor.id)) throw httpError(409, 'Esta dependência já existe');
  const result = await tx.taskDependency.create({ data: { projectId: req.params.id, taskId: task.id, dependsOnId: predecessor.id, authorId: req.user.id }, include: DEPENDENCY_INCLUDE });
  await activity(tx, req.user, req.params.id, 'adicionou uma dependência', `${predecessor.title} → ${task.title}`, task.id);
  return result;
}, 201);

exports.deleteDependency = mutation(async (tx, req) => {
  await loadProject(tx, req.params.id, req.user, { manage: true });
  const dependency = await item(tx, 'taskDependency', req.params.id, req.params.itemId);
  const task = await requireTask(tx, req.params.id, dependency.taskId);
  await tx.taskDependency.delete({ where: { id: dependency.id } });
  await activity(tx, req.user, req.params.id, 'removeu uma dependência', task.title, task.id);
  return { message: 'Dependência removida' };
});

exports.submitReview = mutation(async (tx, req) => {
  const { project } = await loadProject(tx, req.params.id, req.user);
  const task = await requireTask(tx, req.params.id, req.body.taskId);
  if (!canEditTask(req.user, task, project)) throw httpError(403, 'Somente o responsável ou gestor pode enviar a revisão');
  if (TERMINAL_STATUSES.includes(task.status)) throw httpError(409, 'Envie para revisão uma tarefa ativa');
  const summary = text(req.body.summary, 'Resumo');
  const evidence = text(req.body.evidence, 'Evidências', 8000, true);
  if (await tx.taskReview.findFirst({ where: { projectId: req.params.id, taskId: task.id, status: 'pending' } })) throw httpError(409, 'Esta tarefa já possui uma revisão pendente');
  const result = await tx.taskReview.create({ data: { projectId: req.params.id, taskId: task.id, authorId: req.user.id, summary, evidence }, include: REVIEW_INCLUDE });
  await activity(tx, req.user, req.params.id, 'enviou uma tarefa para revisão', task.title, task.id);
  return result;
}, 201);

exports.decideReview = mutation(async (tx, req) => {
  await loadProject(tx, req.params.id, req.user, { manage: true });
  const review = await item(tx, 'taskReview', req.params.id, req.params.itemId);
  if (review.status !== 'pending') throw httpError(409, 'Esta revisão já foi decidida');
  const decision = option(req.body.decision, ['approved', 'changes_requested'], 'Decisão');
  const feedback = text(req.body.feedback, 'Feedback');
  const task = await requireTask(tx, req.params.id, review.taskId);
  await tx.taskReview.update({ where: { id: review.id }, data: { status: decision, reviewerId: req.user.id, feedback, reviewedAt: new Date() } });
  if (decision === 'approved') await assertCanComplete(tx, task.id, req.params.id);
  const updated = await tx.task.update({ where: { id: task.id }, data: { status: decision === 'approved' ? 'concluido' : 'em_andamento' } });
  await activity(tx, req.user, req.params.id, decision === 'approved' ? 'aprovou uma revisão' : 'solicitou ajustes na tarefa', task.title, task.id);
  await recalcProgress(tx, req.params.id);
  await notifyDependents(tx, task, updated);
  return tx.taskReview.findFirst({ where: { id: review.id, projectId: req.params.id }, include: REVIEW_INCLUDE });
});

exports.saveCheckIn = mutation(async (tx, req) => {
  await loadProject(tx, req.params.id, req.user);
  const completed = text(req.body.completed, 'O que foi concluído');
  const nextStep = text(req.body.nextStep, 'Próximo passo');
  const needsHelp = text(req.body.needsHelp, 'Ajuda necessária', 4000, true);
  const day = saoPauloDay();
  const key = { projectId: req.params.id, authorId: req.user.id, day };
  const result = await tx.projectCheckIn.upsert({ where: { projectId_authorId_day: key }, create: { ...key, completed, nextStep, needsHelp }, update: { completed, nextStep, needsHelp }, include: { author: AUTHOR } });
  await activity(tx, req.user, req.params.id, 'registrou o check-in diário', day);
  return result;
});

exports.createNote = mutation(async (tx, req) => {
  await loadProject(tx, req.params.id, req.user);
  const kind = option(req.body.kind, ['decision', 'scope', 'lesson'], 'Tipo');
  const title = text(req.body.title, 'Título', 160);
  const content = text(req.body.content, 'Conteúdo', 8000);
  const result = await tx.projectNote.create({ data: { projectId: req.params.id, authorId: req.user.id, kind, title, content }, include: { author: AUTHOR } });
  await activity(tx, req.user, req.params.id, 'registrou uma memória do projeto', title);
  return result;
}, 201);

exports.createDepartmentRequest = mutation(async (tx, req) => {
  await loadProject(tx, req.params.id, req.user);
  const fromDepartment = text(req.user.department, 'Departamento de origem', 160);
  const toDepartment = text(req.body.toDepartment, 'Departamento de destino', 160);
  if (fromDepartment === toDepartment || !(await departments(tx)).includes(toDepartment)) throw httpError(400, 'Selecione outro departamento existente na empresa');
  const title = text(req.body.title, 'Título', 160);
  const description = text(req.body.description, 'Descrição');
  const priority = option(req.body.priority || 'media', ['baixa', 'media', 'alta', 'urgente'], 'Prioridade');
  const result = await tx.departmentRequest.create({ data: { projectId: req.params.id, authorId: req.user.id, fromDepartment, toDepartment, title, description, priority }, include: { author: AUTHOR } });
  await activity(tx, req.user, req.params.id, 'solicitou apoio de outro departamento', title);
  return result;
}, 201);

function canResolveRequest(user, request, project) {
  return isAdmin(user) || request.authorId === user.id || Boolean(user.department && request.toDepartment === user.department) || Boolean(project && projectAccess(user, project).canManage);
}
exports.resolveDepartmentRequest = mutation(async (tx, req) => {
  const request = await item(tx, 'departmentRequest', req.params.id, req.params.itemId);
  const project = await tx.project.findUnique({ where: { id: req.params.id }, include: { manager: { select: ACCESS_USER_SELECT }, members: { select: ACCESS_USER_SELECT } } });
  if (!canResolveRequest(req.user, request, project)) throw httpError(403, 'Sem permissão para resolver este pedido');
  if (request.status !== 'open') throw httpError(409, 'Este pedido já foi resolvido');
  const resolution = text(req.body.resolution, 'Resolução');
  const result = await tx.departmentRequest.update({ where: { id: request.id }, data: { status: 'resolved', resolution, resolvedAt: new Date() }, include: { author: AUTHOR } });
  await activity(tx, req.user, req.params.id, 'resolveu um pedido de departamento', request.title);
  return result;
});

exports.getDepartmentRequests = async (req, res) => {
  try {
    const scope = [{ authorId: req.user.id }];
    if (req.user.department) scope.push({ fromDepartment: req.user.department }, { toDepartment: req.user.department });
    const [requests, allDepartments] = await Promise.all([
      prisma.departmentRequest.findMany({
        where: isAdmin(req.user) ? {} : { OR: scope },
        include: { author: AUTHOR, project: { select: { id: true, name: true, managerId: true, manager: { select: ACCESS_USER_SELECT }, members: { select: ACCESS_USER_SELECT } } } }, orderBy: RECENT,
      }),
      departments(prisma),
    ]);
    res.json({ requests: requests.map(request => ({ ...request, canResolve: canResolveRequest(req.user, request, request.project), project: { id: request.project.id, name: request.project.name } })), departments: allDepartments });
  } catch (error) { return sendError(res, error); }
};

exports.simulate = async (req, res) => {
  try {
    const { project } = await loadProject(prisma, req.params.id, req.user, { manage: true, include: { tasks: { select: TASK_SELECT } } });
    const users = candidates(project);
    const loads = await workload(prisma, users);
    res.json(simulateAssignments({ tasks: project.tasks, members: users, workload: loads, assignments: req.body.assignments }));
  } catch (error) { return sendError(res, error); }
};
