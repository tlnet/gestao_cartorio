---
id: 27
title: "Implementar controle de visibilidade na sidebar"
status: completed
priority: high
feature: Sistema de Hierarquia de Usuários
dependencies:
  - 25
assigned_agent: null
created_at: "2026-02-03T18:31:36Z"
started_at: "2026-02-03T18:37:13Z"
completed_at: "2026-02-03T18:44:20Z"
error_log: null
---

## Description

Ocultar itens de menu "Usuários" e "Configurações" para atendentes, exibindo apenas funcionalidades acessíveis ao tipo de usuário logado.

## Details

- Atualizar componente `Sidebar` em `src/components/layout/sidebar.tsx`
- Usar hook `usePermissions()` para verificar tipo de usuário
- Criar função helper `shouldShowMenuItem(itemPath: string): boolean` que:
  - Verifica se o usuário tem permissão para acessar a rota
  - Retorna true/false para exibir/ocultar o item
- Aplicar filtro condicional nos itens de menu:
  - Para tipo "atendente": ocultar itens com path `/usuarios` e `/configuracoes`
  - Para tipo "admin": exibir todos os itens
- Garantir que estrutura de navegação permaneça consistente
- Manter ícones e estilos dos itens visíveis inalterados
- (Opcional) Adicionar tooltip explicativo em itens que poderiam estar visíveis mas estão ocultos
- Testar responsividade em mobile e desktop

## Test Strategy

- Login como admin e verificar que todos os itens aparecem na sidebar
- Login como atendente e verificar que "Usuários" e "Configurações" não aparecem
- Verificar que navegação para outras páginas funciona normalmente
- Testar em desktop e mobile
- Verificar que não há quebras de layout após filtrar itens
- Confirmar que contagem de itens está correta em diferentes resoluções
