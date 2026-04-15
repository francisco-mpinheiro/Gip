const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// ─── IN-MEMORY DATABASE ────────────────────────────────────────────────────────
const db = {
  users: [],
  projects: [],
  tasks: [],
  activities: [],
};

// ─── ROLES ────────────────────────────────────────────────────────────────────
const ROLES = {
  ADMIN_PLATFORM: 'admin_platform',
  ADMIN_COMPANY: 'admin_company',
  MANAGER_AREA: 'manager_area',
  PROJECT_MANAGER: 'project_manager',
  EMPLOYEE: 'employee',
};

const ROLE_LABELS = {
  admin_platform: 'Admin da Plataforma',
  admin_company: 'Admin da Empresa',
  manager_area: 'Gestor de Área',
  project_manager: 'Gerente de Projeto',
  employee: 'Funcionário',
};

// ─── SEED DATA ────────────────────────────────────────────────────────────────
async function seedDatabase() {
  const password = await bcrypt.hash('123456', 10);

  db.users = [
    {
      id: 'u1',
      name: 'Admin Sistema',
      email: 'admin@taskflow.com',
      cpf: '000.000.000-00',
      password,
      role: ROLES.ADMIN_PLATFORM,
      department: 'TI',
      avatar: 'AS',
      active: true,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'u2',
      name: 'Carlos Mendes',
      email: 'carlos@empresa.com',
      cpf: '111.111.111-11',
      password,
      role: ROLES.ADMIN_COMPANY,
      department: 'Diretoria',
      avatar: 'CM',
      active: true,
      createdAt: new Date('2024-01-05'),
    },
    {
      id: 'u3',
      name: 'Ana Gestora',
      email: 'ana@empresa.com',
      cpf: '222.222.222-22',
      password,
      role: ROLES.MANAGER_AREA,
      department: 'Desenvolvimento',
      avatar: 'AG',
      active: true,
      createdAt: new Date('2024-01-10'),
    },
    {
      id: 'u4',
      name: 'Bruno Gerente',
      email: 'bruno@empresa.com',
      cpf: '333.333.333-33',
      password,
      role: ROLES.PROJECT_MANAGER,
      department: 'Desenvolvimento',
      avatar: 'BG',
      active: true,
      createdAt: new Date('2024-01-15'),
    },
    {
      id: 'u5',
      name: 'Lucia Dev',
      email: 'lucia@empresa.com',
      cpf: '444.444.444-44',
      password,
      role: ROLES.EMPLOYEE,
      department: 'Desenvolvimento',
      avatar: 'LD',
      active: true,
      createdAt: new Date('2024-02-01'),
    },
    {
      id: 'u6',
      name: 'Pedro Silva',
      email: 'pedro@empresa.com',
      cpf: '555.555.555-55',
      password,
      role: ROLES.EMPLOYEE,
      department: 'Design',
      avatar: 'PS',
      active: true,
      createdAt: new Date('2024-02-10'),
    },
    {
      id: 'u7',
      name: 'Mariana Costa',
      email: 'mariana@empresa.com',
      cpf: '666.666.666-66',
      password,
      role: ROLES.EMPLOYEE,
      department: 'QA',
      avatar: 'MC',
      active: false,
      createdAt: new Date('2024-03-01'),
    },
    {
      id: 'u8',
      name: 'Francisco',
      email: 'francisco@gmail.com',
      cpf: '000.000.000-00',
      password,
      role: ROLES.ADMIN_PLATFORM,
      avatar: 'MC',
      active: false,
      createdAt: new Date('2026-04-15')
    }
  ];

 

}
module.exports = { db, ROLES, ROLE_LABELS, seedDatabase };
