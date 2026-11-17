# Análise geral do GIP

Data: 16/11/2026. Análise do código e dos documentos disponíveis no checkout local.

## Parecer

O GIP já tem uma base de MVP: React, API Express, PostgreSQL via Prisma, cinco papéis, projetos, tarefas, Kanban, comentários, anexos, perfil, formações, notificações, chat e recomendação de responsável. A stack atual pode ser mantida. A prioridade é tornar as permissões e regras de negócio consistentes antes de ampliar funcionalidades.

Os principais riscos estão na autorização da API, na exposição de campos internos de usuários e na diferença entre os requisitos documentados e o comportamento implementado. O sistema atual não implementa isolamento por empresa, embora isso apareça no escopo SaaS.

Esta análise não altera código de produto nem dados. As propostas abaixo são recomendações para discussão, não decisões de escopo já aprovadas.

## Material e método

- Leitura do README, dos três PDFs (39 páginas no total), dos dois documentos de ideias/histórias e do workflow GitHub Actions.
- Inspeção dos controllers, rotas, middleware, configuração, Socket.io, agendamento, schema e migração, além de páginas, componentes, contextos, utilitários e estilos do frontend.
- Build de produção do frontend, com saída em `/tmp/gip-review/frontend-build`: concluído com sucesso. Houve avisos de base Browserslist antiga e depreciação de `fs.F_OK` nas ferramentas utilizadas.
- `node --check` nos 17 arquivos JavaScript de `backend/src`: todos passaram.
- Seis reproduções isoladas de comportamento dos controllers, com Prisma simulado e dados fictícios; todas confirmadas. Não são testes HTTP de integração e não validam o PostgreSQL.
- Não foram iniciados servidor, seed nem migrações. Não houve teste visual em navegador, envio de e-mail, teste real de WebSocket, carga ou auditoria de dependências. Responsividade e funcionamento integral em produção não foram comprovados.

## O que já existe

| Área | Implementação encontrada | Limitação principal |
| --- | --- | --- |
| Autenticação | JWT, bcrypt, consulta do usuário ativo por requisição HTTP | Cadastro público aceita papel privilegiado; sem revogação de sessão |
| Papéis | Enum de cinco níveis e middleware de autorização | Falta combinar papel com empresa, área, projeto e propriedade do recurso |
| Projetos | CRUD, membros, gerente, datas e progresso | Conclusão sem validar tarefas; progresso editável por API |
| Tarefas | CRUD, Kanban, prazo, responsável, comentários e anexos | Verificações de acesso incompletas e diferentes entre endpoints |
| Dashboard | Cards, gráfico, atividades e tarefas da semana | Escopos inconsistentes e ausência de paginação |
| Desempenho | Métricas por usuário, gráfico e visão individual | Usa todas as tarefas dos usuários selecionados, inclusive fora do projeto do gerente |
| Smart Assign | Pontuação por carga, formação e afinidade, com explicação | Heurística no frontend; não mede pontualidade histórica |
| Perfil e formações | Avatar, dados pessoais, senha e certificados | Confirmação de e-mail incompleta; arquivos públicos |
| Comunicação | Chat direto persistido e Socket.io | Sem restrição de destinatário por projeto/empresa e sem checagem de conta ativa no socket |
| Notificações | Atribuição, consulta por proprietário e cron de prazos | Comparação incorreta do status concluído e possibilidade de duplicação |

Pontos positivos concretos: senhas têm hash; a autenticação HTTP consulta o estado atual da conta; notificações verificam o proprietário; exclusão de formação verifica o proprietário; várias consultas de relacionamentos selecionam campos específicos; o cliente centraliza chamadas Axios; o Smart Assign já explica fatores da recomendação.

## Achados prioritários

### A01 — Crítico: cadastro público permite criar administrador

Evidência: `backend/src/routes/index.js` expõe `POST /auth/register` sem autenticação. Em `backend/src/controllers/authController.js`, `register` aceita `role` do corpo e grava `role: role || ROLES.EMPLOYEE`.

Impacto: um visitante consegue solicitar `admin_platform` e receber token da conta criada. Reproduzido no controller com HTTP 201 e esse papel na resposta.

Recomendação: fixar o papel de cadastro público no servidor; preferir convite para ingresso em empresa. Separar criação administrativa de conta e validar quais papéis cada administrador pode conceder.

### A02 — Crítico: dados de usuários incluem tokens de recuperação

Evidência: `sanitizeUser` em `usersController.js` e `authController.js`, e respostas de perfil, removem apenas `password`. O schema inclui `resetToken`, `emailToken`, expirações e CPF. As rotas de consulta de usuários exigem apenas autenticação.

