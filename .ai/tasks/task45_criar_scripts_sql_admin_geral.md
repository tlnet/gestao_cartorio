---
id: 45
title: "Criar scripts SQL de banco para admin_geral"
status: completed
priority: critical
feature: Painel Administrativo Global
dependencies:
  - 42
assigned_agent: null
created_at: "2026-03-03T21:27:43Z"
started_at: "2026-03-03T21:27:43Z"
completed_at: "2026-03-03T21:27:43Z"
error_log: null
---

## Description

Gerar scripts para constraints de role, políticas RLS globais e bootstrap de Super Adm.

## Details

- Criar `src/lib/add-admin-geral-role.sql`.
- Criar `src/lib/setup-admin-geral-rls.sql`.
- Criar `src/lib/create-super-admin-user.sql`.
- Garantir que scripts sejam idempotentes e com comentários de execução.

## Test Strategy

- Executar scripts em ambiente de homologação.
- Validar constraints sem conflito com dados existentes.
- Validar acesso global com usuário `admin_geral`.
