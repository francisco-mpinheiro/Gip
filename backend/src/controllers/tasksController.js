const { v4: uuidv4 } = require('uuid');
const { ROLES } = require('../config/database');
const prisma = require('../config/prisma');

const recalcProgress = async (projectId) => {
  try {
    const tasks = await prisma.task.findMany({ where: { projectId } });
    if (tasks.length === 0) {
      await prisma.project.update({ where: { id: projectId }, data: { progress: 0 } });
      return;
    }
    const done = tasks.filter(t => t.status === 'concluido').length;
    const progress = Math.round((done / tasks.length) * 100);
    await prisma.project.update({ where: { id: projectId }, data: { progress } });
  } catch (err) {
    console.error('Failed to recalc progress', err);
  }
};

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
        attachments: true
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

// POST /api/tasks
exports.create = async (req, res) => {
  try {
    const { title, description, projectId, assigneeId, status, priority, dueDate } = req.body;
    if (!title || !projectId) return res.status(400).json({ message: 'Título e projeto são obrigatórios' });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: 'Projeto não encontrado' });

    const newTask = await prisma.task.create({
      data: {
        title,
        description: description || '',
        projectId,
        assigneeId: assigneeId || null,
        status: status || 'a_fazer',
        priority: priority || 'media',
        dueDate: dueDate ? new Date(dueDate) : null,
        activities: {
          create: {
            userId: req.user.id,
            action: 'criou a tarefa',
            target: title,
            projectId: projectId
          }
        }
      }
    });

    if (assigneeId) {
      await prisma.notification.create({
        data: {
          content: `Uma nova tarefa foi delegada a você: "${title}"`,
          userId: assigneeId,
          taskId: newTask.id,
          projectId: projectId
        }
      });
    }

    await recalcProgress(projectId);

    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

// PUT /api/tasks/:id
exports.update = async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ message: 'Tarefa não encontrada' });

    const canEdit = [ROLES.ADMIN_PLATFORM, ROLES.ADMIN_COMPANY, ROLES.MANAGER_AREA, ROLES.PROJECT_MANAGER].includes(req.user.role)
      || task.assigneeId === req.user.id;
    if (!canEdit) return res.status(403).json({ message: 'Sem permissão para editar esta tarefa' });

    const data = {};
    const fields = ['title', 'description', 'assigneeId', 'status', 'priority', 'dueDate'];
    fields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });

    if (data.dueDate) data.dueDate = new Date(data.dueDate);

    const updatedTask = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...data,
        activities: {
          create: {
            userId: req.user.id,
            action: 'atualizou a tarefa',
            target: data.title || task.title,
            projectId: task.projectId
          }
        }
      }
    });

    if (data.assigneeId && data.assigneeId !== task.assigneeId) {
      await prisma.notification.create({
        data: {
          content: `Uma tarefa foi delegada a você: "${updatedTask.title}"`,
          userId: data.assigneeId,
          taskId: updatedTask.id,
          projectId: updatedTask.projectId
        }
      });
    }

    await recalcProgress(task.projectId);

    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

// PATCH /api/tasks/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ message: 'Tarefa não encontrada' });

    const { status } = req.body;
    const validStatuses = ['a_fazer', 'em_andamento', 'concluido'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Status inválido' });

    const updatedTask = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        status,
        activities: {
          create: {
            userId: req.user.id,
            action: `moveu "${task.title}" para`,
            target: status.replace('_', ' '),
            projectId: task.projectId
          }
        }
      }
    });

    await recalcProgress(task.projectId);

    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
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
