---
id: 36
title: "Implementar formulário de definição de senha na página de ativação"
status: completed
priority: high
feature: Sistema de Convite de Usuários
dependencies:
  - 35
assigned_agent: null
created_at: "2026-02-03T19:04:38Z"
started_at: "2026-02-03T19:12:10Z"
completed_at: "2026-02-03T19:12:59Z"
error_log: null
---

## Description

Criar formulário com validação de senha, indicador de força e confirmação

## Details

- Adicionar formulário em `src/app/ativar-conta/page.tsx` (só exibido se token válido)
- Campos:
  - Nova Senha (type password, com toggle show/hide)
  - Confirmar Senha (type password, com toggle show/hide)
- Validações em tempo real:
  - Senha mínimo 8 caracteres
  - Pelo menos 1 maiúscula
  - Pelo menos 1 minúscula
  - Pelo menos 1 número
  - Senhas devem coincidir
- Indicador visual de força da senha:
  - Fraco (vermelho): < 8 caracteres
  - Médio (amarelo): 8+ chars mas falta maiúscula/minúscula/número
  - Forte (verde): atende todos os requisitos
- Lista de requisitos com checkmarks (verde quando atendido)
- Botão "Ativar Conta" desabilitado até todas validações passarem
- Loading state no botão durante submit
- Ao submeter com sucesso:
  - Chamar API `/api/users/activate-account` com `{ token, password }`
  - Exibir toast de sucesso
  - Redirecionar para `/login` após 2 segundos
  - Opção de "Fazer Login Agora"
- Tratamento de erros amigável

## Test Strategy

- Testar validação de senha com diferentes combinações
- Verificar que botão só fica habilitado quando requisitos são atendidos
- Testar indicador de força da senha
- Confirmar que senhas não coincidentes são bloqueadas
- Testar submit com senha válida
- Verificar redirecionamento após sucesso
- Testar casos de erro na ativação
- Validar UX com feedback claro em cada etapa
