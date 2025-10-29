---
id: 4
title: "Integrar página CNIB no menu sidebar"
status: completed
priority: high
feature: CNIB - Consulta de Indisponibilidade
dependencies:
  - 1
assigned_agent: Auto
created_at: "2025-10-29T08:14:12Z"
started_at: "2025-10-29T08:23:41Z"
completed_at: "2025-10-29T08:24:30Z"
error_log: null
---

## Description

Adicionar item de menu "CNIB" no sidebar para facilitar acesso à página de consultas.

## Details

- Adicionar novo item no array `menuItems` do componente Sidebar
- Escolher ícone apropriado do lucide-react (sugestão: Search, FileSearch, Shield, ou similar)
- Configurar href para `/cnib`
- Definir roles permitidos (admin, supervisor, atendente - todos devem ter acesso)
- Garantir que item aparece no menu para todos os tipos de usuário
- Verificar que estilo e comportamento seguem padrão dos outros itens do menu
- Testar navegação e estado ativo quando na página CNIB

## Test Strategy

- Verificar que item "CNIB" aparece no menu sidebar
- Confirmar que item está visível para admin, supervisor e atendente
- Testar navegação ao clicar no item
- Verificar que item fica destacado quando na página CNIB
- Confirmar que ícone está sendo exibido corretamente
- Testar comportamento em diferentes tamanhos de tela

## Agent Notes
