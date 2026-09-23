const prisma = require('../config/prisma');
const { ROLES } = require('../config/database');

exports.search = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();

    if (!q) {
      return res.json([]);
    }

    const textFilter = {
      contains: q,
      mode: 'insensitive',
    };

    let projectAccess = {};
    let taskAccess = {};
    let memberAccess = {};

    if (req.user.role === ROLES.EMPLOYEE) {
      projectAccess = {
        members: {
          some: {
            id: req.user.id,
          },
        },
      };

      taskAccess = {
        OR: [
          {
            assigneeId: req.user.id,
          },
          {
            project: {
              members: {
                some: {
                  id: req.user.id,
                },
              },
            },
          },
        ],
      };

      memberAccess = {
        active: true,
      };
    }

    if (req.user.role === ROLES.PROJECT_MANAGER) {
      projectAccess = {
        OR: [
          {
            managerId: req.user.id,
          },
          {
            members: {
              some: {
                id: req.user.id,
              },
            },
          },
        ],
      };

      taskAccess = {
        OR: [
          {
            project: {
              managerId: req.user.id,
            },
          },
          {
            project: {
              members: {
                some: {
                  id: req.user.id,
                },
              },
            },
          },
        ],
      };
    }

    const [projects, tasks, members] = await Promise.all([
      prisma.project.findMany({
        where: {
          ...projectAccess,
          name: textFilter,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
        take: 5,
      }),

      prisma.task.findMany({
        where: {
          ...taskAccess,
          title: textFilter,
        },
        select: {
          id: true,
          title: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          title: 'asc',
        },
        take: 5,
      }),

      prisma.user.findMany({
        where: {
          ...memberAccess,
          name: textFilter,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
        take: 5,
      }),
    ]);

    const results = [
      ...projects.map((project) => ({
        type: 'project',
        typeLabel: 'Projeto',
        id: project.id,
        name: project.name,
        url: `/projects/${project.id}`,
      })),

      ...tasks.map((task) => ({
        type: 'task',
        typeLabel: 'Tarefa',
        id: task.id,
        name: task.title,
        meta: task.project?.name || '',
        url: `/tasks?taskId=${task.id}`,
      })),

      ...members.map((member) => ({
        type: 'member',
        typeLabel: 'Membro',
        id: member.id,
        name: member.name,
        url: '/team',
      })),
    ];

    return res.json(results);
  } catch (error) {
    console.error('Erro na busca global:', error);

    return res.status(500).json({
      message: 'Erro ao realizar busca',
    });
  }
};