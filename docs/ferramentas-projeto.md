# Oito ferramentas de projeto — primeira versão funcional

## Onde usar

Abra Projetos, entre em um projeto e role até **Ferramentas do projeto**, abaixo do Kanban. As rotas e os controles anteriores foram preservados. Na tela **Equipe**, o painel **Pedidos entre departamentos** reúne as solicitações pertinentes ao usuário/departamento; administradores têm visão global.

## Ferramentas entregues

1. **Saúde:** classificação Saudável/Atenção/Crítico com motivos e indicadores calculados das tarefas, impedimentos, revisões e dependências. Detalhes de vencidas/sem responsável mostram tarefas afetadas. Bloqueios levam à aba correspondente.
2. **Impedimentos:** membros registram motivo/impacto e podem relacionar uma tarefa. Autor ou gestor registra a resolução. Um impedimento aberto vinculado à tarefa impede sua conclusão.
3. **Dependências:** gestor define predecessoras, consulta a sequência e remove vínculos. Tarefas de projetos diferentes, autorreferências e ciclos são recusados. Concluir uma predecessora gera notificação interna para o responsável da dependente.
4. **Revisões:** responsável ou gestor envia resumo/evidências; gestor aprova ou devolve com feedback. Aprovação conclui a tarefa e recalcula o projeto; solicitação de ajustes reabre a execução. Uma revisão pendente por tarefa, garantida também no banco. Histórico preservado.
5. **Simulador:** gestor experimenta redistribuições e compara cargas antes/depois. Considera a quantidade global de tarefas ativas dos membros, sem revelar tarefas privadas de outros projetos. Não altera responsáveis ou prazos. Mudanças no snapshot invalidam os resultados antigos.
6. **Check-in:** membro registra o que concluiu, próximo passo e necessidade de ajuda. Salvar novamente atualiza seu registro do dia, no calendário de São Paulo. O gestor consulta os registros da equipe por projeto.
7. **Memória:** registros de decisões, mudanças de escopo e lições aprendidas com autor/data, consultáveis e filtráveis por tipo.
8. **Departamentos:** pedido com origem obtida do usuário autenticado, destino existente, descrição e prioridade. Autor, gestor ou departamento destinatário podem registrar resolução. Destinatário pode resolver pelo painel global sem ganhar acesso às tarefas do projeto.

## Permissões e integridade

Novas APIs exigem autenticação e vínculo com o recurso. Admins, gerente responsável e gestor de área em projeto ligado ao próprio departamento têm gestão. Gerente que apenas participa de projeto de outro gerente não recebe gestão nesse projeto. Membros usam os fluxos de colaboração e enviam suas entregas.

As rotas anteriores de criação/atualização/status das tarefas foram integradas às regras de conclusão; não é possível contornar bloqueio, dependência ou revisão usando diretamente o Kanban ou o seletor de status. Bloqueios retornam mensagem visível na interface.

Mutações relacionadas usam transação serializável e lock por projeto, com auditoria e retry de conflitos. A simulação é somente leitura. O check-in identifica autor e dia no servidor. Respostas de usuários nas novas APIs selecionam somente campos públicos.

## Limites da primeira versão

- Simulação por quantidade de tarefas, sem estimativa de duração ou previsão de término.
- Memória permite registro e consulta; edição/exclusão não fazem parte desta versão.
- A saúde usa regras explícitas, sem modelo externo de IA.
- Novas tabelas são aditivas; nenhuma tabela ou dado existente foi resetado. O índice SQL parcial limita revisões pendentes. O histórico antigo de migrações ainda tem as divergências descritas na análise geral; esta entrega não é uma reconciliação de todo o banco.
- As validações de autorização descritas aqui cobrem as novas ferramentas e as rotas de mutação de tarefas integradas. As outras lacunas antigas da análise geral continuam sendo trabalho separado.

## Verificação

- Backend: 32 testes passaram, incluindo um cenário HTTP com persistência de todos os recursos, negativas de acesso, ciclo, revisão/ajustes/aprovação, bypass de conclusão, check-in idempotente, simulação sem alteração e destinatário externo ao projeto.
- Frontend: 36 testes passaram na suíte completa; cobre formulários, permissões, snapshot de simulação, atalhos de saúde e erros dos controles antigos de status.
- Navegador: 32 combinações de aba/tema/viewport sem overflow; criação de impedimento, check-in, memória e pedido persistida, simulação não persistente e mensagem de bloqueio após tentativa no Kanban.
- Testes de integração criam usuários/projetos temporários e removem os registros no final. Nenhuma mensagem/e-mail externo foi enviado e nenhum conteúdo fictício foi mantido no banco do usuário.
- Revisão independente com correções verificadas de saúde vazia, mensagens de bloqueio e simulação obsoleta.

Executar frontend com `CI=true npm test -- --watchAll=false --runInBand` em frontend; backend com `npm test` em backend, com banco e API locais em execução. Build pode ser gerado sem alterar o diretório versionado: `BUILD_PATH=/tmp/gip-tools/final-build npm run build` em frontend.