Impacto: tokens de recuperação existentes podem aparecer na listagem e consulta de usuários. Com um token de recuperação válido, o endpoint público de reset permite redefinir a senha correspondente. A exposição dos campos foi reproduzida com tokens fictícios; não foi feito reset real.

Recomendação: usar seleção explícita dos campos públicos e respostas distintas para diretório, perfil e administração. Nunca devolver tokens internos. Armazenar hash do token de recuperação e definir política de exposição de CPF e certificados.

### A03 — Alto: operações de tarefas não verificam o acesso ao recurso

Evidência: `tasksController.js`: `getById` não valida vínculo; `updateStatus` só verifica existência e valor do status; comentários e anexos não validam acesso ao projeto; `deleteAttachment` não verifica proprietário, permissão ou correspondência entre anexo e tarefa da URL.

Impacto: um funcionário autenticado pode consultar e mover tarefa de outro usuário/projeto conhecendo seu identificador. Os dois comportamentos foram reproduzidos em controllers. Comentários e anexos apresentam a mesma ausência de validação na leitura do código.

Recomendação: aplicar uma política comum para ler, editar, mover, comentar, anexar e excluir, incluindo a relação entre recurso e projeto. UUID não substitui autorização.

### A04 — Alto: hierarquia administrativa e escopo de gestão incompletos

Evidência: `usersController.create/update` aceita qualquer papel também para `admin_company`; `toggleActive` não protege administradores superiores. Em tarefas, o papel de gerente permite editar qualquer tarefa e as rotas de criação/exclusão não verificam se ele gerencia aquele projeto. `projectsController.getById` restringe apenas funcionários, deixando gerente consultar projeto fora da própria listagem. Gestor de área tem permissão ampla sem filtro por departamento.

Impacto: o papel define o tipo de ação, mas não limita consistentemente os registros afetados. A separação hierárquica descrita nos documentos não está assegurada.

Recomendação: definir matriz de papel × ação × escopo e aplicá-la no backend. A interface deve refletir essa política e considerar o recurso específico, em vez de usar somente `canDo(user, action)`.

### A05 — Alto: responsável pode alterar campos de gestão

Evidência: `tasksController.update` libera a edição quando `assigneeId === req.user.id` e usa a mesma lista de campos para todos os papéis, incluindo responsável, prioridade, prazo e status.

Impacto: funcionário responsável consegue reatribuir a tarefa e mudar prioridade; ambos reproduzidos no controller. Alteração de prazo também está na lista permitida, sujeita à checagem do período do projeto.

Recomendação: definir campos editáveis por ação/papel. Pela descrição apresentada, o funcionário deveria atualizar sua execução; delegação e definição de prazo precisam de regra gerencial explícita.

### A06 — Alto: não existe isolamento por empresa

Evidência: `schema.prisma` não possui entidade de empresa, `companyId`, `tenantId` ou `organizationId`. O JWT contém id e papel. Departamento é texto no usuário, sem entidade e sem vínculo de área no projeto.

Impacto: `admin_company` não representa uma fronteira de dados entre empresas. O escopo PDF descreve uma arquitetura multiempresa que ainda não está implementada.

Recomendação: decidir se a entrega acadêmica será para uma organização ou um SaaS para várias. Para SaaS, modelar organização, associações e escopos e verificar isolamento em todas as operações, incluindo chat, anexos, métricas e auditoria. Para organização única, alinhar explicitamente os documentos a esse recorte.

### A07 — Alto: conclusão e progresso de projetos podem contrariar tarefas

Evidência: `projectsController.update` aceita `status` e `progress` sem consultar pendências. `create` também aceita status arbitrário. `Task.status`, `Project.status` e prioridades são strings; somente a rota dedicada de movimentação restringe valores de status da tarefa.

Impacto: projeto pode receber `concluido` e progresso 100 com tarefa pendente, reproduzido no controller. Não há máquina de estados completa nem definição única para cancelamento e revisão.

Recomendação: padronizar enums e transições; derivar progresso das tarefas; validar conclusão e concorrência em transação. Definir o tratamento de canceladas, projeto sem tarefas e reabertura de tarefa de projeto concluído.

### A08 — Alto: anexos e certificados são servidos publicamente

Evidência: `server.js` publica `/uploads` via `express.static` sem autenticação. O upload de anexo de tarefa usa Multer sem limite/tipos; avatar e formação têm controles próprios. As URLs de certificados aparecem em consultas de usuários.

