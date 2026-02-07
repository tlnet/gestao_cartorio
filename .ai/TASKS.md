# Project Tasks

- [x] **ID 1: Criar estrutura básica da página CNIB** (Priority: critical)
  > Criar rota, página principal e estrutura base seguindo padrões do projeto

- [x] **ID 2: Implementar formulário de consulta com validação CPF/CNPJ** (Priority: high)
  > Dependencies: 1
  > Criar campo de entrada com máscara e validação de CPF/CNPJ

- [x] **ID 3: Criar área de resultados e componentes de exibição** (Priority: high)
  > Dependencies: 1
  > Implementar estrutura para exibir resultados da consulta CNIB

- [x] **ID 4: Integrar página CNIB no menu sidebar** (Priority: high)
  > Dependencies: 1
  > Adicionar item de menu para acesso à página CNIB

- [x] **ID 5: Implementar estados de loading e tratamento de erros** (Priority: medium)
  > Dependencies: 2, 3
  > Adicionar feedback visual durante consulta e tratamento de erros

- [x] **ID 6: Refinar UI/UX e garantir responsividade** (Priority: medium)
  > Dependencies: 2, 3, 4, 5
  > Ajustar layout, animações e garantir funcionamento em dispositivos móveis

- [x] **ID 7: Analisar estrutura do Resumir Matrícula e criar padrão de referência** (Priority: high)
  > Feature: Padronização de Webhooks para Análises de IA
  > Analisar estrutura funcional do Resumir Matrícula para replicar

- [x] **ID 8: Padronizar webhook de Analisar Malote para seguir padrão do Resumir Matrícula** (Priority: high)
  > Feature: Padronização de Webhooks para Análises de IA
  > Dependencies: 7
  > ✅ Já está padronizado - nenhuma alteração necessária

- [x] **ID 9: Padronizar webhook de Gerar minuta de documento para seguir padrão do Resumir Matrícula** (Priority: high)
  > Feature: Padronização de Webhooks para Análises de IA
  > Dependencies: 7
  > ✅ Já está padronizado - nenhuma alteração necessária

- [x] **ID 10: Validar e testar padronização de todos os webhooks** (Priority: medium)
  > Feature: Padronização de Webhooks para Análises de IA
  > Dependencies: 7, 8, 9
  > ✅ Validação concluída - todas as análises já estão padronizadas

- [x] **ID 11: Criar estrutura básica da seção de configuração WhatsApp** (Priority: high)
  > Feature: Configuração de WhatsApp para Notificações
  > ✅ Estrutura criada com Card, campos e botão

- [x] **ID 12: Adicionar campos de WhatsApp para Contas a Pagar e Protocolos** (Priority: high)
  > Feature: Configuração de WhatsApp para Notificações
  > Dependencies: 11
  > ✅ Dois campos separados implementados

- [x] **ID 13: Implementar formatação de telefone com máscara automática** (Priority: high)
  > Feature: Configuração de WhatsApp para Notificações
  > Dependencies: 12
  > ✅ Formatação automática usando formatPhone existente

- [x] **ID 14: Adicionar botão de salvar e ajustar layout final** (Priority: medium)
  > Feature: Configuração de WhatsApp para Notificações
  > Dependencies: 12, 13
  > ✅ Layout finalizado com responsividade

- [x] **ID 15: Criar estrutura de cards e sistema de modais** (Priority: critical)
  > Feature: Refatoração Upload Minuta
  > Criar 4 cards principais com badges de status e sistema de modais individuais

- [x] **ID 16: Criar tipos TypeScript para dados dos formulários** (Priority: high)
  > Feature: Refatoração Upload Minuta
  > Dependencies: 15
  > Definir interfaces para compradores, vendedores, certidões e documentos do imóvel

- [x] **ID 17: Implementar modal e formulário de Documentos dos Compradores** (Priority: high)
  > Feature: Refatoração Upload Minuta
  > Dependencies: 15, 16
  > Criar formulário completo com campos obrigatórios e condicionais para cônjuge

- [x] **ID 18: Implementar modal e formulário de Documentos dos Vendedores** (Priority: high)
  > Feature: Refatoração Upload Minuta
  > Dependencies: 15, 16
  > Criar formulário com suporte a múltiplos vendedores e campos condicionais

- [x] **ID 19: Implementar modal de upload de Certidões Fiscais** (Priority: high)
  > Feature: Refatoração Upload Minuta
  > Dependencies: 15, 16
  > Criar modal com dois campos de upload obrigatórios (CNDT e CND Federal)

- [x] **ID 20: Implementar modal de upload de Documentos do Imóvel** (Priority: high)
  > Feature: Refatoração Upload Minuta
  > Dependencies: 15, 16
  > Criar modal com três campos de upload obrigatórios (Matrícula, ITBI, Certidão Ônus)

- [x] **ID 21: Implementar sistema de validação global e badges de status** (Priority: critical)
  > Feature: Refatoração Upload Minuta
  > Dependencies: 17, 18, 19, 20
  > Validar preenchimento completo e atualizar badges dos cards dinamicamente

