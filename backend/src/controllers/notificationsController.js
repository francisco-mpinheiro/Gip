const prisma = require('../config/prisma');

// GET /api/notifications
exports.getAll = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } }
      }
    });
    res.json(notifications);
  } catch (err) {
    console.error('Failed to get notifications', err);
    res.status(500).json({ message: 'Erro interno' });
  }
};

// PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id }
    });

    if (!notification) return res.status(404).json({ message: 'Notificação não encontrada' });
    if (notification.userId !== req.user.id) return res.status(403).json({ message: 'Sem permissão' });

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });

    res.json(updated);
  } catch (err) {
    console.error('Failed to mark notification as read', err);
    res.status(500).json({ message: 'Erro interno' });
  }
};

// PATCH /api/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });

    res.json({ message: 'Todas as notificações marcadas como lidas' });
  } catch (err) {
    console.error('Failed to mark all notifications as read', err);
    res.status(500).json({ message: 'Erro interno' });
  }
};
