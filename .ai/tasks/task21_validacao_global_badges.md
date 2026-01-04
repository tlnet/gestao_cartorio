---
id: 21
title: "Implementar sistema de validação global e badges de status"
status: completed
priority: critical
feature: Refatoração Upload Minuta
dependencies:
  - 17
  - 18
  - 19
  - 20
assigned_agent: null
created_at: "2026-01-03T11:31:45Z"
started_at: "2026-01-03T11:52:51Z"
completed_at: "2026-01-03T12:05:29Z"
error_log: null
---

## Description

Implementar sistema de validação global que verifica o preenchimento completo de todos os 4 cards, atualiza dinamicamente os badges de status de cada card e controla a habilitação do botão "Gerar Minuta".

## Details

- Criar função de validação para cada card:
  - `validateCompradores()`: verifica se todos os campos obrigatórios estão preenchidos
  - `validateVendedores()`: verifica se todos os vendedores têm dados completos
  - `validateCertidoes()`: verifica se CNDT e CND Federal foram enviados
  - `validateDocumentosImovel()`: verifica se os três documentos foram enviados
- Criar estado global de status para cada card:
  - `cardStatus: { compradores: 'pending' | 'complete', vendedores: ..., etc }`
- Badges nos cards devem refletir o status em tempo real:
  - "Pendente" (badge amarelo): quando validação retorna false
  - "Completo" (badge verde): quando validação retorna true
- Atualizar badges:
  - Ao salvar dados em qualquer modal
  - Ao remover dados que tornem card incompleto
  - Ao reabrir o dialog principal
- Botão "Gerar Minuta":
  - Desabilitado se qualquer card estiver "Pendente"
  - Habilitado apenas quando todos os 4 cards estiverem "Completos"
  - Tooltip ou texto indicando "X/4 cards completos" quando desabilitado
- Ao tentar clicar em "Gerar Minuta" desabilitado: mostrar toast indicando quais cards ainda precisam ser preenchidos

## Test Strategy

1. Abrir dialog: verificar que 4 cards mostram "Pendente" e botão está desabilitado
2. Preencher card de Compradores completamente: badge deve mudar para "Completo"
3. Verificar que botão "Gerar Minuta" ainda está desabilitado (3/4 completos)
4. Preencher Vendedores, Certidões e Documentos do Imóvel
5. Verificar que todos os badges estão "Completos" e botão está habilitado
6. Reabrir card de Compradores e remover dados obrigatórios
7. Salvar: badge deve voltar para "Pendente" e botão desabilitar
8. Refazer preenchimento de Compradores: badge e botão devem voltar ao normal
9. Fechar e reabrir dialog: status dos badges deve persistir
10. Tentar clicar em "Gerar Minuta" com cards incompletos: deve mostrar mensagem clara

