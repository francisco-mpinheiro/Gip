const { v4: uuidv4 } = require('uuid');
const { ROLES } = require('../config/database');
const prisma = require('../config/prisma');

const canManageProject = (user, project) => {
  if ([ROLES.ADMIN_PLATFORM, ROLES.ADMIN_COMPANY, ROLES.MANAGER_AREA].includes(user.role)) return true;
  if (user.role === ROLES.PROJECT_MANAGER && project.managerId === user.id) return true;
  return false;
};

// GET /api/projects
exports.getAll = async (req, res) => {
  try {
    let where = {};

    if (req.user.role === ROLES.EMPLOYEE) {
      where.members = { some: { id: req.user.id } };
    } else if (req.user.role === ROLES.PROJECT_MANAGER) {
      where.OR = [
        { managerId: req.user.id },
        { members: { some: { id: req.user.id } } }
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        manager: { select: { id: true, name: true, avatar: true } },
        members: { select: { id: true } },
        tasks: { select: { status: true } }
      }
    });

    const enriched = projects.map(p => ({
      ...p,
      memberCount: p.members.length,
      taskCount: p.tasks.length,
      completedTasks: p.tasks.filter(t => t.status === 'concluido').length,
      members: p.members.map(m => m.id), // Interface original pedia array de strings
      tasks: undefined // Remove do output se a interface original não tinha
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

// GET /api/projects/:id
exports.getById = async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        members: { select: { id: true, name: true, avatar: true, role: true, department: true } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, avatar: true } }
          }
        }
      }
    });

    if (!project) return res.status(404).json({ message: 'Projeto não encontrado' });

    if (req.user.role === ROLES.EMPLOYEE && !project.members.find(m => m.id === req.user.id)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Adapt members to array of strings for consistency in the project object itself
    // and include 'members' array of objects as requested by interface
    const membersData = project.members;
    const projectData = {
      ...project,
      members: membersData.map(m => m.id),
      tasks: project.tasks
    };

    res.json({ ...projectData, members: membersData });
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

// POST /api/projects
exports.create = async (req, res) => {
  try {
    const { name, description, status, priority, startDate, endDate, managerId, members } = req.body;
    if (!name) return res.status(400).json({ message: 'Nome do projeto é obrigatório' });

    const manager = managerId || req.user.id;
    const projectMembers = members || [req.user.id];

    const newProject = await prisma.project.create({
      data: {
        name,
        description: description || '',
        status: status || 'planejamento',
        priority: priority || 'media',
        progress: 0,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        manager: { connect: { id: manager } },
        members: { connect: projectMembers.map(id => ({ id })) },
        activities: {
          create: {
            userId: req.user.id,
            action: 'criou o projeto',
            target: name,
          }
        }
      },
      include: {
        members: { select: { id: true } }
      }
    });

    const projectData = { ...newProject, members: newProject.members.map(m => m.id) };
    res.status(201).json(projectData);
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

// PUT /api/projects/:id
exports.update = async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ message: 'Projeto não encontrado' });
    if (!canManageProject(req.user, project)) return res.status(403).json({ message: 'Sem permissão para editar este projeto' });

    const data = {};
    const fields = ['name', 'description', 'status', 'priority', 'progress', 'startDate', 'endDate', 'managerId'];
    fields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });

    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    if (req.body.members) {
      data.members = { set: req.body.members.map(id => ({ id })) };
    }

    const updatedProject = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...data,
        activities: {
          create: {
            userId: req.user.id,
            action: 'atualizou o projeto',
            target: data.name || project.name,
          }
        }
      },
      include: {
        members: { select: { id: true } }
      }
    });

    res.json({ ...updatedProject, members: updatedProject.members.map(m => m.id) });
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

// DELETE /api/projects/:id
exports.delete = async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ message: 'Projeto não encontrado' });
    if (!canManageProject(req.user, project)) return res.status(403).json({ message: 'Sem permissão' });

    // Prisma handles deleting activities and tasks if there is a Cascade delete. 
    // Since we didn't specify cascade delete, we must delete tasks and activities manually.
    await prisma.activity.deleteMany({ where: { projectId: req.params.id } });
    // Note: Tasks also have activities, so we need to delete task activities first
    const tasks = await prisma.task.findMany({ where: { projectId: req.params.id } });
    const taskIds = tasks.map(t => t.id);
    await prisma.activity.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.task.deleteMany({ where: { projectId: req.params.id } });
    
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Projeto removido com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};
