// ─── PERFORMANCE com RBAC completo ───────────────────────────────────────────
exports.getPerformance = async (req, res) => {
  try {
    const me = req.user;
    let visibleIds = [];
    let visibleProjectIds = null;

    // 1. Definir usuários visíveis conforme o perfil.
    if ([ROLES.ADMIN_PLATFORM, ROLES.ADMIN_COMPANY].includes(me.role)) {
      const users = await prisma.user.findMany({
        where: { active: true },
        select: { id: true }
      });

      visibleIds = users.map(u => u.id);

    } else if (me.role === ROLES.MANAGER_AREA) {
      const dbMe = await prisma.user.findUnique({
        where: { id: me.id },
        select: { department: true }
      });

      const sameDept = await prisma.user.findMany({
        where: {
          active: true,
          department: dbMe?.department ?? null
        },
        select: { id: true }
      });

      visibleIds = [
        ...new Set([me.id, ...sameDept.map(u => u.id)])
      ];

    } else if (me.role === ROLES.PROJECT_MANAGER) {
      const myProjects = await prisma.project.findMany({
        where: {
          OR: [
            { managerId: me.id },
            { members: { some: { id: me.id } } }
          ]
        },
        select: {
          id: true,
          members: {
            select: { id: true }
          }
        }
      });

      visibleProjectIds = myProjects.map(p => p.id);

      const projectMemberIds = myProjects.flatMap(
        p => p.members.map(m => m.id)
      );

      const projectTasks = visibleProjectIds.length > 0
        ? await prisma.task.findMany({
            where: {
              projectId: { in: visibleProjectIds },
              assigneeId: { not: null }
            },
            select: { assigneeId: true }
          })
        : [];

      const projectAssigneeIds = projectTasks
        .map(t => t.assigneeId)
        .filter(Boolean);

      visibleIds = [
        ...new Set([
          me.id,
          ...projectMemberIds,
          ...projectAssigneeIds
        ])
      ];

    } else {
      visibleIds = [me.id];
    }

    // 2. Buscar tarefas dentro do escopo permitido.
    const taskScope = visibleProjectIds !== null
      ? { projectId: { in: visibleProjectIds } }
      : {};

    const visibleUsers = await prisma.user.findMany({
      where: {
        id: { in: visibleIds },
        active: true
      },
      include: {
        tasks: {
          where: taskScope,
          select: {
            status: true,
            dueDate: true,
            completedAt: true
          }
        }
      }
    });

    const now = new Date();

    // 3. Calcular métricas individuais.
    const performance = visibleUsers.map(u => {
      const userTasks = u.tasks;

      const completed = userTasks.filter(
        t => t.status === 'concluido'
      ).length;

      const inProgress = userTasks.filter(
        t => t.status === 'em_andamento'
      ).length;

      const overdue = userTasks.filter(
        t =>
          t.dueDate &&
          new Date(t.dueDate) < now &&
          t.status !== 'concluido'
      ).length;

      // Somente tarefas concluídas com prazo e data de conclusão.
      const completedWithDeadline = userTasks.filter(
        t =>
          t.status === 'concluido' &&
          t.dueDate &&
          t.completedAt
      );

      const onTime = completedWithDeadline.filter(
        t => new Date(t.completedAt) <= new Date(t.dueDate)
      ).length;

      const lateCompleted = completedWithDeadline.filter(
        t => new Date(t.completedAt) > new Date(t.dueDate)
      ).length;

      const punctualityTotal = onTime + lateCompleted;
      const total = userTasks.length;

      const rate = total > 0
        ? Math.round((completed / total) * 100)
        : 0;

      const punctualityRate = punctualityTotal > 0
        ? Math.round((onTime / punctualityTotal) * 100)
        : null;

      return {
        user: {
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          role: u.role,
          department: u.department
        },
        isMe: u.id === me.id,
        totalTasks: total,
        completedTasks: completed,
        inProgressTasks: inProgress,
        overdueTasks: overdue,
        completionRate: rate,
        onTimeTasks: onTime,
        lateCompletedTasks: lateCompleted,
        punctualityTotal,
        punctualityRate
      };
    });

    // 4. Consolidar métricas da equipe.
    const summary = performance.reduce(
      (acc, u) => ({
        totalTasks: acc.totalTasks + u.totalTasks,
        completedTasks: acc.completedTasks + u.completedTasks,
        inProgressTasks: acc.inProgressTasks + u.inProgressTasks,
        overdueTasks: acc.overdueTasks + u.overdueTasks,
        onTimeTasks: acc.onTimeTasks + u.onTimeTasks,
        lateCompletedTasks:
          acc.lateCompletedTasks + u.lateCompletedTasks
      }),
      {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        onTimeTasks: 0,
        lateCompletedTasks: 0
      }
    );

    const punctualityTotal =
      summary.onTimeTasks + summary.lateCompletedTasks;

    summary.completionRate = summary.totalTasks > 0
      ? Math.round(
          (summary.completedTasks / summary.totalTasks) * 100
        )
      : 0;

    summary.punctualityRate = punctualityTotal > 0
      ? Math.round(
          (summary.onTimeTasks / punctualityTotal) * 100
        )
      : null;

    summary.members = performance.length;

    // 5. Identificar o escopo.
    const dbMe = await prisma.user.findUnique({
      where: { id: me.id }
    });

    const scopeLabel = {
      [ROLES.ADMIN_PLATFORM]: 'Visão geral da plataforma',
      [ROLES.ADMIN_COMPANY]: 'Visão geral da empresa',
      [ROLES.MANAGER_AREA]: `Departamento: ${dbMe?.department || 'Geral'}`,
      [ROLES.PROJECT_MANAGER]: 'Membros dos seus projetos',
      [ROLES.EMPLOYEE]: 'Meu desempenho'
    }[me.role] || 'Meu desempenho';

    // 6. Retornar dados.
    res.json({
      scope: scopeLabel,
      canSeeOthers: me.role !== ROLES.EMPLOYEE,
      summary,
      performance: performance.sort((a, b) => {
        if (a.isMe && !b.isMe) return -1;
        if (!a.isMe && b.isMe) return 1;

        return b.completionRate - a.completionRate;
      })
    });

  } catch (err) {
    console.error('Erro ao carregar desempenho:', err);
    res.status(500).json({ message: 'Erro interno' });
  }
};