# Revisão visual dos temas com o sistema local

Solicitação: dar mais personalidade aos temas claro e escuro, revisar inconsistências entre telas, preservar rotas, posições dos botões e funcionalidades.

## Mudanças

- Tema claro: menu lateral azul profundo, fundo azul suave com iluminação discreta, cabeçalho claro e cards com superfícies e sombras mais definidas.
- Tema escuro: camadas de grafite com acentos discretos de azul, tratamento de superfícies e destaque semântico dos indicadores.
- Cores de status de tarefas, gráficos, desempenho, papéis e departamentos vinculadas ao tema. Corrigida a composição de transparência para cores que agora usam variáveis CSS.
- Avatares, botões sem variante, avisos, notificações, chat e tela de redefinição alinhados à identidade visual.
- Removidas referências às variáveis inexistentes `--primary` e `--bg-body`, utilizando os tokens correspondentes já existentes.
- Nenhuma API, regra de negócio, rota, consulta, cálculo, série de gráfico ou ação de botão foi alterada. Callbacks de hover da Topbar só receberam novas cores de apresentação.

## Cobertura com dados reais

Nove telas autenticadas: Dashboard, Projetos, detalhe de projeto, Tarefas, Desempenho, Equipe, Meu Perfil, Configurações e Usuários. Cada uma foi aberta em claro e escuro, em desktop 1440 × 1000 e celular 390 × 844: 36 verificações.

Também foram inspecionados login, cadastro, redefinição de senha, modais de projeto/tarefa/usuário, perfil e chat em drawer. Foram exercitados filtros, Lista/Kanban, cancelamento de modal e preferências de fonte e tema, sem submissão de dados de produto.

## Evidências e limites

- As 18 comparações de desktop preservaram textos, títulos e coordenadas de todos os botões visíveis, além da quantidade de gráficos.
- Não foi detectado overflow horizontal da página nas 36 verificações. Tabelas mantêm sua rolagem interna existente.
- Breakpoints CSS e arquivo de rotas comparados com o snapshot anterior e preservados.
- Nenhuma nova exceção JavaScript nem nova falha de API nas comparações. Há erros anteriores no histórico do chat, descritos abaixo.
- Build de produção concluído com sucesso. Permanecem avisos das ferramentas sobre Browserslist e depreciação de `fs.F_OK`.
- Revisão independente não encontrou regressões importantes nas alterações.
- Os dados locais contêm dois projetos, oito usuários e poucas tarefas; não foi criado conteúdo de demonstração nem alterado o banco. Não foram exercitadas operações destrutivas, envio de mensagens, recuperação real por e-mail ou upload de arquivos.

## Problemas anteriores encontrados, preservados fora do escopo visual

1. `GET /api/chat/u1` retorna HTTP 500 na consulta feita ao abrir o drawer. O mesmo erro ocorre antes e depois da mudança visual.
2. “Esqueceu a senha?” no login é um `span` sem handler. Existe um componente `ForgotPassword`, mas ele não é renderizado pela tela atual. A rota de redefinição de senha existe; isso não comprova o fluxo completo de recuperação.
3. A página de Configurações mantém seus toggles locais existentes; o controle efetivo de tema continua sendo o da engrenagem na Topbar. A revisão preservou esse comportamento conforme a restrição de não alterar funcionalidades.

Capturas e comparação automatizada desta sessão ficam em `/tmp/gip-live-review`. São artefatos de revisão, não uma suíte de testes instalada no projeto.
