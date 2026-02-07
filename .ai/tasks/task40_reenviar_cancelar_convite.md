---
id: 40
title: "Implementar funcionalidades de reenviar e cancelar convite"
status: completed
priority: medium
feature: Sistema de Convite de Usuários
dependencies:
  - 33
  - 39
assigned_agent: null
created_at: "2026-02-03T19:04:38Z"
started_at: "2026-02-03T19:15:36Z"
completed_at: "2026-02-03T19:16:42Z"
error_log: null
---

## Description

Criar lógica para invalidar token anterior, gerar novo e remover/cancelar convite

## Details

- Implementar função "Reenviar Convite":
  - Criar modal de confirmação: "Deseja reenviar o convite? O link anterior será invalidado."
  - Ao confirmar:
    - Invalidar token anterior (atualizar `invite_status: 'cancelled'` no banco)
    - Chamar API `/api/users/generate-invite` para gerar novo token
    - Exibir modal de convite gerado com novo link
    - Toast de sucesso: "Convite reenviado com sucesso!"
  - Tratamento de erros
- Implementar função "Cancelar Convite":
  - Criar modal de confirmação: "Tem certeza que deseja cancelar este convite? Esta ação não pode ser desfeita."
  - Opções: "Cancelar Convite e Manter Usuário" ou "Cancelar Convite e Remover Usuário"
  - Ao confirmar:
    - Invalidar token (`invite_status: 'cancelled'`)
    - Se "Manter": atualizar `account_status: 'inactive'`, `ativo: false`
    - Se "Remover": deletar usuário do banco e do Auth
    - Atualizar listagem de usuários
    - Toast de sucesso: "Convite cancelado."
  - Tratamento de erros
- Adicionar validações de permissão (apenas admin)
- Logar ações de reenvio e cancelamento para auditoria

## Test Strategy

- Testar reenvio de convite e verificar que novo link é gerado
- Confirmar que token anterior é invalidado
- Testar cancelamento com opção "Manter Usuário"
- Testar cancelamento com opção "Remover Usuário"
- Verificar que modal de confirmação aparece em ambas as ações
- Validar que apenas admins podem executar essas ações
- Testar casos de erro e validar mensagens
- Confirmar que listagem é atualizada após cada ação
