# Chat, recuperação de senha e informações da equipe

## Entregue

- Histórico de chat e envio Socket.io utilizam o model Message do Prisma, sem fallback para SQL de cliente desatualizado.
- Adicionada migração `20261117000000_add_messages` com tabela messages, relacionamentos de remetente/destinatário e índice da conversa. Aplicada no banco local sem reset ou exclusão de dados; cliente Prisma regenerado e API reiniciada.
- “Esqueceu a senha?” abre o formulário existente na própria rota `/login`. A rota `/reset-password` permanece a mesma. O formulário usa authAPI, mostra a resposta do servidor e trata falhas sem anunciar sucesso indevidamente.
- Tokens internos de recuperação/confirmação não são mais devolvidos nas respostas de autenticação, usuários ou perfil.
- MemberInsights compartilhado entre cards de Equipe e UserDrawer: tags de grau/curso (instituição no título), estado sem formação e badge com quantidade de tarefas ativas.
- Carga: Disponível até 2 tarefas, Moderado de 3 a 5, Sobrecarregado a partir de 6. Tarefas concluídas ou canceladas são excluídas; pendências vencidas continuam contando como trabalho ativo.
- A consulta individual de usuário passou a incluir o status das suas tarefas, para o drawer calcular a mesma carga dos cards. Os detalhes e links de certificados existentes foram preservados.

## Verificações

- Frontend: `CI=true npm test -- --watchAll=false --runInBand` — três suítes, dez testes passaram. Cobrem limites da carga, exclusão de estados terminais, formações, ausência de formação, abertura/volta da recuperação e erro de API.
- Backend: `npm test` — três testes passaram. Requer PostgreSQL configurado, schema atualizado e API local na porta 5000. Testes de chat e recuperação criam registros temporários e removem-nos ao final; a recuperação não envia e-mail real.
- Chat integrado: uma mensagem entre duas contas temporárias foi recebida por Socket.io e consultada por HTTP nos dois sentidos.
- Recuperação: geração e validade do token, troca de senha e recusa de reutilização verificadas com conta temporária.
- Navegador local: histórico HTTP 200, tags e carga nos cards/drawer, ambos os temas, viewport móvel sem overflow e abertura/retorno da recuperação sem alterar rota. A carga alta e formação foram simuladas somente no navegador para inspeção; não foram adicionadas ao banco do usuário.
- Build de produção concluído. Revisão independente sem achados importantes.

## Ambiente de e-mail

O ambiente local não tem SMTP configurado. Com NODE_ENV=development, o backend registra o link no terminal da API. Para envio real é necessário configurar SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e, conforme o provedor, SMTP_SECURE e EMAIL_FROM. O formulário mantém resposta neutra para não revelar se um endereço está cadastrado.

A migração de mensagens resolve a estrutura ausente do chat. Não reconcilia as outras divergências antigas entre o histórico de migrações e o schema completo, descritas na análise geral.
