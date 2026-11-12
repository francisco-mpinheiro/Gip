# 📋 Histórias de Usuário (HUs) — Melhorias e Inovações GIP

Formato simples pronto para copiar e colar nas **Issues do GitHub**.

---

## 🚀 Épico 1: Inovações de Alto Impacto

### HU-01: Recomendação Inteligente de Responsável (`Smart Assign`)
**Título para Issue:** `[Feature] HU-01: Sugestão automática de responsável na tarefa (Smart Assign)`

**História:**
> **Como** Gerente de Projeto ou Admin,
> **Quero** receber sugestões dos membros mais indicados ao atribuir uma tarefa,
> **Para** distribuir melhor o trabalho considerando disponibilidade, departamento e formação acadêmica.

**Critérios de Aceite (Tarefas):**
- [x] Calcular pontuação simples dos membros do projeto com base em: menor quantidade de tarefas ativas/atrasadas + departamento/formação (`Education`).
- [x] Exibir no seletor de responsável da tarefa os "Recomendados" com uma tag visual (ex.: `⭐ Recomendado`).

---

### HU-02: Indicador de Saúde e Risco do Projeto (`Project Health`)
**Título para Issue:** `[Feature] HU-02: Badge automática de Saúde do Projeto (Saudável, Atenção, Crítico)`

**História:**
> **Como** Gestor ou Admin,
> **Quero** visualizar rapidamente a saúde de cada projeto nos cards e no cabeçalho do Kanban,
> **Para** identificar projetos em risco de atraso antes que o prazo final expire.

**Critérios de Aceite (Tarefas):**
- [ ] Exibir badge `🔴 Crítico` quando mais de 30% das tarefas estiverem atrasadas ou restarem menos de 5 dias com progresso < 70%.
- [ ] Exibir badge `🟡 Em Atenção` quando houver tarefas sem responsável ou vencendo em até 48h ainda em `A Fazer`.
- [ ] Exibir badge `🟢 Saudável` nos demais casos.

---

### HU-03: Diagnóstico Executivo no Relatório do Projeto
**Título para Issue:** `[Feature] HU-03: Resumo executivo e identificação de gargalos no botão Gerar Relatório`

**História:**
> **Como** Gerente de Projeto ou Admin,
> **Quero** que o relatório do projeto apresente um diagnóstico automático de gargalos e carga da equipe,
> **Para** tomar decisões rápidas sem precisar analisar tarefa por tarefa manualmente.

**Critérios de Aceite (Tarefas):**
- [ ] Exibir resumo com taxa de conclusão, total de tarefas atrasadas e tarefas sem responsável atribuído.
- [ ] Listar os principais gargalos do projeto (ex.: tarefas paradas em `A Fazer` fora do prazo).
- [ ] Mostrar resumo de distribuição de tarefas por membro no projeto.

---

## 🎨 Épico 2: Melhorias de UX/UI nas Telas Atuais

### HU-04: Gráficos e Histórico Real na Dashboard
**Título para Issue:** `[Enhancement] HU-04: Preencher cards inferiores da Dashboard e exibir avatar nas tarefas recentes`

**História:**
> **Como** usuário do sistema,
> **Quero** visualizar o gráfico de status da semana, o histórico de atividades e os responsáveis pelas tarefas recentes na Dashboard,
> **Para** ter uma visão completa do andamento da operação logo na tela inicial.

**Critérios de Aceite (Tarefas):**
- [ ] Substituir o estado vazio de *Status da Semana* por um gráfico visual (rosca/barras) com a divisão das tarefas (`A Fazer`, `Em Andamento`, `Concluídas`, `Atrasadas`).
- [ ] Alimentar o card *Histórico de Atividades* registrando ações de criação e mudança de status de tarefas (`Activity`).
- [ ] Exibir o avatar/iniciais do responsável (ou aviso *"Sem responsável"*) na lista de *Tarefas Recentes*.

---

### HU-05: Enriquecimento dos Cards do Kanban
**Título para Issue:** `[Enhancement] HU-05: Exibir responsável, contadores de comentários/anexos e atribuição rápida no Kanban`

