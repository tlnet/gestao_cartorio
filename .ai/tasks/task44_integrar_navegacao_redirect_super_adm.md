---
id: 44
title: "Integrar navegação e redirecionamentos para Super Adm"
status: completed
priority: high
feature: Painel Administrativo Global
dependencies:
  - 42
  - 43
assigned_agent: null
created_at: "2026-03-03T21:27:43Z"
started_at: "2026-03-03T21:27:43Z"
completed_at: "2026-03-03T21:27:43Z"
error_log: null
---

## Description

Exibir item de menu /admin e ajustar login/registro para redirecionar admin_geral.

## Details

- Incluir item "Administração Geral" na sidebar com controle por permissões.
- Ajustar labels e cores para badge `admin_geral`.
- Atualizar redirecionamento padrão em login e registro para `/admin` quando o role incluir `admin_geral`.
- Ajustar fallback de redirecionamento no layout principal.

## Test Strategy

- Login com `admin_geral` deve abrir `/admin`.
- Login com perfis legados deve manter fluxo anterior (`/dashboard` ou `/contas`).
- Sidebar deve mostrar opção de Administração Geral apenas para perfil autorizado.
