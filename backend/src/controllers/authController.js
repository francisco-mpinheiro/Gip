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
