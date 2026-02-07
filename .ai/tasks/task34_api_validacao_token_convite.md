---
id: 34
title: "Implementar API route para validação e consumo de token"
status: completed
priority: critical
feature: Sistema de Convite de Usuários
dependencies:
  - 32
assigned_agent: null
created_at: "2026-02-03T19:04:38Z"
started_at: "2026-02-03T19:09:16Z"
completed_at: "2026-02-03T19:09:56Z"
error_log: null
---

## Description

Criar endpoint que valida token, verifica expiração e permite definição de senha

## Details

- Criar arquivo `src/app/api/users/validate-invite/route.ts` (GET)
- Endpoint GET recebe `token` como query parameter
- Buscar usuário por `invite_token` no Supabase
- Validar token:
  - Se não encontrado: retornar `{ valid: false, reason: 'invalid_token' }`
  - Se `invite_status !== 'pending'`: retornar `{ valid: false, reason: 'already_used' }`
  - Se `invite_expires_at < now()`: retornar `{ valid: false, reason: 'expired' }`
- Se válido: retornar `{ valid: true, user: { name, email, telefone } }`
- Criar arquivo `src/app/api/users/activate-account/route.ts` (POST)
- Endpoint POST recebe `{ token, password }`
- Validar token (mesma lógica acima)
- Validar senha (mínimo 8 caracteres, maiúsculas, minúsculas, números)
- Atualizar senha do usuário no Supabase Auth (`supabase.auth.admin.updateUserById`)
- Atualizar registro no banco:
  - `invite_status`: 'accepted'
  - `invite_accepted_at`: timestamp atual
  - `account_status`: 'active'
  - `ativo`: true
- Invalidar token (opcional: limpar `invite_token`)
- Retornar `{ success: true, message: 'Conta ativada com sucesso' }`
- Implementar rate limiting (max 5 tentativas por IP em 10 min)

## Test Strategy

- Testar validação com token válido, inválido, expirado e já usado
- Verificar que dados do usuário são retornados corretamente
- Testar ativação de conta com senha válida e inválida
- Confirmar que senha é salva no Supabase Auth
- Verificar atualização de status no banco
- Testar que token não pode ser reutilizado após ativação
- Validar rate limiting com múltiplas tentativas
