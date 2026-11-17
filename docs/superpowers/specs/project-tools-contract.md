# Ferramentas de projeto — contrato da primeira versão

O usuário aprovou implementar as oito ideias e pediu execução direta rápida. Manter visual claro/escuro, rotas existentes e controles atuais; novos painéis são acrescentados depois do conteúdo existente. Sem novas dependências. Persistência real PostgreSQL/Prisma. Não criar dados falsos no ambiente do usuário.

## Dados novos (root implementa schema e migração)

Campos id String uuid e createdAt DateTime default now em todos. Relacionamentos com project/user/task (campos abaixo), FK project e task onDelete Cascade para não bloquear exclusão existente; User onDelete Restrict. Nomes Prisma exatamente abaixo.

- ProjectIssue: projectId, taskId String?, authorId, title String, reason String, status String default 'open', resolution String?, resolvedAt DateTime?. Project.issues, Task.issues, User.projectIssues.
- TaskDependency: projectId, taskId, dependsOnId, authorId. Unique [taskId,dependsOnId]. Task.dependencies (taskId, relation TaskDependencies), Task.dependents (dependsOnId, relation TaskDependents). Project.dependencies, User.createdDependencies.
- TaskReview: projectId, taskId, authorId, reviewerId String?, summary String, evidence String?, status String default 'pending', feedback String?, reviewedAt DateTime?. Task.reviews, Project.reviews, User.submittedReviews (author relation ReviewAuthor), User.reviewedSubmissions (reviewer relation ReviewReviewer).
- ProjectCheckIn: projectId, authorId, day String (YYYY-MM-DD Sao Paulo), completed String, nextStep String, needsHelp String?. Unique [projectId,authorId,day]. Project.checkIns, User.checkIns.
- ProjectNote: projectId, authorId, kind String ('decision'|'scope'|'lesson'), title String, content String. Project.notes, User.projectNotes.
- DepartmentRequest: projectId, authorId, fromDepartment String, toDepartment String, title String, description String, priority String default 'media', status String default 'open', resolution String?, resolvedAt DateTime?. Project.departmentRequests, User.departmentRequests.

## Permissões e invariantes

Autenticar todas as APIs. Projeto acessível a admins, gerente e membros; gestor área também quando gerente/membro pertence ao seu departamento (departamento não nulo). canManage=true admins, gerente responsável, ou gestor área nesse escopo. project_manager que só é membro não é gestor nesse projeto. Negar ids externos/recursos de outro projeto com 403/404. Todos retornos de usuário somente id/name/avatar/department/role, sem senha/tokens.

Membro cria impedimento (somente tarefa do projeto), faz check-in próprio, registra memória e pedido interdepartamental. Resolve impedimento autor ou gestor. Apenas gestor adiciona/remove dependências (ambas tarefas do projeto, sem auto referência ou ciclos), executa simulação e decide revisão. Responsável de tarefa ou gestor envia revisão, uma pendente por tarefa. Pedido de ajuste reabre tarefa em_andamento; aprovação conclui e recalcula progresso usando a função já existente ou equivalente. Mudanças em transação com Activity. Não permitir concluir tarefa com impedimento aberto, dependência não encerrada, revisão pending/changes_requested. Integrar essa regra às rotas existentes create/update/updateStatus quando status='concluido'. Notificar responsável quando sua dependência for concluída, deduplicando pelo evento (uma notificação por tarefa dependente/execução). Nenhuma mudança de status sem permissão de edição (assignee ou gestor do projeto).

Pedidos de departamento: criar fromDepartment do usuário autenticado, validar toDepartment existente na empresa e diferente da origem; resolver autor, gestor do projeto ou usuário do departamento destino. Manter dados mínimos na listagem global para não expor tarefas privadas. Sem envio de mensagens/e-mail.

## APIs novas — agente backend implementa

Base /api (router existente). Rotas sem conflitos com projetos/:id.

GET /projects/:id/tools → {
 canManage:boolean,
 health:{level:'healthy'|'attention'|'critical',label:string,reasons:string[],metrics:{total,completed,overdue,unassigned,blocked,pendingReviews}},
 tasks:[{id,title,status,priority,dueDate,assigneeId}],
 members:[{id,name,avatar,department,role}],
 departments:string[],
 issues:[{...ProjectIssue,author:{id,name},task?:{id,title}}],
 dependencies:[{...TaskDependency,task:{id,title,status},dependsOn:{id,title,status}}],
 reviews:[{...TaskReview,author:{id,name},reviewer?:{id,name},task:{id,title,status,assigneeId}}],
 checkIns:[{...ProjectCheckIn,author:{id,name}}],
 notes:[{...ProjectNote,author:{id,name}}],
 requests:[{...DepartmentRequest,author:{id,name}}],
 workload:[{user:{id,name,avatar,department},active:number,overdue:number}]
}.
workload deve considerar tarefas ativas do usuário em todos os projetos (contagens apenas), para simular carga verdadeira. _Sem dados de tarefas privadas_. Ordenar listas recentes primeiro, dependências por título se útil.

