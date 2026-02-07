---
id: 39
title: "Atualizar listagem de usuários com status de convite"
status: completed
priority: medium
feature: Sistema de Convite de Usuários
dependencies:
  - 32
  - 37
assigned_agent: null
created_at: "2026-02-03T19:04:38Z"
started_at: "2026-02-03T19:15:36Z"
completed_at: "2026-02-03T19:16:42Z"
error_log: null
---

## Description

Adicionar badge de status, filtro para convites pendentes e ações de gerenciamento

## Details

- Modificar `src/app/usuarios/page.tsx`:
  - Atualizar query de usuários para incluir campos de convite
  - Na coluna "Status", adicionar badge adicional baseado em `account_status`:
    - "Aguardando Ativação" (amarelo/warning) se `pending_activation`
    - "Ativo" (verde) se `active`
    - "Inativo" (cinza) se `inactive`
  - Adicionar filtro dropdown "Status de Convite":
    - Opções: "Todos", "Aguardando Ativação", "Ativos"
    - Filtrar lista de usuários com base na seleção
  - Para usuários com `account_status === 'pending_activation'`:
    - Exibir data de criação do convite (opcional)
    - Adicionar botões de ação:
      - "Reenviar Convite" (ícone de refresh)
      - "Cancelar Convite" (ícone de X)
  - Atualizar cards de estatísticas no topo:
    - Adicionar card "Convites Pendentes" com contador
- Atualizar contadores de usuários por tipo para considerar apenas ativos
- Design consistente com UI existente

## Test Strategy

- Verificar que badges de status aparecem corretamente
- Testar filtro de status de convite
- Confirmar que usuários pendentes exibem botões de ação
- Verificar que estatísticas refletem contadores corretos
- Testar responsividade da listagem atualizada
- Validar que design está consistente com padrão do sistema
