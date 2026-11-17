# Evolução visual do GIP

Direção autorizada pelo usuário: grafite e azul, mantendo temas escuro e claro. Prioridade para legibilidade e acabamento do tema escuro.

## Escopo e restrições

Evoluir cores, tipografia, bordas, sombras, estados de interação, formulários, botões e acabamento dos gráficos. Preservar rotas, hierarquia e ordem das telas, posição dos controles, handlers, dados, regras, permissões e tipos de gráfico. Manter os breakpoints e os mecanismos existentes de tema e tamanho de fonte. Nenhuma mudança de backend.

## Abordagem

Adotar tokens no CSS existente, com superfícies grafite neutras, texto em três níveis legíveis e azul nas ações. Tema claro com superfícies brancas sobre cinza suave. Usar Inter com fallback de sistema, pesos reais de 400 a 800 e números tabulares nos indicadores. Manter as dimensões estruturais; refinar o acabamento dos controles sem reorganizar elementos.

Alternativas consideradas: ajustes pequenos de cores manteriam a inconsistência entre componentes; reconstrução de layouts conflitaria com a preservação de posições. A evolução dos estilos compartilhados atende a direção escolhida sem reescrever os fluxos.

Login conserva seus dois painéis e os controles atuais, com cores vinculadas ao tema no formulário e painel institucional grafite. Formulários e status preservam significados semânticos. Gráficos preservam séries, consultas, dimensões e interações.

## Validação

Build de produção; revisão do diff garantindo somente mudanças de apresentação; inspeção visual desktop e móvel dos temas com dados fictícios, sem usar o banco; conferir navegação, botões, modais, filtros e gráficos existentes. Registrar limites da verificação, se houver.

## Refinamento após teste do usuário

O usuário solicitou mais personalidade em ambos os temas e considerou o claro excessivamente branco. A direção de refinamento é menu azul profundo no claro, canvas azul suave, cards claros com profundidade, acentos semânticos nos indicadores e camadas discretas de grafite no escuro. As restrições originais permanecem: sem mudanças de rotas, posições dos controles ou funcionamento. A revisão seguinte utiliza o sistema local com dados reais, sem gravar alterações.
