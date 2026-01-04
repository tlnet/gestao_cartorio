---
id: 20
title: "Implementar modal de upload de Documentos do Imóvel"
status: completed
priority: high
feature: Refatoração Upload Minuta
dependencies:
  - 15
  - 16
assigned_agent: null
created_at: "2026-01-03T11:31:45Z"
started_at: "2026-01-03T12:02:00Z"
completed_at: "2026-01-03T12:05:29Z"
error_log: null
---

## Description

Criar modal para upload de três documentos obrigatórios do imóvel: Matrícula do Imóvel Atualizada, Guia ITBI e Certidão de Ônus.

## Details

- Modal deve conter:
  - Três campos de upload separados e claramente identificados:
    1. Upload Matrícula do Imóvel
      - Label: "Matrícula do Imóvel Atualizada"
      - Input file
      - Preview do arquivo
      - Botão para remover/substituir
    2. Upload Guia ITBI
      - Label: "Guia ITBI"
      - Input file
      - Preview do arquivo
      - Botão para remover/substituir
    3. Upload Certidão de Ônus
      - Label: "Certidão de Ônus"
      - Input file
      - Preview do arquivo
      - Botão para remover/substituir
- Validações:
  - Todos os três arquivos são obrigatórios
  - Aceitar apenas PDF, JPG, PNG
  - Tamanho máximo por arquivo: 10MB
- Preview deve mostrar:
  - Nome do arquivo
  - Tamanho do arquivo
  - Ícone indicando tipo (PDF ou imagem)
- Botão "Salvar":
  - Valida que todos os três arquivos foram enviados
  - Se válido: salva no estado, fecha modal, atualiza status para "Completo"
  - Se inválido: mostra erro indicando quais arquivos faltam
- Layout organizado verticalmente com espaçamento adequado

## Test Strategy

1. Abrir modal de Documentos do Imóvel
2. Tentar salvar sem enviar arquivos: deve mostrar erro
3. Enviar apenas Matrícula e tentar salvar: deve pedir os outros dois
4. Enviar apenas dois documentos: deve pedir o terceiro
5. Enviar os três documentos (PDFs): deve aceitar e mostrar previews
6. Salvar com todos: modal fecha e card mostra "Completo"
7. Reabrir modal: todos os três arquivos devem estar listados
8. Substituir Guia ITBI: deve atualizar apenas esse preview
9. Remover Certidão de Ônus: status deve voltar para "Pendente"
10. Tentar enviar arquivos não permitidos: deve rejeitar
11. Enviar mistura de PDF e imagens: deve aceitar todos

