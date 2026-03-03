---
id: 42
title: "Definir RBAC de Super Adm para painel global"
status: completed
priority: critical
feature: Painel Administrativo Global
dependencies: []
assigned_agent: null
created_at: "2026-03-03T21:27:43Z"
started_at: "2026-03-03T21:27:43Z"
completed_at: "2026-03-03T21:27:43Z"
error_log: null
---

## Description

Atualizar tipos e permissões para suportar role admin_geral com acesso a /admin.

## Details

- Estender `TipoUsuario` para incluir `admin_geral`.
- Adicionar permissões completas para `admin_geral` com rota `/admin`.
- Ajustar normalização de roles (`role` e `roles`) para reconhecer `admin_geral`.
- Atualizar ordem de prioridade e guards de verificação de administração.

## Test Strategy

- Validar build/type-check sem erros de tipo relacionados ao novo role.
- Validar que `canAccess("/admin")` retorna `true` para `admin_geral` e `false` para demais perfis.