Impacto: quem obtiver uma URL pode acessar o arquivo sem autenticação. Nomes aleatórios não implementam a privacidade exigida na documentação. Uploads de tarefas não têm os mesmos limites dos demais fluxos.

Recomendação: servir documentos por endpoint autorizado; definir política distinta para avatar público e arquivo privado; limitar tamanho, conferir conteúdo permitido e limpar arquivos órfãos. Ajustar o cliente para baixar arquivos com credenciais.

### A09 — Alto: exclusões podem falhar após alterações parciais

Evidência: controllers removem dependências em várias chamadas sem `$transaction`. Exclusão de projeto não remove comentários e notificações ligados às tarefas; exclusão de tarefa não trata notificações. Essas relações não têm cascade explícito no schema. Exclusão de usuário também não define tratamento dos diversos vínculos.

Impacto: as restrições referenciais podem impedir a exclusão depois de parte das atividades/comentários já ter sido removida. As rotas apagam auditoria em vez de reter registro da exclusão. Risco identificado por inspeção do schema e operações; não reproduzido em PostgreSQL.

Recomendação: definir arquivamento/inativação, retenção de histórico e política de relacionamentos. Usar transações para as alterações relacionadas e tratar arquivos físicos separadamente, com recuperação de falhas.

### A10 — Alto: migrações não reproduzem o schema atual

Evidência: a única migração cria `projects.ownerId` e tarefas com padrão `TODO`; o schema atual usa `managerId`, membros, datas, progresso, diversas tabelas adicionais e tokens de recuperação.

Impacto: aplicar somente o histórico versionado não cria o banco exigido pela aplicação atual. `db push`, recomendado no README, pode mascarar essa divergência no desenvolvimento.

Recomendação: inspecionar o estado do banco real e preparar migração de reconciliação preservando dados. Validar criação de banco vazio e atualização de banco existente. Não resetar ou substituir o histórico sem conhecer os ambientes que já o utilizam.

### A11 — Alto: arquivo de ambiente já está versionado

Evidência: `git ls-files` inclui `backend/.env`, apesar da regra de ignore. Foi conferida somente a presença dos nomes `JWT_SECRET`, `DATABASE_URL`, `PORT`, `JWT_EXPIRES_IN` e `NODE_ENV`, sem reproduzir valores neste relatório.

Impacto: configurações de autenticação e conexão estão no versionamento; o grau de exposição depende dos valores e de quem teve acesso ao repositório.

Recomendação: substituir por `.env.example` sem segredos e deixar o arquivo real fora do Git. Se os valores já foram usados em ambiente compartilhado, trocar os segredos envolvidos. Alterar `.gitignore` sozinho não remove arquivo já rastreado.

## Consistência funcional, métricas e experiência

1. **Notificações de tarefa concluída:** `checkImmediateDeadline` e o cron comparam `concluida`, mas o sistema usa `concluido`. Tarefas concluídas continuam elegíveis a alerta de prazo. Falta chave de deduplicação; edição de tarefa pode repetir alertas. O cron não define timezone explícito nem coordenação entre múltiplas instâncias.
2. **Prazos e fuso:** cálculos de atraso comparam timestamp diretamente com o momento atual, enquanto a exibição trata a data como dia civil. Uma data armazenada à meia-noite UTC pode virar atraso antes do fim do dia esperado. Centralizar regra de dia de vencimento e fuso da organização.
3. **Dashboard:** atividades recentes não têm filtro de acesso a projeto; contagem de membros é global; o gráfico aplica filtro de tarefas apenas para funcionário, descartando o escopo do gerente. A API retorna `hoursWorked: 1248` fixo, sem fonte real. Remover o campo ou implementar uma medição real se ele for requisito.
4. **Desempenho:** seleciona usuários do escopo e depois todas as tarefas desses usuários, sem restringir projetos. Tarefas sem responsável não entram no total e podem explicar diferença em relação ao Dashboard. Não há `completedAt` para pontualidade: `updatedAt` muda em qualquer edição e não substitui data de conclusão.
5. **Ranking:** o usuário atual sempre vai para o topo, antes do critério escolhido, mas recebe posição e medalha como se a lista fosse um ranking geral. Separar destaque pessoal da classificação. Identificar claramente média individual versus taxa global ponderada por tarefas.
6. **Perfil:** alteração de e-mail grava imediatamente o novo endereço, gera token e aponta para `/confirm-email`, mas não há rota de confirmação. `pendingEmail` existe no schema e não é usado nesse fluxo. Departamento pode ser alterado pelo próprio usuário; se for fronteira de autorização, isso permite mudar o próprio escopo de área.
7. **Sessões:** recuperação não exige o mesmo mínimo da troca autenticada; troca/reset de senha não revoga JWTs existentes. Sem refresh token, rate limiting ou política de revogação implementada. Revalidar usuário ativo e acesso ao destinatário também no Socket.io e em eventos de mensagem.
8. **Configurações:** toggles da página alteram somente estado local, sem aplicar tema/animações nem persistir. A Topbar já usa `PreferencesContext` para tema e fonte; reutilizar esse contexto e implementar a preferência de movimento.
9. **Erros:** várias telas usam `catch(console.error)` e mostram listas vazias ou zeros em falhas; algumas ações de drag/drop e exclusão não capturam rejeições. Exibir erro, possibilidade de repetir e distinguir falha de ausência de dados.
10. **Interface e acessibilidade:** há media queries e menu móvel, mas isso não comprova responsividade completa. Complementar arrastar/soltar com ação acessível por teclado/toque; revisar foco, escape e rótulos em modais e botões. Padronizar avisos em vez de alternar `alert`, `confirm` e mensagens inline.
11. **Organização:** páginas de tarefas, login e desempenho concentram bastante código e estilos inline. Extrair formulários, cards, modais e regras compartilhadas por necessidade concreta; introduzir serviços/políticas no backend para evitar repetir regras divergentes nos controllers.
12. **Escala:** consultas de usuários incluem tarefas/formações inteiras e diversas listagens não têm paginação. Consolidar agregações no banco, carregar detalhes sob demanda e criar índices a partir de consultas medidas. Não foi medido P95.

