const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/database');
const prisma = require('../config/prisma');

const sanitizeUser = (user) => { const { password, ...safe } = user; return safe; };

// GET /api/users
exports.getAll = async (req, res) => {
  try {
    const { role, department, active } = req.query;
    
    let where = {};
    
    // Employees can only see active members
    if (req.user.role === ROLES.EMPLOYEE) {
      where.active = true;
    }
    
    if (role) where.role = role;
    if (department) where.department = department;
    if (active !== undefined) where.active = (active === 'true');

    const users = await prisma.user.findMany({ where });
    res.json(users.map(sanitizeUser));
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

// GET /api/users/:id
exports.getById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json(sanitizeUser(user));
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

// POST /api/users
exports.create = async (req, res) => {
  try {
    const { name, email, cpf, password, role, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios' });
    }

    const exists = await prisma.user.findFirst({ where: { email } });
    if (exists) return res.status(400).json({ message: 'Email já cadastrado' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    const newUser = await prisma.user.create({
      data: {
        name, email,
        cpf: cpf || '',
        password: hashedPassword,
        role: role || ROLES.EMPLOYEE,
        department: department || 'Geral',
        avatar: initials,
        active: true,
      }
    });

    res.status(201).json(sanitizeUser(newUser));
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

// PUT /api/users/:id
exports.update = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

    const { name, email, role, department, password } = req.body;
    const data = {};

    if (name) { 
      data.name = name; 
      data.avatar = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(); 
    }
    if (email) data.email = email;
    if (role) data.role = role;
    if (department) data.department = department;
    if (password) data.password = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data
    });

    res.json(sanitizeUser(updatedUser));
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

// PATCH /api/users/:id/toggle
exports.toggleActive = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    if (user.id === req.user.id) return res.status(400).json({ message: 'Não é possível desativar sua própria conta' });

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: { active: !user.active }
    });

    res.json(sanitizeUser(updatedUser));
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

// DELETE /api/users/:id
exports.delete = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    if (user.id === req.user.id) return res.status(400).json({ message: 'Não é possível excluir sua própria conta' });

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'Usuário removido com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};
