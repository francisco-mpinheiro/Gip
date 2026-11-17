# Evolução visual — plano de implementação

**Objetivo:** aplicar a direção grafite e azul autorizada, mantendo temas, rotas, posições e funcionamento.
**Spec:** `docs/superpowers/specs/2026-11-16-identidade-visual-design.md`.
**Execução:** nesta sessão, no checkout atual, sem novas dependências.

- [x] Atualizar tokens e acabamento de componentes em `frontend/src/styles/global.css`, preservando layout e breakpoints.
- [x] Vincular cores de apresentação do login ao tema em `frontend/src/pages/LoginPage.js`, sem mudar JSX, handlers ou fluxos.
- [x] Compilar para diretório temporário e inspecionar páginas, modais e gráficos nos dois temas e em viewport móvel, usando fixtures sem banco.
- [x] Revisar diff e registrar evidências. Não criar testes que apenas espelhem CSS; usar build, inspeção visual e verificação de que as alterações não mudam a lógica.

Foco de revisão: contraste em textos pequenos, preenchimento de botões azuis, legibilidade no tema claro, overflow em telas estreitas e preservação dos componentes e dados dos gráficos.

## Verificação realizada

- Build de produção concluído em `/tmp/gip-review/modern-build`; avisos existentes de Browserslist e `fs.F_OK` nas ferramentas.
- 18 carregamentos (nove telas internas × dois temas), sem exceções JavaScript nem overflow horizontal da página. Login inspecionado nos dois temas; Dashboard também em 390 × 844.
- Filtro textual de tarefas, alternância Lista/Kanban, abertura e fechamento de modais de projeto/tarefa, troca de tema e controle de tamanho de fonte exercitados com API simulada. Nenhum acesso ao banco e nenhum teste de persistência real.
- Mesmas quantidades de botões e gráficos nas 18 comparações com a versão anterior. JSX e lógica do login intactos; alterações do drawer restritas ao CSS de fundo. Breakpoints existentes comparados e preservados.
- Contraste dos tokens de texto secundário, texto discreto, links e botão primário conferido nas combinações base: todos acima de 4,5:1. Isso não constitui auditoria completa de acessibilidade.
- Revisão independente encontrou o risco de fixar o texto herdado em pixels; corrigido para `rem` e validado pelo aumento real da fonte no navegador. Nenhum outro achado importante reportado.
- `git diff --check` sem erros. Não houve alteração de backend, rotas, handlers, séries ou cálculos de gráficos.
