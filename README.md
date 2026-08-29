# ⚡ GIP MVP

Plataforma completa de gestão de projetos e equipes com RBAC, Kanban e dashboard de desempenho.

---

## 🚀 Como Rodar o Ambiente Local

Siga os passos abaixo para rodar o backend, frontend e o banco de dados da aplicação na sua máquina.

### Pré-requisitos
- **Node.js** (versão 18 ou superior)
- **npm** ou **yarn**
- **Docker** e **Docker Compose** (para rodar o PostgreSQL)

---

### Passo 1: Subir o Banco de Dados (PostgreSQL via Docker)

O projeto utiliza o PostgreSQL como banco de dados principal. A configuração já está pronta usando o Docker Compose.

1. Navegue até a pasta de infraestrutura do backend:
   ```bash
   cd backend/infra
   ```
2. Inicie o container do banco de dados em background:
   ```bash
   docker compose up -d
   ```
   *(O banco estará rodando na porta `5432`)*

---

### Passo 2: Configurar e Rodar o Backend (API)

O backend é construído em Node.js com Express e utiliza o Prisma ORM para gerenciar o banco de dados.

1. Acesse o diretório do backend:
   ```bash
   cd backend
   ```
2. Instale as dependências do projeto:
   ```bash
   npm install
   ```
3. Crie e aplique as tabelas no banco de dados com o Prisma:
   ```bash
   npx prisma generate   # Gera o client do Prisma
   npx prisma db push    # Sincroniza o schema com o banco de dados
   ```
4. Inicie o servidor:
   ```bash
   npm run dev
   ```
   *(A API estará rodando em `http://localhost:5000`. O script `dev` também se encarrega de popular o banco automaticamente executando o arquivo de seed, se necessário).*

---

### Passo 3: Configurar e Rodar o Frontend (React)

O frontend é uma SPA (Single Page Application) desenvolvida em React.

1. Abra uma nova aba no terminal e acesse a pasta do frontend:
   ```bash
   cd frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm start
   ```
   *(A aplicação estará disponível em `http://localhost:3000`)*

---

## 👤 Usuários de Teste

| Email | Papel | Senha |
|-------|-------|-------|
| admin@gip.com | Admin da Plataforma | 123456 |
| carlos@empresa.com | Admin da Empresa | 123456 |
| ana@empresa.com | Gestora de Área | 123456 |
| bruno@empresa.com | Gerente de Projeto | 123456 |
| lucia@empresa.com | Funcionária | 123456 |

---

## 🏗 Estrutura do Projeto

```
gip/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js        # Conexão Prisma + seed
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
- [x] Persistência de dados com PostgreSQL e Prisma ORM

---

