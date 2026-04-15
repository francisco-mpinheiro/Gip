const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db, ROLES } = require('../config/database');

const sanitizeUser = (user) => { const { password, ...safe } = user; return safe; };

// GET /api/users
exports.getAll = (req, res) => {
  const { role, department, active } = req.query;
  let users = db.users.map(sanitizeUser);

  // Employees can only see active members
  if (req.user.role === ROLES.EMPLOYEE) {
    users = users.filter(u => u.active);
  }

  if (role) users = users.filter(u => u.role === role);
  if (department) users = users.filter(u => u.department === department);
  if (active !== undefined) users = users.filter(u => u.active === (active === 'true'));

  res.json(users);
};

// GET /api/users/:id
exports.getById = (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  res.json(sanitizeUser(user));
};

// POST /api/users
exports.create = async (req, res) => {
  try {
    const { name, email, cpf, password, role, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios' });
    }

    const exists = db.users.find(u => u.email === email);
    if (exists) return res.status(400).json({ message: 'Email já cadastrado' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    const newUser = {
      id: uuidv4(),
      name, email,
      cpf: cpf || '',
      password: hashedPassword,
      role: role || ROLES.EMPLOYEE,
      department: department || 'Geral',
      avatar: initials,
      active: true,
      createdAt: new Date(),
    };
    db.users.push(newUser);
    res.status(201).json(sanitizeUser(newUser));
  } catch (err) {
    res.status(500).json({ message: 'Erro interno' });
  }
};

// PUT /api/users/:id
exports.update = async (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

  const { name, email, role, department, password } = req.body;
  if (name) { user.name = name; user.avatar = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(); }
  if (email) user.email = email;
  if (role) user.role = role;
  if (department) user.department = department;
  if (password) user.password = await bcrypt.hash(password, 10);

  res.json(sanitizeUser(user));
};

// PATCH /api/users/:id/toggle
exports.toggleActive = (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  if (user.id === req.user.id) return res.status(400).json({ message: 'Não é possível desativar sua própria conta' });

  user.active = !user.active;
  res.json(sanitizeUser(user));
};

// DELETE /api/users/:id
exports.delete = (req, res) => {
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Usuário não encontrado' });
  if (db.users[idx].id === req.user.id) return res.status(400).json({ message: 'Não é possível excluir sua própria conta' });

  db.users.splice(idx, 1);
  res.json({ message: 'Usuário removido com sucesso' });
};
