---
id: 28
title: "Criar página de acesso negado (403)"
status: completed
priority: medium
feature: Sistema de Hierarquia de Usuários
dependencies:
  - 25
assigned_agent: null
created_at: "2026-02-03T18:31:36Z"
started_at: "2026-02-03T18:38:09Z"
completed_at: "2026-02-03T18:46:52Z"
error_log: null
---

## Description

Implementar página personalizada de erro 403 com feedback amigável para usuários que tentarem acessar páginas restritas.

## Details

- Criar página em `src/app/acesso-negado/page.tsx`
- Usar layout consistente com o resto da aplicação
- Conteúdo da página:
  - Ícone de cadeado ou shield (usar lucide-react)
  - Título: "Acesso Negado"
  - Mensagem clara: "Você não tem permissão para acessar esta página."
  - Sub-mensagem: "Entre em contato com o administrador se precisar de acesso."
  - Botão "Voltar ao Dashboard" que redireciona para /dashboard
  - Botão secundário "Voltar" que usa router.back()
- Estilização:
  - Centralizar conteúdo vertical e horizontalmente
  - Usar cores do tema (tons de cinza e azul)
  - Ícone grande (64-80px)
  - Textos legíveis com hierarquia clara
  - Botões com estados hover e active
- Adicionar meta tags para SEO
- Página deve ser acessível (boas práticas de a11y)

## Test Strategy

- Acessar `/acesso-negado` diretamente e verificar renderização
- Verificar que layout é consistente com outras páginas
- Testar botão "Voltar ao Dashboard" (deve ir para /dashboard)
- Testar botão "Voltar" (deve usar histórico do navegador)
- Verificar responsividade em desktop, tablet e mobile
- Testar acessibilidade com leitor de tela
- Confirmar que não há erros no console
