---
id: 33
title: "Implementar API route para geração de token de convite"
status: completed
priority: critical
feature: Sistema de Convite de Usuários
dependencies:
  - 32
assigned_agent: null
created_at: "2026-02-03T19:04:38Z"
started_at: "2026-02-03T19:08:37Z"
completed_at: "2026-02-03T19:09:02Z"
error_log: null
---

## Description

Criar endpoint que gera token único (UUID), define prazo de validade e retorna URL completa

## Details

- Criar arquivo `src/app/api/users/generate-invite/route.ts`
- Endpoint deve ser POST e receber `userId` no body
- Validar que usuário requisitante é admin (usar `requireAdmin` helper)
- Gerar token UUID v4 usando `crypto.randomUUID()`
- Definir data de expiração: 7 dias a partir de agora
- Atualizar registro do usuário no Supabase com:
  - `invite_token`: novo token
  - `invite_created_at`: timestamp atual
  - `invite_expires_at`: timestamp + 7 dias
  - `invite_status`: 'pending'
  - `account_status`: 'pending_activation'
- Construir URL completa: `${process.env.NEXT_PUBLIC_APP_URL}/ativar-conta?token=${token}`
- Retornar JSON: `{ success: true, inviteUrl, expiresAt }`
- Implementar tratamento de erros robusto
- Logar geração de convites para auditoria

## Test Strategy

- Testar endpoint via Postman/Thunder Client
- Verificar que apenas admins conseguem acessar
- Confirmar que token UUID é único a cada chamada
- Verificar que data de expiração está correta (7 dias)
- Testar atualização do usuário no banco
- Validar formato da URL retornada
- Testar casos de erro (usuário não encontrado, permissão negada)
