---
id: 13
title: "Implementar formatação de telefone com máscara automática"
status: completed
priority: high
feature: Configuração de WhatsApp para Notificações
dependencies:
  - 12
assigned_agent: Auto
created_at: "2025-10-29T08:43:17Z"
started_at: "2025-10-29T08:44:00Z"
completed_at: "2025-10-29T08:45:00Z"
error_log: null
---

## Description

Adicionar máscara automática de formatação de telefone brasileiro nos campos de WhatsApp.

## Details

- Verificar se existe função utilitária de formatação de telefone no projeto
- Se não existir, criar função `formatPhoneNumber` em `src/lib/formatters.ts`
- Formato: (00) 00000-0000 (com DDD e 9 dígitos)
- Aplicar máscara automaticamente enquanto usuário digita
- Permitir apenas números
- Remover caracteres não numéricos antes de aplicar formatação
- Atualizar ambos os campos com a mesma formatação

## Test Strategy

- Testar digitação de números
- Verificar que formatação é aplicada automaticamente
- Confirmar que apenas números são aceitos
- Testar com diferentes quantidades de dígitos
- Verificar que placeholder corresponde ao formato esperado

## Agent Notes
