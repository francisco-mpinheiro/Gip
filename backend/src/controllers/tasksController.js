const { ROLES } = require('../config/database');
const prisma = require('../config/prisma');
const { loadProject, projectTransaction, requireTask, canEditTask, assertCanComplete, recalcProgress: recalcProjectProgress, notifyDependents, httpError, sendError } = require('../services/projectToolsPolicy');

async function checkImmediateDeadline(task, db = prisma) {
  if (!task.dueDate || !task.assigneeId || ['concluido', 'cancelado'].includes(task.status)) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDateStr = task.dueDate.toISOString().split('T')[0];
  const [y, m, d] = dueDateStr.split('-');
  const dueDate = new Date(y, m - 1, d);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 2) {
    await db.notification.create({
      data: { content: `O prazo da tarefa "${task.title}" se encerra em 2 dias.`, userId: task.assigneeId, taskId: task.id, projectId: task.projectId }
    });
  } else if (diffDays === 1) {
    await db.notification.create({
      data: { content: `O prazo da tarefa "${task.title}" se encerra amanhã!`, userId: task.assigneeId, taskId: task.id, projectId: task.projectId }
    });
  } else if (diffDays === 0) {
    await db.notification.create({
      data: { content: `Atenção: O prazo da tarefa "${task.title}" se encerra HOJE!`, userId: task.assigneeId, taskId: task.id, projectId: task.projectId }
    });
  }
}

const recalcProgress = (projectId) => recalcProjectProgress(prisma, projectId);

