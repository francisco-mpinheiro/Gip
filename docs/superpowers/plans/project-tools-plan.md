# Ferramentas de projeto — plano

**Goal:** entregar as oito ferramentas autorizadas com persistência, permissões e UI nos dois temas.
**Spec:** ../specs/project-tools-contract.md
**Architecture:** schema e serviços puros; controller e router próprios; painel de oito abas no projeto e solicitações agregadas na Equipe.
**Tech:** React, Express, Prisma, PostgreSQL, bibliotecas existentes.

## Global Constraints

Preservar rotas, controles atuais e temas. Sem dependências novas, dados falsos persistidos, notificações externas ou reset do banco. Novos endpoints sempre autenticados e autorizados pelo recurso.

## Tarefas

- [x] Root: criar schema/migração aditiva; testar funções puras de saúde/grafo antes da implementação; aplicar migração e gerar Prisma.
- [x] API: implementar contrato, validação/transações/auditoria e integração das regras de tarefas; testes de acesso, ciclo e revisão.
- [x] Interface: implementar painéis/formulários/estados e integração; testes de renderização e validação essenciais.
- [x] Root: testes HTTP completos com fixtures temporárias removidas, build, navegador nos dois temas, revisão independente e correções necessárias.

## Review Focus

Recursos externos ao projeto, ciclos, contagens sem duplicação, conclusão via endpoint antigo contornando revisão, simulação mutando dados, destinatários de departamento fora da equipe e erros/estado vazio no frontend.

## Verificação e revisão

- Migração aditiva aplicada e Prisma validado/gerado, sem reset.
- Backend completo: 32 testes passaram, incluindo HTTP real com fixtures removidas.
- Interface e testes unitários: 36 testes passaram; build final compilou com sucesso.
- Navegador: 32 combinações de abas/tema/viewport sem overflow, criação de impedimento, check-in, memória e pedido departamental persistidos em fixtures; simulação sem alteração de tarefas.
- Revisão independente encontrou três regressões de integração: vazio com prazo, feedback de status bloqueado e simulação obsoleta. Todas foram reproduzidas e corrigidas com testes.
- Ajuste de usabilidade: atalhos da saúde mostram os problemas correspondentes; avisos de bloqueio expiram após leitura e respeitam viewport.
