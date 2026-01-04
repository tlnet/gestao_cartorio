---
id: 22
title: "Integrar novos dados com função de processamento de minuta"
status: completed
priority: high
feature: Refatoração Upload Minuta
dependencies:
  - 17
  - 18
  - 19
  - 20
  - 21
assigned_agent: null
created_at: "2026-01-03T11:31:45Z"
started_at: "2026-01-03T12:06:15Z"
completed_at: "2026-01-03T12:08:22Z"
error_log: null
---

## Description

Adaptar a função `processarMinutaDocumento` para receber e enviar os novos dados estruturados coletados nos formulários, incluindo informações de compradores, vendedores, certidões e documentos do imóvel.

## Details

- Modificar função `processarMinuta` para:
  - Coletar todos os dados dos estados dos formulários
  - Organizar arquivos de upload:
    - Compradores: RG, CPF docs, Comprovante Endereço, Certidão Casamento (se aplicável)
    - Vendedores: documentos de cada vendedor
    - Certidões: CNDT e CND Federal
    - Documentos Imóvel: Matrícula, ITBI, Certidão Ônus
  - Preparar objeto de dados adicionais estruturado:
    ```typescript
    {
      compradores: {
        rg, cpf, email, qualificacaoProfissional,
        casado, conjuge: { ... }
      },
      vendedores: [
        { rg, cpf, email, ..., casado, conjuge: {...} },
        { rg, cpf, email, ..., casado, conjuge: {...} }
      ],
      certidoes: { cndt: fileName, cndFederal: fileName },
      documentosImovel: { matricula: fileName, guiaITBI: fileName, certidaoOnus: fileName }
    }
    ```
- Manter compatibilidade com `processarMinutaDocumento` existente
- Se necessário, criar nova função ou adaptar a existente para aceitar dados estruturados
- Garantir que todos os arquivos sejam enviados corretamente
- Manter tratamento de erros existente
- Após envio bem-sucedido: limpar todos os estados dos formulários

## Test Strategy

1. Preencher todos os 4 cards com dados válidos
2. Clicar em "Gerar Minuta" e verificar loading state
3. Verificar no console que dados estruturados estão sendo enviados corretamente
4. Verificar que todos os arquivos estão sendo incluídos no upload
5. Simular sucesso: verificar que toast de sucesso aparece
6. Verificar que formulário é limpo após sucesso
7. Verificar que dialog fecha após sucesso
8. Simular erro de webhook: verificar mensagem de erro apropriada
9. Testar com 1 vendedor e depois com 3 vendedores: ambos devem funcionar
10. Testar com comprador casado e solteiro: ambos devem funcionar

