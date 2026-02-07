---
id: 25
title: "Estender AuthContext com informações de hierarquia"
status: completed
priority: critical
feature: Sistema de Hierarquia de Usuários
dependencies:
  - 24
assigned_agent: null
created_at: "2026-02-03T18:31:36Z"
started_at: "2026-02-03T18:35:27Z"
completed_at: "2026-02-03T18:40:15Z"
error_log: null
---

## Description

Adicionar tipo de usuário ao contexto de autenticação e criar hooks de verificação de permissões para facilitar o uso em toda a aplicação.

## Details

- Atualizar `AuthContextType` para incluir:
  - `userType: TipoUsuario | null` - tipo do usuário logado
  - `userProfile: UserProfile | null` - dados completos do perfil do usuário
  - `permissions: PermissoesUsuario | null` - objeto de permissões calculadas
- Modificar `AuthProvider` para:
  - Buscar dados do usuário da tabela `users` após login bem-sucedido
  - Extrair e armazenar o campo `tipo` do usuário
  - Calcular e armazenar permissões baseadas no tipo
  - Atualizar estado quando houver mudanças no perfil
- Criar hook personalizado `usePermissions()` que retorna:
  - `canAccess(page: string): boolean` - verifica se pode acessar uma página
  - `isAdmin: boolean` - atalho para verificar se é admin
  - `isAtendente: boolean` - atalho para verificar se é atendente
  - `userType: TipoUsuario | null` - tipo do usuário atual
- Garantir que informações sejam limpas no logout
- Adicionar fallback seguro: usuários sem tipo definido são tratados como "atendente" (mais restritivo)
- Implementar cache em memória para evitar consultas repetidas ao banco

## Test Strategy

- Testar login com usuário admin e verificar que `userType` é "admin"
- Testar login com usuário atendente e verificar que `userType` é "atendente"
- Testar que `usePermissions().canAccess('/usuarios')` retorna `true` para admin e `false` para atendente
- Testar que logout limpa todas as informações de permissões
- Verificar que usuário sem tipo definido é tratado como atendente
- Testar em múltiplas abas/janelas para garantir consistência
