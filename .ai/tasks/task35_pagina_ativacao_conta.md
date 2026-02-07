---
id: 35
title: "Criar página de ativação de conta (/ativar-conta)"
status: completed
priority: high
feature: Sistema de Convite de Usuários
dependencies:
  - 34
assigned_agent: null
created_at: "2026-02-03T19:04:38Z"
started_at: "2026-02-03T19:11:16Z"
completed_at: "2026-02-03T19:11:57Z"
error_log: null
---

## Description

Criar rota e estrutura base da página com validação de token via query parameter

## Details

- Criar arquivo `src/app/ativar-conta/page.tsx`
- Página deve ser pública (não exige autenticação)
- Usar `useSearchParams()` para extrair token da URL
- `useEffect` para validar token ao carregar página
- Estados a gerenciar:
  - `tokenStatus`: 'validating' | 'valid' | 'invalid' | 'expired' | 'used'
  - `userData`: { name, email, telefone } | null
  - `loading`: boolean
- Chamar API `/api/users/validate-invite?token=...` ao montar
- Estrutura visual:
  - Logo do sistema no topo
  - Card centralizado com loading spinner durante validação
  - Se token inválido/expirado: exibir mensagem de erro com ícone e instruções
  - Se token válido: exibir dados do usuário (somente leitura) + formulário de senha
- Layout responsivo e design limpo
- Usar componentes UI existentes (Card, Alert, etc.)
- Adicionar animações de transição entre estados

## Test Strategy

- Acessar página sem token: deve exibir erro
- Acessar com token válido: deve exibir dados do usuário
- Acessar com token inválido: deve exibir mensagem apropriada
- Acessar com token expirado: deve exibir orientação para contatar admin
- Acessar com token já usado: deve informar que conta já está ativa
- Verificar responsividade em mobile e desktop
- Testar loading states e animações
