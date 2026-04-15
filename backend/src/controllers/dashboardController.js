const { db, ROLES } = require('../config/database');

// GET /api/dashboard
exports.getDashboard = (req, res) => {
  const user = req.user;
  let projects = db.projects;
  let tasks = db.tasks;

  if (user.role === ROLES.EMPLOYEE) {
    projects = projects.filter(p => p.members.includes(user.id));
    tasks = tasks.filter(t => t.assigneeId === user.id || projects.map(p => p.id).includes(t.projectId));
  } else if (user.role === ROLES.PROJECT_MANAGER) {
    projects = projects.filter(p => p.managerId === user.id || p.members.includes(user.id));
    tasks = tasks.filter(t => projects.map(p => p.id).includes(t.projectId));
  }

  const now = new Date();
  const activeProjects = projects.filter(p => p.status !== 'concluido' && p.status !== 'cancelado');
  const completedTasks = tasks.filter(t => t.status === 'concluido');
  const overdueTasks   = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'concluido');
  const members        = db.users.filter(u => u.active);

  const weeklyActivity = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayStr = date.toLocaleDateString('pt-BR', { weekday: 'short' });
    const count = db.activities.filter(a => new Date(a.createdAt).toDateString() === date.toDateString()).length;
    weeklyActivity.push({ day: dayStr, count: count || Math.floor(Math.random() * 8) + 2 });
  }

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map(t => ({
      ...t,
      assignee: (() => { const u = db.users.find(u => u.id === t.assigneeId); return u ? { id: u.id, name: u.name, avatar: u.avatar } : null; })(),
      project:  (() => { const p = db.projects.find(p => p.id === t.projectId); return p ? { id: p.id, name: p.name } : null; })(),
    }));

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3)
    .map(p => ({ ...p, memberCount: p.members.length, taskCount: tasks.filter(t => t.projectId === p.id).length }));

  const recentActivities = [...db.activities]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map(a => ({
      ...a,
      user: (() => { const u = db.users.find(u => u.id === a.userId); return u ? { id: u.id, name: u.name, avatar: u.avatar } : null; })(),
    }));

  res.json({
    metrics: {
      activeProjects:  activeProjects.length,
      completedTasks:  completedTasks.length,
      overdueTasks:    overdueTasks.length,
      totalMembers:    members.length,
      hoursWorked:     1248,
    },
    recentProjects, recentTasks, recentActivities, weeklyActivity,
  });
};

// ─── PERFORMANCE com RBAC completo ───────────────────────────────────────────
// admin_platform / admin_company → vê todos
// manager_area                   → vê a si mesmo + usuários do mesmo department
// project_manager                → vê a si mesmo + membros dos seus projetos
// employee                       → vê APENAS a si mesmo
// ─────────────────────────────────────────────────────────────────────────────
exports.getPerformance = (req, res) => {
  const me = req.user;

  // 1. Determinar quais user IDs este usuário pode ver
  let visibleIds;

  if ([ROLES.ADMIN_PLATFORM, ROLES.ADMIN_COMPANY].includes(me.role)) {
    // Admin vê todos os usuários ativos
    visibleIds = db.users.filter(u => u.active).map(u => u.id);

  } else if (me.role === ROLES.MANAGER_AREA) {
    // Gestor vê a si mesmo + colegas do mesmo departamento
    const sameDept = db.users
      .filter(u => u.active && u.department === me.department)
      .map(u => u.id);
    visibleIds = [...new Set([me.id, ...sameDept])];

  } else if (me.role === ROLES.PROJECT_MANAGER) {
    // Gerente vê a si mesmo + membros dos projetos que gerencia
    const myProjects = db.projects.filter(p => p.managerId === me.id || p.members.includes(me.id));
    const projectMemberIds = myProjects.flatMap(p => p.members);
    visibleIds = [...new Set([me.id, ...projectMemberIds])];

  } else {
    // employee: vê apenas a si mesmo
    visibleIds = [me.id];
  }

  // 2. Construir estatísticas apenas para os usuários visíveis
  const visibleUsers = db.users.filter(u => visibleIds.includes(u.id) && u.active);

  const performance = visibleUsers.map(u => {
    const userTasks = db.tasks.filter(t => t.assigneeId === u.id);
    const completed  = userTasks.filter(t => t.status === 'concluido').length;
    const inProgress = userTasks.filter(t => t.status === 'em_andamento').length;
    const overdue    = userTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'concluido').length;
    const total      = userTasks.length;
    const rate       = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Sinaliza se é o próprio usuário logado
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

  // 3. Metadados para o frontend saber o contexto de visibilidade
  const scopeLabel = {
    [ROLES.ADMIN_PLATFORM]: 'Visão geral da plataforma',
    [ROLES.ADMIN_COMPANY]:  'Visão geral da empresa',
    [ROLES.MANAGER_AREA]:   `Departamento: ${me.department}`,
    [ROLES.PROJECT_MANAGER]:'Membros dos seus projetos',
    [ROLES.EMPLOYEE]:       'Meu desempenho',
  }[me.role] || 'Meu desempenho';

  res.json({
    scope: scopeLabel,
    canSeeOthers: me.role !== ROLES.EMPLOYEE,
    performance: performance.sort((a, b) => {
      // O próprio usuário sempre aparece primeiro para employee e project_manager
      if (a.isMe && !b.isMe) return -1;
      if (!a.isMe && b.isMe) return 1;
      return b.completionRate - a.completionRate;
    }),
  });
};
