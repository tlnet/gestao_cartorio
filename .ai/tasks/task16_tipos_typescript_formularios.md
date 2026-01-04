---
id: 16
title: "Criar tipos TypeScript para dados dos formulários"
status: completed
priority: high
feature: Refatoração Upload Minuta
dependencies:
  - 15
assigned_agent: null
created_at: "2026-01-03T11:31:45Z"
started_at: "2026-01-03T11:54:12Z"
completed_at: "2026-01-03T11:55:01Z"
error_log: null
---

## Description

Definir interfaces TypeScript completas para todos os dados que serão coletados nos formulários de compradores, vendedores, certidões fiscais e documentos do imóvel.

## Details

- Criar interface para dados de pessoa (comprador/vendedor):
  - rg: string
  - cpf: string
  - comprovanteEndereco: File | null
  - email: string
  - qualificacaoProfissional: string
  - casado: boolean
  - conjuge (opcional): objeto com mesmos campos básicos + certidãoCasamento
- Criar interface para vendedor (estende pessoa, adiciona):
  - id único para cada vendedor
- Criar interface para certidões fiscais:
  - cndt: File | null
  - cndFederal: File | null
- Criar interface para documentos do imóvel:
  - matricula: File | null
  - guiaITBI: File | null
  - certidaoOnus: File | null
- Criar interface para estado global do formulário:
  - compradores: dados do comprador
  - vendedores: array de vendedores
  - certidoes: dados de certidões
  - documentosImovel: dados de documentos
- Criar tipos para status de cada card (pending | complete)
- Adicionar tipos no arquivo ou criar arquivo separado de types se necessário

## Test Strategy

1. Verificar que todas as interfaces compilam sem erros TypeScript
2. Verificar que os estados dos componentes usam corretamente as interfaces
3. Testar autocompletion do TypeScript ao usar os tipos
4. Garantir que tipos File sejam usados para uploads

