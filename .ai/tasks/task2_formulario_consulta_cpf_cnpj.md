---
id: 2
title: "Implementar formulário de consulta com validação CPF/CNPJ"
status: completed
priority: high
feature: CNIB - Consulta de Indisponibilidade
dependencies:
  - 1
assigned_agent: Auto
created_at: "2025-10-29T08:14:12Z"
started_at: "2025-10-29T08:17:24Z"
completed_at: "2025-10-29T08:23:41Z"
error_log: null
---

## Description

Criar formulário de consulta com campo de entrada CPF/CNPJ incluindo máscara automática, validação de formato e botão de consulta.

## Details

- Criar componente de formulário usando React Hook Form e Zod para validação
- Implementar campo de entrada Input com máscara dinâmica:
  - CPF: 000.000.000-00
  - CNPJ: 00.000.000/0000-00
- Adicionar função para detectar automaticamente se é CPF ou CNPJ baseado no tamanho
- Implementar validação de formato usando Zod schema
- Criar botão de consulta que fica habilitado apenas quando CPF/CNPJ é válido
- Adicionar função para limpar caracteres especiais antes do envio
- Usar componentes Shadcn/UI (Input, Button, Form) seguindo padrões do projeto
- Adicionar ícones apropriados (Search, FileText) usando lucide-react

## Test Strategy

- Verificar que máscara CPF é aplicada corretamente ao digitar 11 dígitos
- Verificar que máscara CNPJ é aplicada corretamente ao digitar 14 dígitos
- Testar validação com CPF/CNPJ válidos e inválidos
- Confirmar que botão só fica habilitado quando documento é válido
- Verificar que caracteres especiais são removidos corretamente
- Testar comportamento em diferentes navegadores

## Agent Notes
