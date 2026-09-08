const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const prisma = require('../config/prisma');

const educationSchema = z.object({
  institution: z.string().min(2),
  degree: z.string().min(2),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

exports.list = async (req, res) => {
  try {
    const items = await prisma.education.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

exports.create = async (req, res) => {
  try {
    const parsed = educationSchema.safeParse(req.body);
    if (!parsed.success) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Dados inválidos', errors: parsed.error.errors });
    }

    if (!req.file) return res.status(400).json({ message: 'Arquivo do certificado é obrigatório' });

    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Formato de arquivo inválido' });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Arquivo muito grande (máx 5MB)' });
    }

    const fileUrl = `/uploads/${path.basename(req.file.path)}`;

    const education = await prisma.education.create({ data: {
      userId: req.user.id,
      institution: parsed.data.institution,
      degree: parsed.data.degree,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      certificateUrl: fileUrl,
    }});

    res.status(201).json(education);
  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Erro interno' });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = req.params.id;
    const record = await prisma.education.findUnique({ where: { id } });
    if (!record) return res.status(404).json({ message: 'Formação não encontrada' });
    if (record.userId !== req.user.id) return res.status(403).json({ message: 'Não autorizado' });

    await prisma.education.delete({ where: { id } });

    if (record.certificateUrl) {
      const filePath = path.join(__dirname, '../../', record.certificateUrl.replace(/^(\/+)/, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.json({ message: 'Formação removida' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno' });
  }
};
