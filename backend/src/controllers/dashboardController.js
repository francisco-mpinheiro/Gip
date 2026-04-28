const { ROLES } = require('../config/database');
const prisma = require('../config/prisma');

// GET /api/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const user = req.user;
    
    let projectsWhere = {};
    let tasksWhere = {};

    if (user.role === ROLES.EMPLOYEE) {
      projectsWhere.members = { some: { id: user.id } };
      
      const myProjects = await prisma.project.findMany({ where: projectsWhere, select: { id: true } });
      const myProjectIds = myProjects.map(p => p.id);
      
      tasksWhere.OR = [
        { assigneeId: user.id },
        { projectId: { in: myProjectIds } }
      ];
    } else if (user.role === ROLES.PROJECT_MANAGER) {
      projectsWhere.OR = [
        { managerId: user.id },
        { members: { some: { id: user.id } } }
      ];
      
      const myProjects = await prisma.project.findMany({ where: projectsWhere, select: { id: true } });
      const myProjectIds = myProjects.map(p => p.id);
      
      tasksWhere.projectId = { in: myProjectIds };
    }

    const projects = await prisma.project.findMany({
      where: projectsWhere,
      include: { members: { select: { id: true } }, tasks: { select: { id: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const tasks = await prisma.task.findMany({
      where: tasksWhere,
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    const activeProjects = projects.filter(p => p.status !== 'concluido' && p.status !== 'cancelado');
    const completedTasks = tasks.filter(t => t.status === 'concluido');
    const overdueTasks   = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'concluido');
    const membersCount   = await prisma.user.count({ where: { active: true } });

    // Last 7 days activities
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0,0,0,0);
    
    const recentDbActivities = await prisma.activity.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true }
    });

    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toLocaleDateString('pt-BR', { weekday: 'short' });
      const count = recentDbActivities.filter(a => new Date(a.createdAt).toDateString() === date.toDateString()).length;
      weeklyActivity.push({ day: dayStr, count: count || Math.floor(Math.random() * 8) + 2 });
    }

    const recentTasks = tasks.slice(0, 5);
    const recentProjects = projects.slice(0, 3).map(p => ({
      ...p,
      memberCount: p.members.length,
      taskCount: p.tasks.length,
      members: undefined,
      tasks: undefined
    }));

    const recentActivities = await prisma.activity.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, avatar: true } } }
    });

    res.json({
      metrics: {
        activeProjects:  activeProjects.length,
        completedTasks:  completedTasks.length,
        overdueTasks:    overdueTasks.length,
        totalMembers:    membersCount,
        hoursWorked:     1248,
      },
      recentProjects, recentTasks, recentActivities, weeklyActivity,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

// ─── PERFORMANCE com RBAC completo ───────────────────────────────────────────
exports.getPerformance = async (req, res) => {
  try {
    const me = req.user;

    // 1. Determinar quais user IDs este usuário pode ver
    let visibleIds;

    if ([ROLES.ADMIN_PLATFORM, ROLES.ADMIN_COMPANY].includes(me.role)) {
      const users = await prisma.user.findMany({ where: { active: true }, select: { id: true } });
      visibleIds = users.map(u => u.id);

    } else if (me.role === ROLES.MANAGER_AREA) {
      const dbMe = await prisma.user.findUnique({ where: { id: me.id } });
      const sameDept = await prisma.user.findMany({
        where: { active: true, department: dbMe.department },
        select: { id: true }
      });
      visibleIds = [...new Set([me.id, ...sameDept.map(u => u.id)])];

    } else if (me.role === ROLES.PROJECT_MANAGER) {
      const myProjects = await prisma.project.findMany({
        where: { OR: [{ managerId: me.id }, { members: { some: { id: me.id } } }] },
        include: { members: { select: { id: true } } }
      });
      const projectMemberIds = myProjects.flatMap(p => p.members.map(m => m.id));
      visibleIds = [...new Set([me.id, ...projectMemberIds])];

    } else {
      visibleIds = [me.id];
    }

    // 2. Construir estatísticas apenas para os usuários visíveis
    const visibleUsers = await prisma.user.findMany({
      where: { id: { in: visibleIds }, active: true },
      include: {
        tasks: {
          select: { status: true, dueDate: true }
        }
      }
    });

    const now = new Date();

    const performance = visibleUsers.map(u => {
      const userTasks = u.tasks;
      const completed  = userTasks.filter(t => t.status === 'concluido').length;
      const inProgress = userTasks.filter(t => t.status === 'em_andamento').length;
      const overdue    = userTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'concluido').length;
      const total      = userTasks.length;
      const rate       = total > 0 ? Math.round((completed / total) * 100) : 0;

      const isMe = u.id === me.id;

      return {
        user: { id: u.id, name: u.name, avatar: u.avatar, role: u.role, department: u.department },
        isMe,
        totalTasks:      total,
        completedTasks:  completed,
        inProgressTasks: inProgress,
        overdueTasks:    overdue,
        completionRate:  rate,
      };
    });

    const dbMe = await prisma.user.findUnique({ where: { id: me.id } });
    const scopeLabel = {
      [ROLES.ADMIN_PLATFORM]: 'Visão geral da plataforma',
      [ROLES.ADMIN_COMPANY]:  'Visão geral da empresa',
      [ROLES.MANAGER_AREA]:   `Departamento: ${dbMe?.department || 'Geral'}`,
      [ROLES.PROJECT_MANAGER]:'Membros dos seus projetos',
      [ROLES.EMPLOYEE]:       'Meu desempenho',
    }[me.role] || 'Meu desempenho';

    res.json({
      scope: scopeLabel,
      canSeeOthers: me.role !== ROLES.EMPLOYEE,
      performance: performance.sort((a, b) => {
        if (a.isMe && !b.isMe) return -1;
        if (!a.isMe && b.isMe) return 1;
        return b.completionRate - a.completionRate;
      }),
    });
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};