## Documentação versus código

Fontes: `README.md`, `docs/documentacao_tecnica_gip.pdf`, `docs/documentacao-gip (1).pdf`, `docs/escopo_gip.pdf` e os dois arquivos de `docs/ideias-melhorias/`.

| Declaração ou proposta | Estado observado |
| --- | --- |
| RBAC completo e isolamento de empresa/área | Existem papéis e filtros parciais; isolamento multiempresa ausente |
| Máquina de estados rígida e conclusão só com tarefas encerradas | Regra ausente na atualização de projeto |
| Progresso exclusivamente automático | Há recálculo, mas API também aceita valor manual |
| Auditoria de alterações críticas e deleções | Logs genéricos, sem antes/depois; exclusões removem atividades |
| Chat restrito a participantes do mesmo espaço/projeto | Não há validação dessa relação no histórico ou envio |
| Privacidade dos anexos | Pasta é pública via servidor estático |
| Refresh token, Swagger e containerização da aplicação no escopo | Ausentes; Compose cobre somente PostgreSQL |
| Dashboard vazio e Smart Assign ainda como diferencial futuro | Há gráficos, atividades e Smart Assign implementados; histórias precisam de reclassificação |
| Visão individual de desempenho ainda proposta | Já existe na página e na API; não comprova que todas as métricas estejam corretas |
| Avatares de responsável ainda propostos no Kanban | Já existem; faltam contadores e tratamento consistente de tarefa sem responsável |
| Recuperação de senha somente futura/em desenvolvimento | Controllers e tela existem, mas envio SMTP e fluxo completo não foram testados |
| API de educação em `/api/education` | Código usa `/api/user/education` |
| API de chats por chat e mensagens | Código tem `GET /api/chat/:userId` e evento Socket.io `send_message`; não há entidade Chat |
| Tela `/profile/academic` | Não é rota do React atual; formação é parte do perfil |
| PostgreSQL local na porta 5432 | Compose publica 5433 no host, encaminhando para 5432 no container |
| Login de teste `admin@gip.com` | Seed cria `admin@taskflow.com` |
| Script `npm run seed` | Aponta para `src/utils/seed.js`, arquivo ausente; servidor faz seed ao iniciar se não há usuários |
| Licença MIT com arquivo LICENSE | Arquivo não foi encontrado no checkout |

Os PDFs também divergem entre si sobre status de tarefa, revisão, chat já implementado ou futuro e acesso do funcionário ao desempenho. A documentação acadêmica lista integrantes diferentes entre capa e divisão da equipe. Recomenda-se uma versão principal editável, com escopo entregue, propostas e limitações claramente distinguidos, da qual os PDFs sejam gerados.

O workflow existente executa Gitleaks. Não há suíte de testes de produto, scripts de teste nem pipeline de build identificados; a verificação de segredos é uma base útil, mas não verifica permissões ou regras de negócio. Backend e frontend possuem lockfiles versionados. O diretório `frontend/build` também está versionado e pode divergir do fonte.