POST /projects/:id/issues body {title,reason,taskId?} → issue 201
PATCH /projects/:id/issues/:itemId body {resolution} → status resolved
POST /projects/:id/dependencies body {taskId,dependsOnId} → dependency 201
DELETE /projects/:id/dependencies/:itemId → {message}
POST /projects/:id/reviews body {taskId,summary,evidence?} → review 201
PATCH /projects/:id/reviews/:itemId body {decision:'approved'|'changes_requested',feedback} → review
POST /projects/:id/check-ins body {completed,nextStep,needsHelp?} → upsert do dia atual (autor do JWT)
POST /projects/:id/notes body {kind,title,content} → note 201
POST /projects/:id/department-requests body {toDepartment,title,description,priority} → request 201
PATCH /projects/:id/department-requests/:itemId body {resolution} → request resolved
GET /department-requests → {requests:[{...request,author:{id,name},project:{id,name},canResolve:boolean}],departments:string[]}. Admins globais, demais usuário autor ou dept origem/destino; somente informações do pedido, sem payload do projeto. A ação resolve via mesma rota PATCH, permitindo destinatário mesmo fora do projeto.
POST /projects/:id/simulate body {assignments:[{taskId,assigneeId}]} → {members:[{user:{id,name},before:number,after:number,delta:number}],warnings:string[]}. Simulação somente: não gravar/recalcular dados. Validar tarefas ativas do projeto, candidatos ativos membro/gerente, sem duplicados, até 100 itens. Retirar tarefa do responsável anterior e adicionar ao novo a partir da carga real global. Permitir cenário vazio.

Health (serviço puro root): mesma regra do backlog. Fora de estados concluido/cancelado, critical se >30% ativas vencidas/total relevante ou projeto com <5 dias até endDate e progresso<70 (inclui vencido). attention se sem responsável ou a_fazer vencendo em48h ou issueaberta ou revisão pendente ou dependência travada. healthy nos demais, inclusive concluído/cancelado. Dias civis Sao Paulo para vencimento. Metrics contagem real; total inclui não canceladas, completed concluídas, blocked tarefas com impedimentos e/ou predecessores não concluídos/cancelados sem duplicação. Projeto vazio saudável com explicação 'Nenhuma tarefa cadastrada'. Progresso para saúde calculado de tarefas não canceladas, nunca confiar no progress manual.

## Interface — agente frontend implementa

Criar frontend/src/components/project-tools/ProjectToolsPanel.jsx e estilos propios com tokens; inserir <ProjectToolsPanel projectId={id} onChange={load}/> após Kanban e antes de modal existente em ProjectDetailPage. Adicionar frontend/src/components/project-tools/DepartmentRequestsPanel.jsx depois da lista/tabela Equipe antes do UserDrawer em TeamPage. Sem mexer nos controles existentes.

Um card 'Ferramentas do projeto' com oito abas, ícones Bootstrap, responsivo, estados loading/error/retry/empty e feedback de gravação. Abas: Saúde, Impedimentos, Dependências, Revisões, Simulador, Check-in, Memória, Departamentos. Saúde mostra badge explicativa, métricas, causas e ações navegar à aba relevante. Formulários com labels e required/limites. Usar select de tarefas e usuários carregados, nenhum ID exposto. Desabilitar envio durante gravação, mensagens inline, atualizar painel e onChange após mutações (não após simulação). Respeitar canManage e papel/responsável das tarefas nos botões. Listas com contexto autor/data/status, resolução/feedback e datas em pt-BR. Check-in preenche existente do usuário no dia (API retorna authorId), salve sem duplicar. Memória filtra kind e registra decisões/escopo/lições. Simulador gerencial adiciona linhas tarefa/responsável e compara antes/depois sem persistir. Dependências lista predecessora→sucessora e status, remoção só gestor. Revisão usa resumo/evidências textuais (os anexos já existem na tarefa); aprovar/devolver com feedback obrigatório, mostra resumo/evidência. Pedidos interdept globais em Equipe filtram status/departamento e resolvem com textarea, não navegar a projeto sem permissão. Usar existing utils/api axios instance e criar projectToolsAPI em módulo novo utils/projectToolsApi.js (default API é exportado em utils/api.js).

## Escopo da primeira versão

Sem IA externa, previsão artificial, estimativas de horas ou dependências novas. Não mudar URLs de navegação. Recursos de edição/exclusão de memória e relatórios avançados ficam fora desta primeira versão; criar e consultar é funcionalidade entregue. Interface deve explicar a simulação como distribuição de quantidade de tarefas, não previsão de prazo.
