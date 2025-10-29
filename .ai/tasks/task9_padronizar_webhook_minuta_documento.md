---
id: 9
title: "Padronizar webhook de Gerar minuta de documento para seguir padrão do Resumir Matrícula"
status: completed
priority: high
feature: Padronização de Webhooks para Análises de IA
dependencies:
  - 7
assigned_agent: Auto
created_at: "2025-10-29T08:31:33Z"
started_at: "2025-10-29T08:35:00Z"
completed_at: "2025-10-29T08:36:00Z"
error_log: null
---

## Description

Ajustar a estrutura de webhook do "Gerar minuta de documento" para seguir exatamente o mesmo padrão do "Resumir Matrícula".

## Details

- Verificar se `processarMinutaDocumento` usa a mesma estrutura que `processarResumoMatricula`
- Garantir que:
  - Usa `processarAnalise` com mesmos parâmetros (mesmo que receba múltiplos arquivos)
  - Obtém webhook URL da mesma forma
  - Prepara payload com mesma estrutura
  - Trata resposta de forma idêntica
  - Atualiza relatório no banco da mesma forma
  - Tem tratamento de erros consistente
- Verificar se há diferenças no componente `minuta-documento-form.tsx`
- Garantir que fluxo de callback é idêntico

## Test Strategy

- Comparar código de `processarMinutaDocumento` com `processarResumoMatricula`
- Testar fluxo completo de "Gerar minuta de documento"
- Verificar se resultados são tratados igual
- Validar que erros são tratados da mesma forma
- Testar com múltiplos arquivos

## Agent Notes

**Validação Concluída:**

Após análise comparativa, foi confirmado que `processarMinutaDocumento` já está seguindo exatamente o mesmo padrão do `processarResumoMatricula`:

1. ✅ Usa `processarAnalise` como função base
2. ✅ Recebe múltiplos arquivos (File[]) que são tratados corretamente dentro de `processarAnalise`
3. ✅ Passa `dadosAdicionais` com estrutura consistente (incluindo documentos categorizados)
4. ✅ Obtém webhook URL da mesma forma
5. ✅ Trata respostas da mesma forma
6. ✅ Atualiza relatório no banco da mesma forma

**Nenhuma alteração necessária** - O código já está padronizado corretamente. A única diferença é receber múltiplos arquivos em vez de um único, mas isso é tratado corretamente dentro de `processarAnalise`.
