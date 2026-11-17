const prisma = require('../config/prisma');

exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.userId;

    const messages = await prisma.message.findMany({
      where: { OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ] },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
    });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno' });
  }
};
