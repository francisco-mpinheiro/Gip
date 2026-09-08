const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('./config/prisma');

let io;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: '*', // Adjust to specific frontend URL in production
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log(`User connected to socket: ${socket.user.id}`);
    
    // Join a personal room to receive private messages
    socket.join(socket.user.id);

    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content } = data;
        
        // Save to database
        let message;
        if (prisma.message) {
          message = await prisma.message.create({
            data: {
              content,
              senderId: socket.user.id,
              receiverId
            }
          });
        } else {
          const id = require('crypto').randomUUID();
          await prisma.$executeRaw`
            INSERT INTO messages (id, content, "senderId", "receiverId", "createdAt", "isRead") 
            VALUES (${id}, ${content}, ${socket.user.id}, ${receiverId}, NOW(), false)
          `;
          const rawResult = await prisma.$queryRaw`SELECT * FROM messages WHERE id = ${id}`;
          message = rawResult[0];
        }

        // Emit to receiver's room
        io.to(receiverId).emit('receive_message', message);
        
        // Also emit back to sender to confirm and update UI
        socket.emit('message_sent', message);

      } catch (err) {
        console.error('Socket send_message error:', err);
        socket.emit('error', 'Erro ao enviar mensagem');
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected from socket: ${socket.user.id}`);
    });
  });
};

const getIo = () => io;

module.exports = { initSocket, getIo };
