const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/prisma');
const crypto = require('crypto');

const profileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  department: z.string().optional(),
  avatar: z.string().optional(),
  avatarRemoved: z.coerce.boolean().optional(),
});

exports.getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    const { password, ...safe } = user;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Dados inválidos', errors: parsed.error.errors });

    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!currentUser) return res.status(404).json({ message: 'Usuário não encontrado' });

    const data = {};
    if (parsed.data.name) {
      data.name = parsed.data.name;
      if (!currentUser.avatar || !currentUser.avatar.startsWith('/uploads/')) {
        data.avatar = parsed.data.name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
      }
    }

    if (parsed.data.department !== undefined) data.department = parsed.data.department;

    if (req.file) {
      data.avatar = `/uploads/${req.file.filename}`;
    }

    if (parsed.data.avatarRemoved === true) {
      data.avatar = null;
    }

    if (parsed.data.avatar && !req.file && parsed.data.avatar !== currentUser.avatar) {
      data.avatar = parsed.data.avatar;
    }

    if (parsed.data.email && parsed.data.email !== req.user.email) {
      data.email = parsed.data.email;
      const token = crypto.randomBytes(20).toString('hex');
      data.emailToken = token;
      data.emailTokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24);
      const host = process.env.FRONTEND_URL || 'http://localhost:3000';
      const confirmLink = `${host}/confirm-email?token=${token}`;
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: (process.env.SMTP_SECURE === 'true'),
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          });
          const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
          transporter.sendMail({
            from,
            to: parsed.data.email,
            subject: 'Confirmação de email - GIP',
            html: `<p>Olá,</p><p>Por favor confirme seu email clicando no link abaixo:</p><p><a href="${confirmLink}">${confirmLink}</a></p>`
          }).catch(err => console.error('Erro enviando confirmação:', err));
        } catch (e) {
          if (process.env.NODE_ENV === 'development') console.log(`[DEV] Link de confirmação de email para ${parsed.data.email}: ${confirmLink}`);
        }
      } else {
        if (process.env.NODE_ENV === 'development') console.log(`[DEV] Link de confirmação de email para ${parsed.data.email}: ${confirmLink}`);
      }
    }

    delete parsed.data.role;

    const updatedUser = await prisma.user.update({ where: { id: req.user.id }, data });
    const { password, ...safe } = updatedUser;
    res.json(safe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno' });
  }
};

const passwordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

exports.changePassword = async (req, res) => {
  try {
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Dados inválidos', errors: parsed.error.errors });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

    const match = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Senha atual incorreta' });

    const hashed = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno' });
  }
};
