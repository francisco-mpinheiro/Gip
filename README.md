# ⚡ TaskFlow MVP

Plataforma completa de gestão de projetos e equipes com RBAC, Kanban e dashboard de desempenho.

---

## 🚀 Como Rodar

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### 1. Backend (API)

```bash
cd backend
npm install
npm run dev
# API rodando em http://localhost:5000
```

### 2. Frontend (React)

```bash
cd frontend
npm install
npm start
# App rodando em http://localhost:3000
```

---

## 👤 Usuários de Teste

| Email | Papel | Senha |
|-------|-------|-------|
| admin@taskflow.com | Admin da Plataforma | 123456 |
| carlos@empresa.com | Admin da Empresa | 123456 |
| ana@empresa.com | Gestora de Área | 123456 |
| bruno@empresa.com | Gerente de Projeto | 123456 |
| lucia@empresa.com | Funcionária | 123456 |

---

## 🏗 Estrutura do Projeto

```
taskflow/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js        # Banco em memória + seed
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── usersController.js
│   │   │   ├── projectsController.js
│   │   │   ├── tasksController.js
│   │   │   └── dashboardController.js
│   │   ├── middleware/
│   │   │   └── auth.js            # JWT + RBAC
│   │   ├── routes/
│   │   │   └── index.js           # Todas as rotas
│   │   └── server.js
│   ├── .env
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── context/
        │   └── AuthContext.js     # Auth + canDo() RBAC
        ├── pages/
        │   ├── LoginPage.js       # Login + Registro
        │   ├── DashboardPage.js   # Métricas + atividades
        │   ├── ProjectsPage.js    # Lista de projetos
        │   ├── ProjectDetailPage.js # Kanban do projeto
        │   ├── TasksPage.js       # Lista + Kanban geral
        │   ├── TeamPage.js        # Equipe por depto
        │   ├── UsersPage.js       # Gestão de usuários (admin)
        │   ├── PerformancePage.js # Ranking de desempenho
        │   ├── ProfilePage.js     # Perfil do usuário
        │   └── SettingsPage.js    # Configurações
        ├── components/layout/
        │   ├── AppLayout.js
        │   ├── Sidebar.js
        │   └── Topbar.js
        ├── utils/
        │   └── api.js             # Axios com interceptors
        ├── styles/
        │   └── global.css         # Tema dark navy
        └── App.js                 # Rotas + guards
```

---

## 🔐 RBAC — Controle de Acesso

| Ação | Admin Plataforma | Admin Empresa | Gestor Área | Gerente Projeto | Funcionário |
|------|:---:|:---:|:---:|:---:|:---:|
| Gerenciar usuários | ✅ | ✅ | ❌ | ❌ | ❌ |
| Criar projetos | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ver todos projetos | ✅ | ✅ | ✅ | Próprios | Membros |
| Criar tarefas | ✅ | ✅ | ✅ | ✅ | ❌ |
| Mover tarefas (Kanban) | ✅ | ✅ | ✅ | ✅ | Próprias |
| Ver desempenho | ✅ | ✅ | ✅ | ✅ | ❌ |
| Excluir projetos | ✅ | ✅ | ❌ | ❌ | ❌ |
| Excluir usuários | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🌐 Endpoints da API

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Registro |
| GET  | /api/auth/me | Usuário logado |

### Users
| Método | Rota | Permissão |
|--------|------|-----------|
| GET | /api/users | Autenticado |
| POST | /api/users | Admin |
| PUT | /api/users/:id | Admin |
| PATCH | /api/users/:id/toggle | Admin |
| DELETE | /api/users/:id | Admin Plataforma |

### Projects
| Método | Rota | Permissão |
|--------|------|-----------|
| GET | /api/projects | Autenticado |
| GET | /api/projects/:id | Autenticado |
| POST | /api/projects | Gestor+ |
| PUT | /api/projects/:id | Gestor+ |
| DELETE | /api/projects/:id | Admin |

### Tasks
| Método | Rota | Permissão |
|--------|------|-----------|
| GET | /api/tasks | Autenticado |
| POST | /api/tasks | Gestor+ |
| PUT | /api/tasks/:id | Gestor+ ou Responsável |
| PATCH | /api/tasks/:id/status | Autenticado |
| DELETE | /api/tasks/:id | Gestor+ |

### Dashboard
| Método | Rota | Permissão |
|--------|------|-----------|
| GET | /api/dashboard | Autenticado |
| GET | /api/performance | Autenticado |

---

## ✨ Funcionalidades Implementadas

- [x] Login/Registro com JWT
- [x] RBAC completo com 5 níveis
- [x] Dashboard com métricas e gráfico semanal
- [x] Projetos: CRUD + progresso automático
- [x] Kanban drag-and-drop por projeto
- [x] Tarefas: lista + kanban global
- [x] Equipe por departamento (grade + tabela)
- [x] Desempenho com ranking e barras
- [x] Gestão de usuários (admin)
- [x] Perfil editável
- [x] Configurações com toggles
- [x] Filtros e busca em todas as páginas
- [x] Banco de dados em memória com seed

---

## 🗄 Para produção: trocar banco em memória

O banco atual é **in-memory** (reinicia os dados quando o servidor reinicia). Para persistência, substitua `src/config/database.js` por:

- **MongoDB + Mongoose** (recomendado)
- **PostgreSQL + Sequelize/Prisma**
- **SQLite** (mais leve para MVPs iniciais)