- [x] **ID 22: Integrar novos dados com função de processamento de minuta** (Priority: high)
  > Feature: Refatoração Upload Minuta
  > Dependencies: 17, 18, 19, 20, 21
  > Adaptar processarMinutaDocumento para receber e enviar novos dados estruturados

- [x] **ID 23: Testes e ajustes finais da refatoração** (Priority: medium)
  > Feature: Refatoração Upload Minuta
  > Dependencies: 15, 16, 17, 18, 19, 20, 21, 22
  > Testar todos os fluxos, validações e ajustar UX conforme necessário

- [x] **ID 24: Atualizar tipos TypeScript e interfaces de permissões** (Priority: high)
  > Feature: Sistema de Hierarquia de Usuários
  > Atualizar tipos de usuário e criar interfaces para verificação de permissões

- [x] **ID 25: Estender AuthContext com informações de hierarquia** (Priority: critical)
  > Feature: Sistema de Hierarquia de Usuários
  > Dependencies: 24
  > Adicionar tipo de usuário ao contexto e criar hook de verificação de permissões

- [x] **ID 26: Criar componente de proteção de rotas** (Priority: critical)
  > Feature: Sistema de Hierarquia de Usuários
  > Dependencies: 25
  > Implementar componente que verifica permissões antes de renderizar páginas

- [x] **ID 27: Implementar controle de visibilidade na sidebar** (Priority: high)
  > Feature: Sistema de Hierarquia de Usuários
  > Dependencies: 25
  > Ocultar itens de menu "Usuários" e "Configurações" para atendentes

- [x] **ID 28: Criar página de acesso negado (403)** (Priority: medium)
  > Feature: Sistema de Hierarquia de Usuários
  > Dependencies: 25
  > Implementar página personalizada de erro 403 com feedback amigável

- [x] **ID 29: Aplicar proteção de rotas nas páginas restritas** (Priority: critical)
  > Feature: Sistema de Hierarquia de Usuários
  > Dependencies: 26, 28
  > Proteger páginas /usuarios e /configuracoes com componente de permissões

- [x] **ID 30: Implementar validação de permissões nas API routes** (Priority: high)
  > Feature: Sistema de Hierarquia de Usuários
  > Dependencies: 25
  > Adicionar verificação de tipo de usuário nas rotas de API sensíveis

- [x] **ID 31: Testes e validação do sistema de hierarquia** (Priority: medium)
  > Feature: Sistema de Hierarquia de Usuários
  > Dependencies: 24, 25, 26, 27, 28, 29, 30
  > Testar todos os cenários de acesso e validar comportamento do sistema

- [x] **ID 32: Criar schema do banco de dados para sistema de convites** (Priority: critical)
  > Feature: Sistema de Convite de Usuários
  > Criar tabela ou campos na tabela users para armazenar tokens de convite, datas de expiração e status

- [x] **ID 33: Implementar API route para geração de token de convite** (Priority: critical)
  > Feature: Sistema de Convite de Usuários
  > Dependencies: 32
  > Criar endpoint que gera token único (UUID), define prazo de validade e retorna URL completa

- [x] **ID 34: Implementar API route para validação e consumo de token** (Priority: critical)
  > Feature: Sistema de Convite de Usuários
  > Dependencies: 32
  > Criar endpoint que valida token, verifica expiração e permite definição de senha

- [x] **ID 35: Criar página de ativação de conta (/ativar-conta)** (Priority: high)
  > Feature: Sistema de Convite de Usuários
  > Dependencies: 34
  > Criar rota e estrutura base da página com validação de token via query parameter

- [x] **ID 36: Implementar formulário de definição de senha na página de ativação** (Priority: high)
  > Feature: Sistema de Convite de Usuários
  > Dependencies: 35
  > Criar formulário com validação de senha, indicador de força e confirmação

- [x] **ID 37: Modificar formulário de criação de usuário para gerar convite** (Priority: critical)
  > Feature: Sistema de Convite de Usuários
  > Dependencies: 33
  > Remover campo senha, integrar geração de token e exibir feedback ao admin

- [x] **ID 38: Implementar modal de convite gerado com link para compartilhamento** (Priority: high)
  > Feature: Sistema de Convite de Usuários
  > Dependencies: 37
  > Criar modal que exibe link de convite com botão de copiar e instruções

- [x] **ID 39: Atualizar listagem de usuários com status de convite** (Priority: medium)
  > Feature: Sistema de Convite de Usuários
  > Dependencies: 32, 37
  > Adicionar badge de status, filtro para convites pendentes e ações de gerenciamento

- [x] **ID 40: Implementar funcionalidades de reenviar e cancelar convite** (Priority: medium)
  > Feature: Sistema de Convite de Usuários
  > Dependencies: 33, 39
  > Criar lógica para invalidar token anterior, gerar novo e remover/cancelar convite

- [x] **ID 41: Testes e validação completa do sistema de convites** (Priority: medium)
  > Feature: Sistema de Convite de Usuários
  > Dependencies: 32, 33, 34, 35, 36, 37, 38, 39, 40
  > Testar fluxo completo, segurança, edge cases e validar todas as user stories