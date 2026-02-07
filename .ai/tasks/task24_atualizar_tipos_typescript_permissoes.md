---
id: 24
title: "Atualizar tipos TypeScript e interfaces de permissões"
status: completed
priority: high
feature: Sistema de Hierarquia de Usuários
dependencies: []
assigned_agent: null
created_at: "2026-02-03T18:31:36Z"
started_at: "2026-02-03T18:34:46Z"
completed_at: "2026-02-03T18:37:12Z"
error_log: null
---

## Description

Atualizar tipos de usuário e criar interfaces para verificação de permissões no sistema. Esta tarefa estabelece a base TypeScript para o sistema de hierarquia.

## Details

- Atualizar interface `Usuario` em `src/types/index.ts` para garantir que o campo `tipo` aceite apenas "admin" ou "atendente"
- Remover tipo "supervisor" se não for mais utilizado, ou manter como tipo legacy
- Criar type helper `TipoUsuario` para facilitar reutilização
- Criar interface `PermissoesUsuario` que define quais páginas/funcionalidades cada tipo pode acessar
- Criar type guards para verificação de tipos de usuário (ex: `isAdmin`, `isAtendente`)
- Criar constante de mapeamento de permissões por tipo de usuário
- Definir enums ou types para nomes de páginas/rotas protegidas
- Documentar cada tipo e interface com comentários JSDoc

## Test Strategy

- Compilar projeto TypeScript sem erros
- Verificar que autocomplete funciona corretamente em IDEs
- Confirmar que tipos antigos ainda são compatíveis (se necessário para migração gradual)
- Revisar todos os usos da interface `Usuario` no projeto para garantir compatibilidade
