---
id: 17
title: "Implementar modal e formulário de Documentos dos Compradores"
status: completed
priority: high
feature: Refatoração Upload Minuta
dependencies:
  - 15
  - 16
assigned_agent: null
created_at: "2026-01-03T11:31:45Z"
started_at: "2026-01-03T11:55:02Z"
completed_at: "2026-01-03T11:57:33Z"
error_log: null
---

## Description

Criar o modal completo para coleta de dados dos compradores, incluindo campos obrigatórios, campos condicionais para cônjuge quando casado, uploads de documentos e validação completa antes de salvar.

## Details

- Modal deve conter:
  - Campos obrigatórios:
    - RG (Input text)
    - CPF (Input text com máscara)
    - E-mail (Input email com validação)
    - Qualificação Profissional (Input text)
    - Upload de Comprovante de Endereço (aceitar PDF, JPG, PNG)
  - Checkbox "Casado(a)?"
  - Quando marcado "Casado", expandir campos do cônjuge:
    - RG do Cônjuge
    - CPF do Cônjuge
    - E-mail do Cônjuge
    - Qualificação Profissional do Cônjuge
    - Upload de Certidão de Casamento
- Implementar validações:
  - Todos os campos obrigatórios devem estar preenchidos
  - E-mail deve ter formato válido
  - CPF pode ter validação de formato (opcional mas recomendado)
  - Upload: validar tipo de arquivo (PDF, JPG, PNG)
  - Se casado, todos os campos do cônjuge são obrigatórios
- Botão "Salvar":
  - Valida todos os campos
  - Se válido: salva no estado, fecha modal, atualiza status do card para "Completo"
  - Se inválido: mostra erros nos campos
- Botão "Cancelar": fecha modal sem salvar
- Se modal for reaberto, deve carregar dados já salvos para edição

## Test Strategy

1. Abrir modal de Documentos dos Compradores
2. Tentar salvar sem preencher: verificar mensagens de erro
3. Preencher apenas campos obrigatórios e salvar: deve funcionar
4. Marcar "Casado" e verificar que campos do cônjuge aparecem
5. Tentar salvar com "Casado" mas sem preencher cônjuge: deve dar erro
6. Preencher tudo e salvar: modal deve fechar e card mostrar "Completo"
7. Reabrir modal: dados devem estar carregados
8. Editar dados e salvar: alterações devem persistir
9. Tentar upload de arquivo não permitido (.doc): deve rejeitar
10. Upload de PDF, JPG, PNG: deve aceitar e mostrar preview

