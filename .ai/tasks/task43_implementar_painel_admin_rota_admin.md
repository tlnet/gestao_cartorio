---
id: 43
title: "Implementar rota /admin com identidade visual existente"
status: completed
priority: high
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

Construir painel com cards, tabelas e modal de cartórios reutilizando MainLayout e componentes atuais.

## Details

- Criar página `src/app/admin/page.tsx`.
- Proteger rota com `RequirePermission requiredRole="admin_geral"`.
- Implementar visão global com:
  - KPIs de cartórios e usuários.
  - Tabela de cartórios com busca e edição em modal.
  - Tabela de usuários com roles e ativação/inativação.
- Manter consistência visual com componentes shadcn já usados no sistema.

## Test Strategy

- Acessar `/admin` com usuário `admin_geral` e validar renderização completa.
- Tentar acessar `/admin` com usuário sem `admin_geral` e validar bloqueio.
- Validar criação/edição de cartório e troca de status de usuário.
