---
id: 15
title: "Criar estrutura de cards e sistema de modais"
status: completed
priority: critical
feature: Refatoração Upload Minuta
dependencies: []
assigned_agent: null
created_at: "2026-01-03T11:31:45Z"
started_at: "2026-01-03T11:52:51Z"
completed_at: "2026-01-03T11:54:07Z"
error_log: null
---

## Description

Criar a estrutura visual de 4 cards principais (Compradores, Vendedores, Certidões Fiscais, Documentos do Imóvel) com badges de status dinâmicos e implementar o sistema básico de abertura/fechamento de modais individuais para cada card.

## Details

- Substituir o atual sistema de categorias genéricas por 4 cards distintos e grandes
- Cada card deve ter:
  - Ícone representativo da categoria
  - Título claro
  - Badge de status: "Pendente" (amarelo) ou "Completo" (verde)
  - Ser clicável para abrir modal correspondente
- Implementar estrutura de estados para controlar:
  - Qual modal está aberto
  - Status de preenchimento de cada card
  - Dados temporários de cada formulário
- Criar componentes de modal reutilizáveis ou adaptar Dialog existente
- Manter botão principal "Enviar Documentos" que abre dialog com os 4 cards
- Remover estrutura antiga de categorias (compradores, vendedores, matricula, outros)

## Test Strategy

1. Abrir dialog "Gerar Minuta de Documento"
2. Verificar que 4 cards são exibidos claramente
3. Verificar que todos os cards mostram badge "Pendente" inicialmente
4. Clicar em cada card e verificar que modal correspondente abre
5. Fechar modais e verificar que dialog principal permanece aberto
6. Verificar que badges não mudam de status ainda (será implementado em task posterior)

