---
id: 19
title: "Implementar modal de upload de Certidões Fiscais"
status: completed
priority: high
feature: Refatoração Upload Minuta
dependencies:
  - 15
  - 16
assigned_agent: null
created_at: "2026-01-03T11:31:45Z"
started_at: "2026-01-03T12:00:00Z"
completed_at: "2026-01-03T12:05:29Z"
error_log: null
---

## Description

Criar modal simplificado para upload de duas certidões fiscais obrigatórias: CNDT (Certidão Negativa de Débitos Trabalhistas) e CND Federal (Certidão Negativa de Débitos Federais).

## Details

- Modal deve conter:
  - Dois campos de upload separados e claramente identificados:
    1. Upload CNDT
      - Label: "CNDT - Certidão Negativa de Débitos Trabalhistas"
      - Input file
      - Preview do arquivo após upload
      - Botão para remover/substituir
    2. Upload CND Federal
      - Label: "CND Federal - Certidão Negativa de Débitos Federais"
      - Input file
      - Preview do arquivo após upload
      - Botão para remover/substituir
- Validações:
  - Ambos os arquivos são obrigatórios
  - Aceitar apenas PDF, JPG, PNG
  - Tamanho máximo por arquivo: 10MB
- Preview deve mostrar:
  - Nome do arquivo
  - Tamanho do arquivo
  - Ícone indicando tipo (PDF ou imagem)
- Botão "Salvar":
  - Valida que ambos os arquivos foram enviados
  - Se válido: salva no estado, fecha modal, atualiza status para "Completo"
  - Se inválido: mostra erro indicando qual arquivo falta
- Interface limpa e direta, sem campos de texto

## Test Strategy

1. Abrir modal de Certidões Fiscais
2. Tentar salvar sem enviar arquivos: deve mostrar erro
3. Enviar apenas CNDT e tentar salvar: deve pedir CND Federal
4. Enviar apenas CND Federal e tentar salvar: deve pedir CNDT
5. Enviar ambos os arquivos (PDF): deve aceitar e mostrar preview
6. Salvar com ambos: modal fecha e card mostra "Completo"
7. Reabrir modal: ambos os arquivos devem estar listados
8. Substituir um arquivo: deve atualizar preview
9. Tentar enviar arquivo .doc: deve rejeitar
10. Tentar enviar arquivo muito grande (>10MB): deve rejeitar com mensagem clara

