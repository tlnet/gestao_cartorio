---
id: 12
title: "Adicionar campos de WhatsApp para Contas a Pagar e Protocolos"
status: completed
priority: high
feature: Configuração de WhatsApp para Notificações
dependencies:
  - 11
assigned_agent: Auto
created_at: "2025-10-29T08:43:17Z"
started_at: "2025-10-29T08:44:00Z"
completed_at: "2025-10-29T08:45:00Z"
error_log: null
---

## Description

Implementar os dois campos de entrada para números de WhatsApp: um para contas a pagar e outro para protocolos.

## Details

- Criar campo para WhatsApp de Contas a Pagar:
  - Label: "WhatsApp para Contas a Pagar"
  - Ícone: Receipt ou DollarSign
  - Placeholder: "(00) 00000-0000"
  - Descrição explicativa
- Criar campo para WhatsApp de Protocolos:
  - Label: "WhatsApp para Protocolos"
  - Ícone: FileText ou Clipboard
  - Placeholder: "(00) 00000-0000"
  - Descrição explicativa
- Usar componentes Input do shadcn/ui
- Adicionar Labels apropriados
- Layout em grid para acomodar ambos os campos lado a lado em desktop
- Estados locais para armazenar valores (apenas visual por enquanto)

## Test Strategy

- Verificar que ambos os campos aparecem corretamente
- Testar em diferentes tamanhos de tela
- Confirmar que labels e placeholders estão corretos
- Verificar que ícones aparecem adequadamente

## Agent Notes
