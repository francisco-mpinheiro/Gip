# 💡 Ideias de Inovações e Melhorias — GIP

Este documento reúne sugestões de diferenciais competitivos, melhorias de UX/UI (baseadas nas telas atuais do sistema) e propostas de personalização de visão por papel de usuário (`Role`), aproveitando a estrutura já existente no banco de dados (`schema.prisma`).

---

## 🚀 1. Inovações de Alto Impacto (Diferenciais para Apresentação / Banca)

Funcionalidades que destacam o projeto além de um CRUD tradicional de projetos e tarefas:

### 1.1. Match Inteligente de Tarefas por Competência (`Smart Assign`)
- **Contexto atual:** O banco já possui o model `Education` (Formações Acadêmicas), o `department` do usuário e o relacionamento com `Task`.
- **Proposta:** Ao criar ou editar uma tarefa e escolher um responsável, o sistema sugere um **Top 3 Membros Recomendados** com uma pontuação de compatibilidade.
- **Critérios do cálculo:**
  - **Disponibilidade:** Membros com menos tarefas `em_andamento` ou `atrasadas` ganham mais pontos.
  - **Afinidade:** Correspondência entre o departamento/formação acadêmica do membro e o escopo do projeto/tarefa.
  - **Histórico:** Taxa de entregas dentro do prazo daquele usuário.

### 1.2. Radar de Risco e Saúde Automática do Projeto (`Project Health`)
- **Contexto atual:** Os projetos mostram uma barra de progresso percentual e o status manual (`Planejamento`, etc.).
- **Proposta:** Adicionar uma badge automática de saúde do projeto: **🟢 Saudável**, **🟡 Em Atenção** ou **🔴 Crítico**.
- **Regras automáticas:**
  - **🔴 Crítico:** Mais de 30% das tarefas estão atrasadas OU faltam menos de 5 dias para a `endDate` com progresso abaixo de 70%.
  - **🟡 Em Atenção:** Existem tarefas sem responsável atribuído (`assigneeId == null`) ou com vencimento nas próximas 48h ainda em `a_fazer`.
  - **🟢 Saudável:** Tarefas em dia e ritmo compatível com a data de entrega.

### 1.4. Diagnóstico Executivo Automático no "Gerar Relatório"
- **Contexto atual:** A tela de Kanban do projeto já possui o botão **Gerar Relatório**.
- **Proposta:** Ao clicar no botão, além de exportar os dados, exibir um **Resumo Executivo Inteligente** destacando:
  - Taxa de conclusão atual e previsão de término baseada na velocidade da equipe.
  - **Gargalos identificados:** Ex.: *"2 tarefas estão atrasadas na coluna 'A Fazer' e sem responsável definido"*.
  - Distribuição de carga entre os membros daquele projeto.

---

## 🎨 2. Melhorias de UX/UI nas Telas Atuais

Ajustes práticos identificados a partir das telas atuais do sistema:

### 📊 Dashboard
- [ ] **Preencher os cards inferiores com dados visuais:** Substituir os espaços vazios de *"Status da Semana"* por um gráfico de rosca (*Donut Chart*) exibindo a proporção atual de tarefas (`A Fazer`, `Em Andamento`, `Concluídas` e `Atrasadas`).
- [ ] **Avatar nas Tarefas Recentes:** Na lista de *Tarefas Recentes*, incluir o avatar/iniciais do responsável ao lado da tag de status (ou um badge *"Sem responsável"* para chamar atenção do gestor).
- [ ] **Alimentar o Histórico de Atividades:** Conectar o model `Activity` aos eventos de criação/mudança de status de tarefas para popular automaticamente o card *"Histórico de Atividades"* na Dashboard.

### 📋 Kanban do Projeto & Lista de Tarefas
- [ ] **Enriquecer os cards do Kanban:**
  - Exibir o mini-avatar do responsável diretamente no card da tarefa.
  - Exibir contadores de comentários (`💬`) e anexos (`📎`), já que os models `Comment` e `TaskAttachment` já existem no Prisma.
- [ ] **Ação rápida de assumir/atribuir tarefa:** Permitir atribuir um membro rapidamente nos cards que estão sem responsável.

### 📈 Desempenho
- [ ] **Sincronizar métricas com o banco:** Corrigir a query que alimenta os indicadores do topo e o gráfico *"Visão Geral da Equipe"* (atualmente zerados mesmo havendo tarefas concluídas e atrasadas registradas no Dashboard).
- [ ] **Índice de Pontualidade (Entregas no Prazo vs. Com Atraso):** Adicionar uma métrica que avalie não apenas a quantidade de tarefas concluídas, mas quantas foram finalizadas **antes do `dueDate`**.

### 👥 Equipe & Meu Perfil
- [ ] **Exibir Formações e Competências nos Cards da Equipe:** Aproveitar os dados cadastrados em *Formações Acadêmicas* (`Education`) na tela *Meu Perfil* e exibi-los como tags nos cards da tela *Equipe* e no *UserDrawer*.
- [ ] **Indicador de Carga de Trabalho (`Workload`) na Equipe:** Mostrar em cada card de membro quantas tarefas ativas ele possui no momento (ex.: `🟢 2 ativas — Disponível` | `🟡 4 ativas — Moderado` | `🔴 6+ ativas — Sobrecarregado`).

---

## 🔐 3. Diferenciação de Experiência por Papel (`Role`)

Ideias para tornar a navegação única para cada perfil de usuário:

| Papel (`Role`) | O que muda na interface e funcionalidades |
| :--- | :--- |
| **Admin Plataforma / Empresa** (`admin_platform`, `admin_company`) | Visão global de todos os departamentos, gestão de usuários, ranking geral de desempenho e auditoria de atividades. |
| **Gestor de Área** (`manager_area`) | Dashboard filtrada pelo seu departamento (ex.: TI, Desenvolvimento, Design). Visualiza a carga de trabalho da sua equipe e aloca membros nos projetos da área. |
| **Gerente de Projeto** (`project_manager`) | Foco nos projetos que gerencia (`managedProjects`), radar de risco de atraso, distribuição de tarefas no Kanban e geração de relatórios executivos. |
| **Funcionário** (`employee`) | **Modo "Meu Foco":** Dashboard voltada para suas entregas da semana, lista de prioridades do dia, **Timer Pomodoro / Foco** integrado à tarefa em andamento e painel de conquistas individuais (ex.: *"100% no prazo esta semana"*). Sem acesso à tela de *Gerenciar Usuários*. |

---

## 🗓️ 4. Sugestão de Priorização (Roadmap Rápido)

1. **Curto Prazo (Quick Wins):**
   - Corrigir sincronização de dados na tela de **Desempenho** e nos cards inferiores da **Dashboard**.
   - Adicionar avatares e contadores (`💬` / `📎`) nos cards do **Kanban**.
   - Mostrar carga de trabalho e formações nos cards da tela **Equipe**.
2. **Médio Prazo (Diferenciais):**
   - Implementar a badge de **Saúde do Projeto (Radar de Risco)**.
   - Implementar o **Seletor de Visão por Papel** e a Dashboard personalizada de **"Meu Foco"** para o Funcionário.
3. **Destaque Final (Cereja do Bolo):**
   - Implementar a recomendação automática de responsável (**Smart Assign**) baseada em carga de trabalho + departamento/formação.
   - Enriquecer o modal de **Gerar Relatório** com diagnóstico automático de gargalos.

