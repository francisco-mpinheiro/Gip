const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { ROLES } = require('../config/database');
const prisma = require('../config/prisma');

const generateToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sanitizeUser = (user) => {
  const { password, ...safe } = user;
  return safe;
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email é obrigatório' });
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return res.status(200).json({ message: 'Se o email existir, um link será enviado' }); // don't reveal

    const token = require('crypto').randomBytes(20).toString('hex');
    const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1h

    await prisma.user.update({ where: { id: user.id }, data: { resetToken: token, resetTokenExpiry: expiry } });

    const host = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${host}/reset-password?token=${token}`;

    // If SMTP configured, try to send real email
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
        await transporter.sendMail({
          from,
          to: email,
          subject: 'Redefinição de senha - GIP',
          html: `<p>Olá,</p><p>Recebemos uma solicitação para redefinir sua senha. Clique no link abaixo para prosseguir:</p><p><a href="${resetLink}">${resetLink}</a></p><p>Se você não solicitou, ignore este e-mail.</p>`
        });
      } catch (sendErr) {
        console.error('Falha ao enviar e-mail SMTP:', sendErr);
        // fallback to logging in dev
        if (process.env.NODE_ENV === 'development') console.log(`[DEV] Link de reset de senha para ${email}: ${resetLink}`);
      }
    } else {
      if (process.env.NODE_ENV === 'development') console.log(`[DEV] Link de reset de senha para ${email}: ${resetLink}`);
    }

    res.json({ message: 'Se o email existir, um link será enviado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno' });
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'Token e nova senha são obrigatórios' });

    const user = await prisma.user.findFirst({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return res.status(400).json({ message: 'Token inválido ou expirado' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed, resetToken: null, resetTokenExpiry: null } });
    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { cpf: email }]
      }
    });

    if (!user) return res.status(401).json({ message: 'Credenciais inválidas' });
    if (!user.active) return res.status(401).json({ message: 'Usuário desativado. Contate o administrador.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Credenciais inválidas' });

    const token = generateToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, cpf, password, role, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios' });
    }

    const exists = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { cpf: cpf || '' }]
      }
    });

    if (exists) return res.status(400).json({ message: 'Email ou CPF já cadastrado' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        cpf: cpf || '',
        password: hashedPassword,
        role: role || ROLES.EMPLOYEE,
        department: department || 'Geral',
        avatar: initials,
        active: true,
      }
    });

    const token = generateToken(newUser);
    res.status(201).json({ token, user: sanitizeUser(newUser) });
  } catch (err) {
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// GET /api/auth/me
exports.me = (req, res) => {
  res.json(sanitizeUser(req.user));
};
