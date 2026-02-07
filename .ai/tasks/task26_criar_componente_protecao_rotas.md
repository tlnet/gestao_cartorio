---
id: 26
title: "Criar componente de proteção de rotas"
status: completed
priority: critical
feature: Sistema de Hierarquia de Usuários
dependencies:
  - 25
assigned_agent: null
created_at: "2026-02-03T18:31:36Z"
started_at: "2026-02-03T18:36:35Z"
completed_at: "2026-02-03T18:42:08Z"
error_log: null
---

## Description

Implementar componente que verifica permissões antes de renderizar páginas, redirecionando ou exibindo erro para usuários sem autorização.

## Details

- Criar componente `RequirePermission` em `src/components/auth/require-permission.tsx`
- Props do componente:
  - `requiredRole?: TipoUsuario | TipoUsuario[]` - tipo(s) de usuário necessário(s)
  - `requiredPage?: string` - nome da página/rota que requer permissão
  - `fallback?: React.ReactNode` - componente a exibir se não tiver permissão
  - `redirectTo?: string` - rota para redirecionar se não tiver permissão (padrão: /acesso-negado)
  - `children: React.ReactNode` - conteúdo protegido
- Lógica do componente:
  - Usar `useAuth()` e `usePermissions()` para verificar permissões
  - Exibir loading enquanto verifica autenticação
  - Se não autenticado, redirecionar para /login
  - Se autenticado mas sem permissão:
    - Se `fallback` fornecido, exibir fallback
    - Caso contrário, redirecionar para `redirectTo`
  - Se tiver permissão, renderizar `children`
- Adicionar logs para debug (remover em produção)
- Garantir que verificação seja feita no cliente e no servidor (quando aplicável)

## Test Strategy

- Testar componente com usuário admin acessando página restrita (deve permitir)
- Testar componente com usuário atendente acessando página restrita (deve bloquear)
- Testar componente sem usuário autenticado (deve redirecionar para login)
- Testar prop `fallback` personalizado
- Testar prop `redirectTo` personalizado
- Verificar que não há flash de conteúdo protegido antes do bloqueio
