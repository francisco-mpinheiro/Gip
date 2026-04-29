const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const prisma = require('./prisma');

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

  const count = await prisma.user.count();
  if (count > 0) return;

  await prisma.user.createMany({
    data: [
      {
        id: 'u1', name: 'Admin Sistema', email: 'admin@taskflow.com', cpf: '000.000.000-00', password, role: ROLES.ADMIN_PLATFORM, department: 'TI', avatar: 'AS', active: true,
      },
      {
        id: 'u2', name: 'Carlos Mendes', email: 'carlos@empresa.com', cpf: '111.111.111-11', password, role: ROLES.ADMIN_COMPANY, department: 'Diretoria', avatar: 'CM', active: true,
      },
      {
        id: 'u3', name: 'Ana Gestora', email: 'ana@empresa.com', cpf: '222.222.222-22', password, role: ROLES.MANAGER_AREA, department: 'Desenvolvimento', avatar: 'AG', active: true,
      },
      {
        id: 'u4', name: 'Bruno Gerente', email: 'bruno@empresa.com', cpf: '333.333.333-33', password, role: ROLES.PROJECT_MANAGER, department: 'Desenvolvimento', avatar: 'BG', active: true,
      },
      {
        id: 'u5', name: 'Lucia Dev', email: 'lucia@empresa.com', cpf: '444.444.444-44', password, role: ROLES.EMPLOYEE, department: 'Desenvolvimento', avatar: 'LD', active: true,
      },
      {
        id: 'u6', name: 'Pedro Silva', email: 'pedro@empresa.com', cpf: '555.555.555-55', password, role: ROLES.EMPLOYEE, department: 'Design', avatar: 'PS', active: true,
      },
      {
        id: 'u7', name: 'Mariana Costa', email: 'mariana@empresa.com', cpf: '666.666.666-66', password, role: ROLES.EMPLOYEE, department: 'QA', avatar: 'MC', active: false,
      },
      {
        id: 'u8', name: 'Francisco', email: 'francisco@gmail.com', cpf: '777.777.777-77', password, role: ROLES.ADMIN_PLATFORM, avatar: 'FR', active: false,
      }
    ]
  });
}
module.exports = { ROLES, ROLE_LABELS, seedDatabase };