// GET /api/tasks
exports.getAll = async (req, res) => {
  try {
    const { projectId, assigneeId, status, priority } = req.query;
    let where = {};

    if (req.user.role === ROLES.EMPLOYEE) {
      const myProjects = await prisma.project.findMany({
        where: { members: { some: { id: req.user.id } } },
        select: { id: true }
      });
      const myProjectIds = myProjects.map(p => p.id);
      
      where.OR = [
        { projectId: { in: myProjectIds } },
        { assigneeId: req.user.id }
      ];
    }

    if (projectId) where.projectId = projectId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true } },
        attachments: true,
        _count: { select: { comments: true, attachments: true } }
      }
    });

    const enriched = tasks.map(t => ({
      ...t,
      overdue: t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'concluido',
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

// GET /api/tasks/:id
exports.getById = async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { attachments: true }
    });
    if (!task) return res.status(404).json({ message: 'Tarefa não encontrada' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

const VALID_TASK_STATUSES = ['a_fazer', 'em_andamento', 'concluido', 'cancelado'];

function validateDueDate(value, project) {
  if (!value) return null;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) throw httpError(400, 'Prazo inválido');
  const dateOnly = date => new Date(date).toISOString().slice(0, 10);
  if (dateOnly(due) < dateOnly(project.startDate) || (project.endDate && dateOnly(due) > dateOnly(project.endDate))) {
    throw httpError(400, 'O prazo da tarefa não pode estar fora do período do projeto');
  }
  return due;
}
function validateAssignee(assigneeId, project) {
  if (!assigneeId) return null;
  const users = [project.manager, ...project.members];
  if (typeof assigneeId !== 'string' || !users.some(user => user?.id === assigneeId && user.active)) throw httpError(400, 'O responsável deve ser membro ou gerente ativo do projeto');
  return assigneeId;
}

// POST /api/tasks
exports.create = async (req, res) => {
  try {
    const { title, description, projectId, assigneeId, status = 'a_fazer', priority = 'media', dueDate } = req.body;
    if (typeof title !== 'string' || !title.trim() || !projectId) throw httpError(400, 'Título e projeto são obrigatórios');
    if (!VALID_TASK_STATUSES.includes(status)) throw httpError(400, 'Status inválido');
    const newTask = await projectTransaction(prisma, projectId, async tx => {
      const { project } = await loadProject(tx, projectId, req.user, { manage: true });
      const newTask = await tx.task.create({ data: {
        title: title.trim(), description: description || '', projectId,
        assigneeId: validateAssignee(assigneeId, project), status, priority,
        dueDate: validateDueDate(dueDate, project),
        activities: { create: { userId: req.user.id, action: 'criou a tarefa', target: title.trim(), projectId } },
      } });
      if (status === 'concluido') await assertCanComplete(tx, newTask.id, projectId);
      if (newTask.assigneeId) await tx.notification.create({ data: {
        content: `Uma nova tarefa foi delegada a você: "${newTask.title}"`, userId: newTask.assigneeId, taskId: newTask.id, projectId,
      } });
      await checkImmediateDeadline(newTask, tx);
      await recalcProjectProgress(tx, projectId);
      return newTask;
    });
    res.status(201).json(newTask);
  } catch (error) { return sendError(res, error); }
};

async function updateTask(req, statusOnly) {
  const original = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!original) throw httpError(404, 'Tarefa não encontrada');
  return projectTransaction(prisma, original.projectId, async tx => {
    const { project } = await loadProject(tx, original.projectId, req.user);
    const task = await requireTask(tx, original.projectId, req.params.id);
    if (!canEditTask(req.user, task, project)) throw httpError(403, 'Sem permissão para editar esta tarefa');
    const data = {};
    const fields = statusOnly ? ['status'] : ['title', 'description', 'assigneeId', 'status', 'priority', 'dueDate'];
    fields.forEach(field => { if (req.body[field] !== undefined) data[field] = req.body[field]; });
    if ((statusOnly || data.status !== undefined) && !VALID_TASK_STATUSES.includes(data.status)) throw httpError(400, 'Status inválido');
    if (data.title !== undefined && (typeof data.title !== 'string' || !data.title.trim())) throw httpError(400, 'Título é obrigatório');
    if (data.assigneeId !== undefined) data.assigneeId = validateAssignee(data.assigneeId, project);
    if (data.dueDate !== undefined) data.dueDate = validateDueDate(data.dueDate, project);
    if (data.status === 'concluido') await assertCanComplete(tx, task.id, task.projectId);
    const updatedTask = await tx.task.update({ where: { id: task.id }, data: {
      ...data,
      activities: { create: {
        userId: req.user.id,
        action: statusOnly ? `moveu "${task.title}" para` : 'atualizou a tarefa',
        target: statusOnly ? data.status.replace('_', ' ') : data.title || task.title,
        projectId: task.projectId,
      } },
    } });
    if (data.assigneeId && data.assigneeId !== task.assigneeId) await tx.notification.create({ data: {
      content: `Uma tarefa foi delegada a você: "${updatedTask.title}"`, userId: data.assigneeId, taskId: task.id, projectId: task.projectId,
    } });
    if (!statusOnly) await checkImmediateDeadline(updatedTask, tx);
    await recalcProjectProgress(tx, task.projectId);
    await notifyDependents(tx, task, updatedTask);
    return updatedTask;
  });
}

// PUT /api/tasks/:id
exports.update = async (req, res) => {
  try { res.json(await updateTask(req, false)); } catch (error) { return sendError(res, error); }
};

// PATCH /api/tasks/:id/status
exports.updateStatus = async (req, res) => {
  try { res.json(await updateTask(req, true)); } catch (error) { return sendError(res, error); }
};

// DELETE /api/tasks/:id
exports.delete = async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ message: 'Tarefa não encontrada' });

    const projectId = task.projectId;
    
    // Manual cascading deletion of associated activities
    await prisma.activity.deleteMany({ where: { taskId: req.params.id } });
    
    // Manual cascading deletion of associated comments
    await prisma.comment.deleteMany({ where: { taskId: req.params.id } });
    
    await prisma.task.delete({ where: { id: req.params.id } });
    
    await recalcProgress(projectId);
    res.json({ message: 'Tarefa removida com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

// GET /api/tasks/:id/comments
exports.getComments = async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { taskId: req.params.id },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

// POST /api/tasks/:id/comments
exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Conteúdo do comentário é obrigatório' });

    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ message: 'Tarefa não encontrada' });

    const newComment = await prisma.comment.create({
      data: {
        content,
        taskId: req.params.id,
        userId: req.user.id
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    });

    res.status(201).json(newComment);
  } catch (err) {
    console.error('Erro ao adicionar comentário:', err);
    res.status(500).json({ message: 'Erro interno ao adicionar comentário' });
  }
};

// POST /api/tasks/:id/attachments
exports.addAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado' });

    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ message: 'Tarefa não encontrada' });

    const newAttachment = await prisma.taskAttachment.create({
      data: {
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        taskId: req.params.id,
        userId: req.user.id
      }
    });

    res.status(201).json(newAttachment);
  } catch (err) {
    console.error('Erro ao adicionar anexo:', err);
    res.status(500).json({ message: 'Erro interno ao adicionar anexo' });
  }
};

// DELETE /api/tasks/:id/attachments/:attachmentId
exports.deleteAttachment = async (req, res) => {
  try {
    const attachment = await prisma.taskAttachment.findUnique({ where: { id: req.params.attachmentId } });
    if (!attachment) return res.status(404).json({ message: 'Anexo não encontrado' });

    await prisma.taskAttachment.delete({ where: { id: req.params.attachmentId } });

    // Excluir arquivo físico
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../../', attachment.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: 'Anexo removido com sucesso' });
  } catch (err) {
    console.error('Erro ao remover anexo:', err);
    res.status(500).json({ message: 'Erro interno ao remover anexo' });
  }
};
