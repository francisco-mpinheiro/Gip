const { v4: uuidv4 } = require('uuid');
const { db, ROLES } = require('../config/database');

const canManageProject = (user, project) => {
  if ([ROLES.ADMIN_PLATFORM, ROLES.ADMIN_COMPANY, ROLES.MANAGER_AREA].includes(user.role)) return true;
  if (user.role === ROLES.PROJECT_MANAGER && project.managerId === user.id) return true;
  return false;
};

// GET /api/projects
exports.getAll = (req, res) => {
  let projects = db.projects;

  // Employees only see projects they're members of
  if (req.user.role === ROLES.EMPLOYEE) {
    projects = projects.filter(p => p.members.includes(req.user.id));
  } else if (req.user.role === ROLES.PROJECT_MANAGER) {
    projects = projects.filter(p => p.managerId === req.user.id || p.members.includes(req.user.id));
  }

  const enriched = projects.map(p => ({
    ...p,
    memberCount: p.members.length,
    taskCount: db.tasks.filter(t => t.projectId === p.id).length,
    completedTasks: db.tasks.filter(t => t.projectId === p.id && t.status === 'concluido').length,
    manager: db.users.find(u => u.id === p.managerId) ? 
      { id: p.managerId, name: db.users.find(u => u.id === p.managerId).name, avatar: db.users.find(u => u.id === p.managerId).avatar } : null,
  }));

  res.json(enriched);
};

// GET /api/projects/:id
exports.getById = (req, res) => {
  const project = db.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ message: 'Projeto não encontrado' });

  if (req.user.role === ROLES.EMPLOYEE && !project.members.includes(req.user.id)) {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  const tasks = db.tasks.filter(t => t.projectId === project.id).map(t => ({
    ...t,
    assignee: db.users.find(u => u.id === t.assigneeId) ?
      { id: t.assigneeId, name: db.users.find(u => u.id === t.assigneeId).name, avatar: db.users.find(u => u.id === t.assigneeId).avatar } : null,
  }));

  const members = project.members.map(uid => {
    const u = db.users.find(u => u.id === uid);
    return u ? { id: u.id, name: u.name, avatar: u.avatar, role: u.role, department: u.department } : null;
  }).filter(Boolean);

  res.json({ ...project, tasks, members });
};

// POST /api/projects
exports.create = (req, res) => {
  const { name, description, status, priority, startDate, endDate, managerId, members } = req.body;
  if (!name) return res.status(400).json({ message: 'Nome do projeto é obrigatório' });

  const newProject = {
    id: uuidv4(),
    name, description: description || '',
    status: status || 'planejamento',
    priority: priority || 'media',
    progress: 0,
    startDate: startDate ? new Date(startDate) : new Date(),
    endDate: endDate ? new Date(endDate) : null,
    managerId: managerId || req.user.id,
    members: members || [req.user.id],
    createdAt: new Date(),
    createdBy: req.user.id,
  };

  db.projects.push(newProject);
  db.activities.unshift({
    id: uuidv4(), userId: req.user.id, action: 'criou o projeto',
    target: name, projectId: newProject.id, createdAt: new Date(),
  });
  res.status(201).json(newProject);
};

// PUT /api/projects/:id
exports.update = (req, res) => {
  const project = db.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ message: 'Projeto não encontrado' });
  if (!canManageProject(req.user, project)) return res.status(403).json({ message: 'Sem permissão para editar este projeto' });

  const fields = ['name', 'description', 'status', 'priority', 'progress', 'startDate', 'endDate', 'managerId', 'members'];
  fields.forEach(f => { if (req.body[f] !== undefined) project[f] = req.body[f]; });

  db.activities.unshift({
    id: uuidv4(), userId: req.user.id, action: 'atualizou o projeto',
    target: project.name, projectId: project.id, createdAt: new Date(),
  });
  res.json(project);
};

// DELETE /api/projects/:id
exports.delete = (req, res) => {
  const idx = db.projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Projeto não encontrado' });
  if (!canManageProject(req.user, db.projects[idx])) return res.status(403).json({ message: 'Sem permissão' });

  db.tasks = db.tasks.filter(t => t.projectId !== req.params.id);
  db.projects.splice(idx, 1);
  res.json({ message: 'Projeto removido com sucesso' });
};