**História:**
> **Como** membro da equipe ou gestor,
> **Quero** ver quem é o responsável e quantos comentários/anexos existem diretamente no card do Kanban,
> **Para** acompanhar o contexto das tarefas sem precisar abrir uma por uma.

**Critérios de Aceite (Tarefas):**
- [ ] Mostrar mini-avatar do responsável no rodapé de cada card do Kanban (ou botão rápido para atribuir se estiver vazio).
- [ ] Exibir ícones com contagem de comentários (`💬`) e anexos (`📎`) no card quando houverem registros.

---

### HU-06: Sincronização de Dados e Índice de Pontualidade na Tela de Desempenho
**Título para Issue:** `[Fix/Enhancement] HU-06: Corrigir métricas da tela de Desempenho e adicionar taxa de entrega no prazo`

**História:**
> **Como** Gestor ou Admin,
> **Quero** visualizar os dados reais de tarefas concluídas/atrasadas e a taxa de pontualidade de cada membro na tela de Desempenho,
> **Para** avaliar a produtividade da equipe de forma justa e precisa.

**Critérios de Aceite (Tarefas):**
- [ ] Corrigir a busca/filtro que alimenta os 4 cards superiores e o gráfico *Visão Geral da Equipe* na tela de Desempenho.
- [ ] Adicionar indicador de **Pontualidade** (tarefas concluídas dentro do `dueDate` vs. concluídas com atraso).

---

### HU-07: Indicador de Carga de Trabalho (`Workload`) e Formações na Tela de Equipe
**Título para Issue:** `[Enhancement] HU-07: Mostrar carga de trabalho ativa e formações acadêmicas nos cards de Equipe`

**História:**
> **Como** Gestor ou Admin,
> **Quero** ver nos cards da tela de Equipe as formações acadêmicas e a quantidade de tarefas ativas de cada membro,
> **Para** saber quem está disponível ou sobrecarregado e quais são suas especialidades.

**Critérios de Aceite (Tarefas):**
- [ ] Exibir nos cards da tela *Equipe* (e no *UserDrawer*) as tags de formação acadêmica (`Education`) cadastradas pelo usuário.
- [ ] Exibir badge de carga de trabalho atual do membro (ex.: `🟢 Disponível (0-2 tarefas)` | `🟡 Moderado (3-5 tarefas)` | `🔴 Sobrecarregado (6+ tarefas)`).

---

## 🔐 Épico 3: Personalização de Visão por Papel (`Role`)

### HU-08: Visão do Funcionário ("Modo Meu Foco")
**Título para Issue:** `[Feature] HU-08: Adaptar interface e Dashboard para o papel Funcionário (employee)`

**História:**
> **Como** Funcionário (`employee`),
> **Quero** ter uma visão focada nas minhas próprias tarefas, prazos da semana e meu desempenho individual,
> **Para** organizar minhas entregas diárias sem distrações de menus administrativos.

**Critérios de Aceite (Tarefas):**
- [ ] Ocultar menus exclusivos de gestão global (ex.: *Gerenciar Usuários*).
- [ ] Adaptar a Dashboard para destacar *"Minhas Tarefas da Semana"* e alertas de prazos próximos.
- [ ] Exibir métricas individuais de entregas na aba de Desempenho.

---

### HU-09: Visão do Gestor de Área e Gerente de Projeto
**Título para Issue:** `[Feature] HU-09: Adaptar filtros e permissões para Gestor de Área e Gerente de Projeto`

**História:**
> **Como** Gestor de Área (`manager_area`) ou Gerente de Projeto (`project_manager`),
> **Quero** visualizar prioritariamente os indicadores, membros e projetos sob minha responsabilidade,
> **Para** gerenciar minha equipe ou meus projetos com foco no meu escopo de atuação.

**Critérios de Aceite (Tarefas):**
- [ ] Filtrar visão do `manager_area` para priorizar membros e indicadores do seu departamento.
- [ ] Permitir ao `project_manager` gerenciar membros, tarefas e relatórios dos projetos sob sua gestão (`managedProjects`), restringindo ações administrativas globais da plataforma.
