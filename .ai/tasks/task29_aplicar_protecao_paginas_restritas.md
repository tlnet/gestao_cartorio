---
id: 29
title: "Aplicar proteção de rotas nas páginas restritas"
status: completed
priority: critical
feature: Sistema de Hierarquia de Usuários
dependencies:
  - 26
  - 28
assigned_agent: null
created_at: "2026-02-03T18:31:36Z"
started_at: "2026-02-03T18:38:41Z"
completed_at: "2026-02-03T18:50:33Z"
error_log: null
---

## Description

Proteger páginas /usuarios e /configuracoes com componente de permissões, garantindo que apenas administradores possam acessá-las.

## Details

- Atualizar `src/app/usuarios/page.tsx`:
  - Envolver conteúdo com componente `RequirePermission`
  - Definir `requiredRole="admin"`
  - Definir `redirectTo="/acesso-negado"`
  - Manter toda funcionalidade existente intacta
- Atualizar `src/app/configuracoes/page.tsx`:
  - Envolver conteúdo com componente `RequirePermission`
  - Definir `requiredRole="admin"`
  - Definir `redirectTo="/acesso-negado"`
  - Manter toda funcionalidade existente intacta
- Garantir que proteção acontece antes de carregar dados pesados
- Adicionar loading state durante verificação de permissões
- Testar que não há race conditions entre verificação de auth e carregamento de dados
- Considerar adicionar proteção também em nível de middleware (Next.js) para SSR

## Test Strategy

- Como admin:
  - Acessar /usuarios diretamente - deve carregar normalmente
  - Acessar /configuracoes diretamente - deve carregar normalmente
  - Clicar em links da sidebar - deve funcionar normalmente
- Como atendente:
  - Tentar acessar /usuarios via URL - deve redirecionar para /acesso-negado
  - Tentar acessar /configuracoes via URL - deve redirecionar para /acesso-negado
  - Verificar que itens não aparecem na sidebar (da tarefa 27)
- Sem autenticação:
  - Tentar acessar /usuarios - deve redirecionar para /login
  - Tentar acessar /configuracoes - deve redirecionar para /login
- Verificar logs no console para debug
- Confirmar que não há flash de conteúdo antes do redirecionamento
