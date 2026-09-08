const prisma = require('../config/prisma');

exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.userId;

    let messages = [];
    if (prisma.message) {
      messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId }
          ]
        },
        orderBy: { createdAt: 'asc' }
      });
    } else {
      messages = await prisma.$queryRaw`
        SELECT * FROM messages 
        WHERE ("senderId" = ${userId} AND "receiverId" = ${otherUserId})
           OR ("senderId" = ${otherUserId} AND "receiverId" = ${userId})
        ORDER BY "createdAt" ASC
      `;
    }

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno' });
  }
};
