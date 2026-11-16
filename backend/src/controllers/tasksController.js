// POST /api/tasks/:id/attachments
exports.addAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Nenhum arquivo enviado'
      });
    }

    // Verificar se a tarefa existe antes de cadastrar o anexo.
    const task = await prisma.task.findUnique({
      where: { id: req.params.id }
    });

    if (!task) {
      return res.status(404).json({
        message: 'Tarefa não encontrada'
      });
    }

    const newAttachment = await prisma.taskAttachment.create({
      data: {
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        taskId: req.params.id,
        userId: req.user.id
      }
    });

    res.status(201).json(newAttachment);
  } catch (err) {
    console.error('Erro ao adicionar anexo:', err);
    res.status(500).json({
      message: 'Erro interno ao adicionar anexo'
    });
  }
};