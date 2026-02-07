---
id: 32
title: "Criar schema do banco de dados para sistema de convites"
status: completed
priority: critical
feature: Sistema de Convite de Usuários
dependencies: []
assigned_agent: null
created_at: "2026-02-03T19:04:38Z"
started_at: "2026-02-03T19:07:27Z"
completed_at: "2026-02-03T19:08:22Z"
error_log: null
---

## Description

Criar tabela ou campos na tabela users para armazenar tokens de convite, datas de expiração e status

## Details

- Adicionar campos na tabela `users` ou criar tabela `user_invites`:
  - `invite_token` (TEXT, NULLABLE): Token UUID único para o convite
  - `invite_created_at` (TIMESTAMP, NULLABLE): Data de criação do convite
  - `invite_expires_at` (TIMESTAMP, NULLABLE): Data de expiração do convite (7 dias após criação)
  - `invite_status` (ENUM ou TEXT, DEFAULT 'pending'): Status do convite ('pending', 'accepted', 'expired', 'cancelled')
  - `invite_accepted_at` (TIMESTAMP, NULLABLE): Data de aceitação do convite
- Criar índice único em `invite_token` para busca rápida
- Adicionar campo `account_status` (ENUM: 'active', 'pending_activation', 'inactive') se não existir
- Implementar políticas RLS para proteger acesso aos dados de convite
- Criar arquivo SQL em `src/lib/` para aplicar o schema
- Documentar estrutura e decisões de design

## Test Strategy

- Executar script SQL no Supabase e verificar criação dos campos
- Testar inserção de registro com todos os campos de convite
- Verificar índices criados corretamente
- Testar políticas RLS para garantir que apenas admins acessam dados de convite
- Confirmar que campos nullable funcionam corretamente