## Ordem recomendada de evolução

### Etapa 1 — Corrigir o núcleo de autorização

- Bloquear papel privilegiado no cadastro público e limitar concessão de papéis por hierarquia.
- Restringir campos retornados de usuários, sobretudo tokens internos.
- Centralizar regras de acesso a projeto/tarefa e aplicá-las em todas as rotas e eventos relacionados.
- Proteger documentos e limitar uploads; separar arquivos públicos e privados.
- Tratar o `.env` versionado e separar seed de demonstração da inicialização normal.
- Acrescentar testes de permissão que verifiquem recusas, não só acessos permitidos.

Aceite proposto: funcionário não lê/altera recurso fora do seu escopo; administrador de empresa não concede papel de plataforma; respostas nunca incluem tokens internos; arquivo privado exige autorização.

### Etapa 2 — Tornar regras e dados confiáveis

- Reconciliar migrações com o schema sem perder dados.
- Definir organização única ou multiempresa, e como uma área se relaciona com um projeto.
- Padronizar status/prioridade e transições; impedir conclusão com pendências; definir cancelamento e reabertura.
- Transacionar alterações relacionadas, preservar auditoria e definir arquivamento.
- Corrigir alertas, datas, escopos de métricas e registrar conclusão real das tarefas.
- Finalizar confirmação de e-mail e política de sessões.

Aceite proposto: progresso tem uma fonte única; métricas com o mesmo escopo reconciliam; tarefa concluída não recebe alerta de vencimento; banco pode ser reconstruído pelas migrações.

### Etapa 3 — Melhorar o uso diário

- Funcionário: início centrado em suas tarefas, prazos e impedimentos.
- Gestor e gerente: dados da área/projetos autorizados, distribuição de carga e alertas acionáveis.
- Kanban: responsável visível, indicação de ausência de responsável e contagem de comentários/anexos.
- Equipe: formações e carga ativa, respeitando quais dados cada papel pode visualizar.
- Configurações efetivas, tratamento consistente de erro e fluxo acessível por teclado e toque.

### Etapa 4 — Demonstrar inteligência com explicações verificáveis

- Radar de saúde do projeto, usando as regras já propostas nas histórias, com motivo visível para cada alerta.
- Relatório executivo com atrasos, pendências sem responsável e distribuição de carga. A exportação atual lista títulos por coluna; ainda não faz esse diagnóstico.
- Aperfeiçoar Smart Assign: evitar correspondências espúrias por substrings curtas, restringir candidatos elegíveis, validar carga e distinguir pontuação heurística de probabilidade. Não apresentar o score como percentual de precisão.
- Pontualidade por `completedAt` e histórico de transições. A recomendação atual bonifica quantidade de conclusões, sem demonstrar entrega dentro do prazo.
- Previsão de término apenas depois de haver histórico suficiente e regra mensurável; declarar limitações em vez de oferecer previsão artificial.

Para o projeto integrador, a recomendação é priorizar autorização, integridade e uma demonstração completa por papel; em seguida, concluir radar de risco e diagnóstico executivo. Esses diferenciais já se apoiam nas entidades existentes e nas histórias propostas. A adoção de multiempresa deve ser uma decisão explícita, pois muda praticamente todos os escopos do sistema.

## Verificações propostas para a próxima implementação

1. Matriz de testes dos cinco papéis, incluindo acesso negado por empresa, área, projeto, tarefa, comentário e anexo.
2. Cadastro público com tentativa de papel elevado e administrador tentando promover usuário acima do próprio nível.
3. Conclusão de projeto com pendências, projeto sem tarefas, tarefa cancelada e reabertura.
4. Data de vencimento na fronteira do dia em São Paulo, tarefa concluída e deduplicação de notificações.
5. Exclusão/arquivamento com comentários, anexos, notificações e atividades existentes; rollback em falha.
6. Recuperação de senha, token expirado/reutilizado, respostas sem segredos e política de revogação.
7. Banco novo criado por migrações e atualização segura de banco com dados.
8. Fluxos no navegador por papel, em desktop e celular, com teclado e falhas de API.

## Decisão de escopo a esclarecer

A entrega precisa atender uma única empresa com departamentos, ou várias empresas isoladas na mesma plataforma? Essa resposta define o modelo organizacional e a diferença real entre administrador da plataforma e administrador da empresa. As correções de autorização, exposição de tokens e regras de tarefa são necessárias em ambos os cenários.
