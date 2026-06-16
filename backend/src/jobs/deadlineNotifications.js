const cron = require('node-cron');
const prisma = require('../config/prisma');

async function runDeadlineCheck() {
  console.log('Running daily deadline check...');
  try {
    const tasks = await prisma.task.findMany({
      where: {
        dueDate: { not: null },
        status: { not: 'concluida' },
        assigneeId: { not: null },
      },
      include: {
        assignee: true,
        project: true,
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const task of tasks) {
      // Garantir que a data UTC não perca dias ao converter para o fuso local
      const dueDateStr = task.dueDate.toISOString().split('T')[0];
      const [y, m, d] = dueDateStr.split('-');
      const dueDate = new Date(y, m - 1, d);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 2) {
          // Faltam 2 dias
          await createNotification(
            task.assigneeId,
            `O prazo da tarefa "${task.title}" se encerra em 2 dias.`,
            task.id,
            task.projectId
          );
        } else if (diffDays === 1) {
          // Falta 1 dia
          await createNotification(
            task.assigneeId,
            `O prazo da tarefa "${task.title}" se encerra amanhã!`,
            task.id,
            task.projectId
          );
        } else if (diffDays === 0) {
          // Encerra hoje
          await createNotification(
            task.assigneeId,
            `Atenção: O prazo da tarefa "${task.title}" se encerra HOJE!`,
            task.id,
            task.projectId
          );
        }
    }
  } catch (err) {
    console.error('Error in deadline cron job:', err);
  }
}

function initCronJobs() {
  // Executar todos os dias às 08:00
  cron.schedule('0 8 * * *', runDeadlineCheck);
}

async function createNotification(userId, content, taskId, projectId) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        content,
        taskId,
        projectId
      }
    });
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}

module.exports = { initCronJobs, runDeadlineCheck };


