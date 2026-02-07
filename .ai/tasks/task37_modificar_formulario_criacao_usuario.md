---
id: 37
title: "Modificar formulário de criação de usuário para gerar convite"
status: completed
priority: critical
feature: Sistema de Convite de Usuários
dependencies:
  - 33
assigned_agent: null
created_at: "2026-02-03T19:04:38Z"
started_at: "2026-02-03T19:13:55Z"
completed_at: "2026-02-03T19:15:16Z"
error_log: null
---

## Description

Remover campo senha, integrar geração de token e exibir feedback ao admin

## Details

- Modificar `src/app/usuarios/page.tsx`:
  - Remover campo senha do formulário de criação
  - Remover validação de senha do schema Zod
  - Atualizar função `handleSubmitUser` (modo criação):
    - Criar usuário no Supabase Auth SEM senha (usar `supabase.auth.admin.createUser` com `email_confirm: false`)
    - Criar registro na tabela `users` com `account_status: 'pending_activation'`, `ativo: false`
    - Chamar API `/api/users/generate-invite` com `userId`
    - Armazenar `inviteUrl` retornada
    - Fechar dialog de criação
    - Abrir modal de convite gerado (passar URL)
- Adicionar estado `inviteUrl` e `showInviteModal`
- Manter funcionalidade de edição de usuário existente (sem mudanças)
- Adicionar feedback visual durante processo (loading, toasts)
- Tratamento de erros em cada etapa

## Test Strategy

- Verificar que formulário não exibe campo senha
- Criar novo usuário e confirmar que convite é gerado
- Verificar que usuário é criado no Auth e no banco
- Confirmar que modal de convite abre automaticamente
- Testar casos de erro (falha na criação, falha na geração de token)
- Verificar que edição de usuário existente não é afetada
- Testar que usuário criado está com status "pending_activation"
