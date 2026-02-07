---
id: 30
title: "Implementar validação de permissões nas API routes"
status: completed
priority: high
feature: Sistema de Hierarquia de Usuários
dependencies:
  - 25
assigned_agent: null
created_at: "2026-02-03T18:31:36Z"
started_at: "2026-02-03T18:39:44Z"
completed_at: "2026-02-03T18:52:30Z"
error_log: null
---

## Description

Adicionar verificação de tipo de usuário nas rotas de API sensíveis para garantir segurança no backend, mesmo se frontend for comprometido.

## Details

- Criar helper function `getAuthenticatedUser()` em `src/lib/auth-helpers.ts`:
  - Recebe `request: NextRequest`
  - Verifica token de autenticação do Supabase
  - Busca dados do usuário incluindo tipo
  - Retorna `{ user, userType, profile }` ou `null` se não autenticado
- Criar helper function `requireAdmin()` em `src/lib/auth-helpers.ts`:
  - Usa `getAuthenticatedUser()`
  - Se não autenticado ou não é admin, retorna `NextResponse.json({ error: 'Forbidden' }, { status: 403 })`
  - Caso contrário, retorna dados do usuário
- Identificar API routes que devem ser protegidas:
  - Rotas de gerenciamento de usuários (se existirem)
  - Rotas de modificação de configurações
  - Outras rotas administrativas
- Aplicar verificação no início de cada rota protegida:
  ```typescript
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Retorna erro 403
  }
  // Continuar com lógica da rota
  ```
- Adicionar logs de tentativas de acesso não autorizado
- Garantir que respostas de erro sejam consistentes

## Test Strategy

- Criar testes de integração para API routes protegidas:
  - Requisição sem autenticação - deve retornar 401 ou 403
  - Requisição com usuário atendente - deve retornar 403
  - Requisição com usuário admin - deve processar normalmente
- Testar com token inválido ou expirado
- Verificar que logs de segurança são gerados
- Confirmar que mensagens de erro não expõem informações sensíveis
- Usar ferramenta como Postman ou curl para testar diretamente
