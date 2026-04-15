const { v4: uuidv4 } = require('uuid');
const { db, ROLES } = require('../config/database');

const recalcProgress = (projectId) => {
  const project = db.projects.find(p => p.id === projectId);
  if (!project) return;
  const tasks = db.tasks.filter(t => t.projectId === projectId);
  if (tasks.length === 0) { project.progress = 0; return; }
  const done = tasks.filter(t => t.status === 'concluido').length;
  project.progress = Math.round((done / tasks.length) * 100);
};

// GET /api/tasks
exports.getAll = (req, res) => {
  const { projectId, assigneeId, status, priority } = req.query;
  let tasks = db.tasks;

  if (req.user.role === ROLES.EMPLOYEE) {
    const myProjects = db.projects.filter(p => p.members.includes(req.user.id)).map(p => p.id);
    tasks = tasks.filter(t => myProjects.includes(t.projectId) || t.assigneeId === req.user.id);
  }

  if (projectId) tasks = tasks.filter(t => t.projectId === projectId);
  if (assigneeId) tasks = tasks.filter(t => t.assigneeId === assigneeId);
  if (status) tasks = tasks.filter(t => t.status === status);
  if (priority) tasks = tasks.filter(t => t.priority === priority);

  const enriched = tasks.map(t => ({
    ...t,
    assignee: db.users.find(u => u.id === t.assigneeId) ?
      { id: t.assigneeId, name: db.users.find(u => u.id === t.assigneeId).name, avatar: db.users.find(u => u.id === t.assigneeId).avatar } : null,
    project: db.projects.find(p => p.id === t.projectId) ?
      { id: t.projectId, name: db.projects.find(p => p.id === t.projectId).name } : null,
    overdue: t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'concluido',
  }));

  res.json(enriched);
};

// GET /api/tasks/:id
exports.getById = (req, res) => {
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ message: 'Tarefa não encontrada' });
  res.json(task);
};

// POST /api/tasks
exports.create = (req, res) => {
  const { title, description, projectId, assigneeId, status, priority, dueDate } = req.body;
  if (!title || !projectId) return res.status(400).json({ message: 'Título e projeto são obrigatórios' });

  const project = db.projects.find(p => p.id === projectId);
  if (!project) return res.status(404).json({ message: 'Projeto não encontrado' });

  const newTask = {
    id: uuidv4(),
    title, description: description || '',
    projectId, assigneeId: assigneeId || null,
    status: status || 'a_fazer',
    priority: priority || 'media',
    dueDate: dueDate ? new Date(dueDate) : null,
    createdAt: new Date(),
    createdBy: req.user.id,
  };

  db.tasks.push(newTask);
  recalcProgress(projectId);

  db.activities.unshift({
    id: uuidv4(), userId: req.user.id, action: 'criou a tarefa',
    target: title, projectId, createdAt: new Date(),
  });

  res.status(201).json(newTask);
};

// PUT /api/tasks/:id
exports.update = (req, res) => {
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ message: 'Tarefa não encontrada' });

  const canEdit = [ROLES.ADMIN_PLATFORM, ROLES.ADMIN_COMPANY, ROLES.MANAGER_AREA, ROLES.PROJECT_MANAGER].includes(req.user.role)
    || task.assigneeId === req.user.id;
  if (!canEdit) return res.status(403).json({ message: 'Sem permissão para editar esta tarefa' });

  const fields = ['title', 'description', 'assigneeId', 'status', 'priority', 'dueDate'];
  fields.forEach(f => { if (req.body[f] !== undefined) task[f] = req.body[f]; });

  recalcProgress(task.projectId);

  db.activities.unshift({
    id: uuidv4(), userId: req.user.id, action: 'atualizou a tarefa',
    target: task.title, projectId: task.projectId, createdAt: new Date(),
  });

  res.json(task);
};

// PATCH /api/tasks/:id/status
exports.updateStatus = (req, res) => {
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ message: 'Tarefa não encontrada' });

  const { status } = req.body;
  const validStatuses = ['a_fazer', 'em_andamento', 'concluido'];
  if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Status inválido' });

  task.status = status;
  recalcProgress(task.projectId);

  db.activities.unshift({
    id: uuidv4(), userId: req.user.id, action: `moveu "${task.title}" para`,
    target: status.replace('_', ' '), projectId: task.projectId, createdAt: new Date(),
  });

  res.json(task);
};

// DELETE /api/tasks/:id
exports.delete = (req, res) => {
  const idx = db.tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Tarefa não encontrada' });

  const projectId = db.tasks[idx].projectId;
  db.tasks.splice(idx, 1);
  recalcProgress(projectId);
  res.json({ message: 'Tarefa removida com sucesso' });
};
