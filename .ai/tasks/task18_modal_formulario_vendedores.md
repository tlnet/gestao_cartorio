---
id: 18
title: "Implementar modal e formulário de Documentos dos Vendedores"
status: completed
priority: high
feature: Refatoração Upload Minuta
dependencies:
  - 15
  - 16
assigned_agent: null
created_at: "2026-01-03T11:31:45Z"
started_at: "2026-01-03T11:57:35Z"
completed_at: "2026-01-03T12:05:29Z"
error_log: null
---

## Description

Criar o modal completo para coleta de dados dos vendedores, com suporte a múltiplos vendedores, campos obrigatórios, campos condicionais para cônjuge, uploads de documentos e validação completa.

## Details

- Modal similar ao de compradores, mas com funcionalidade de múltiplos vendedores:
  - Campos base (mesmo do comprador):
    - RG, CPF, E-mail, Qualificação Profissional
    - Upload de Comprovante de Endereço
    - Checkbox "Casado(a)?" com campos do cônjuge
  - Checkbox adicional: "Mais de um vendedor"
  - Quando marcado "Mais de um vendedor":
    - Botão "Adicionar Vendedor"
    - Cada vendedor adicional aparece em accordion ou seção expansível
    - Cada vendedor tem conjunto completo de campos
    - Botão para remover vendedor adicional (não remove o primeiro)
    - Limite recomendado: até 5 vendedores
- Implementar estrutura de array para vendedores
- Validações:
  - Todos os campos obrigatórios de cada vendedor
  - Validação de e-mail para cada vendedor
  - Se casado, validar campos do cônjuge
  - Validar uploads de documentos
- Botão "Salvar":
  - Valida todos os vendedores
  - Salva array de vendedores no estado
  - Fecha modal e atualiza status do card
- Interface deve ser clara sobre qual vendedor está sendo preenchido (Vendedor 1, Vendedor 2, etc.)

## Test Strategy

1. Abrir modal de Documentos dos Vendedores
2. Preencher dados de um vendedor e salvar: deve funcionar
3. Marcar "Mais de um vendedor" e clicar "Adicionar Vendedor"
4. Verificar que segundo conjunto de campos aparece
5. Preencher ambos os vendedores e salvar
6. Reabrir modal: ambos os vendedores devem estar lá
7. Adicionar terceiro vendedor, salvar e verificar persistência
8. Remover segundo vendedor e salvar: apenas 1º e 3º devem permanecer
9. Marcar "Casado" para um vendedor e verificar campos do cônjuge
10. Tentar salvar com dados incompletos em qualquer vendedor: deve dar erro
11. Preencher completamente 2 vendedores, um casado e outro solteiro: deve salvar corretamente

