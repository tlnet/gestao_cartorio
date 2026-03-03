# PRD: Painel Administrativo Global

## 1. Product overview

### 1.1 Document title and version

- PRD: Painel Administrativo Global
- Version: 1.0

### 1.2 Product summary

Este PRD define a criação de um painel administrativo global na rota `/admin` para operação central do sistema por um perfil de alta confiança (Super Adm). O objetivo é permitir gestão transversal de todos os cartórios e usuários, sem limitação por `cartorio_id`.

Além da experiência visual consistente com o padrão já existente (layout, cards, tabelas, badges e diálogos), a solução inclui ajustes de RBAC e SQL para suportar o novo papel `admin_geral`, incluindo criação segura do usuário inicial de Super Adm.

## 2. Goals

### 2.1 Business goals

- Centralizar gestão operacional de múltiplos cartórios em um único painel.
- Reduzir esforço de suporte para manutenção de usuários e status de cartórios.
- Garantir governança com um papel administrativo global controlado.

### 2.2 User goals

- Super Adm visualizar todos os cartórios e usuários do sistema.
- Super Adm criar/editar cartórios com fluxo simples e consistente.
- Super Adm ativar/desativar usuários sem navegar por telas locais.

### 2.3 Non-goals

- Não criar um segundo produto separado em subdomínio nesta fase.
- Não redesenhar o sistema completo de permissões granulares por recurso.
- Não alterar fluxos de negócio dos módulos operacionais (protocolos, IA, contas).

## 3. User personas

### 3.1 Key user types

- Super Administrador (`admin_geral`)
- Administrador de Cartório (`admin`)
- Usuários operacionais (`atendente`, `financeiro`)

### 3.2 Basic persona details

- **Super Administrador**: responsável por governança global do sistema e suporte de operação multi-cartório.
- **Administrador de Cartório**: gerencia usuários e configurações do próprio cartório.

### 3.3 Role-based access

- **admin_geral**: acesso total, inclusive rota `/admin` e dados de todos os cartórios.
- **admin**: acesso administrativo local (sem visão global consolidada).
- **atendente/financeiro**: sem acesso à rota `/admin`.

## 4. Functional requirements

- **Novo papel de acesso global** (Priority: High)
  - Incluir `admin_geral` nos tipos da aplicação.
  - Atualizar lógica de permissões e normalização de roles.
- **Painel `/admin`** (Priority: High)
  - Exibir KPIs globais (cartórios, ativos, usuários, super admins).
  - Exibir tabela de cartórios com busca e edição.
  - Exibir tabela global de usuários com roles e ativação.
- **Navegação e roteamento** (Priority: High)
  - Mostrar item “Administração Geral” no menu quando permitido.
  - Redirecionar login/registro do `admin_geral` para `/admin`.
- **SQL e governança de banco** (Priority: High)
  - Script para habilitar `admin_geral` em constraints de role/roles.
  - Script de políticas RLS para acesso global do Super Adm.
  - Script de criação/atualização do usuário Super Adm.

## 5. User experience

### 5.1 Entry points & first-time user flow

- Super Adm autentica no mesmo sistema e é redirecionado para `/admin`.

### 5.2 Core experience

- **Visão global**: usuário abre `/admin` e visualiza KPIs resumidos.
  - Indicadores claros para decisão rápida.
- **Gestão de cartórios**: busca, cadastro e edição em modal.
  - Interação já familiar ao padrão do produto.
- **Gestão de usuários**: visão consolidada com alteração de ativo/inativo.
  - Ação rápida para suporte operacional.

### 5.3 Advanced features & edge cases

- Tolerar usuários sem vínculo de cartório (ex.: Super Adm).
- Permitir coexistência entre `role` legado e `roles` (array).

### 5.4 UI/UX highlights

- Reutilizar componentes existentes (`MainLayout`, `Card`, `Table`, `Dialog`, `Badge`, `Switch`).
- Manter identidade visual da aplicação sem introduzir novo tema.

## 6. Narrative

Como Super Adm, eu acesso um painel único e centralizado para acompanhar saúde operacional, atualizar cadastro de cartórios e realizar intervenções rápidas em usuários, sem depender de contexto local de um único cartório.

## 7. Success metrics

### 7.1 User-centric metrics

- Tempo médio para localizar e editar cartório < 1 minuto.
- Tempo médio para ativar/desativar usuário < 30 segundos.

### 7.2 Business metrics

- Redução do tempo de suporte administrativo multi-cartório.
- Maior confiabilidade no controle de permissões globais.

### 7.3 Technical metrics

- Erro de autorização em `/admin` = 0 para `admin_geral`.
- Nenhuma regressão de acesso para perfis `admin`, `atendente`, `financeiro`.

## 8. Technical considerations

### 8.1 Integration points

- Contexto de autenticação (`AuthContext`)
- Hook de permissões (`use-permissions`)
- Navegação (`sidebar`, redirecionamentos pós-login/registro)
- Supabase (`public.users`, `public.cartorios`, políticas RLS)

### 8.2 Data storage & privacy

- Manter RLS com exceção explícita apenas para `admin_geral`.
- Evitar exposição de ações administrativas a perfis não autorizados.

### 8.3 Scalability & performance

- Tabelas com busca textual simples para primeira versão.
- Evolução futura para paginação e filtros avançados.

### 8.4 Potential challenges

- Ambientes com constraints antigas de role incompatíveis.
- Diferenças de schema entre instâncias (colunas opcionais).

## 9. Milestones & sequencing

### 9.1 Project estimate

- Medium: 2-4 dias

### 9.2 Team size & composition

- Small Team: 1 Eng + 1 PM/PO

### 9.3 Suggested phases

- **Fase 1**: RBAC e navegação (0.5-1 dia)
  - Key deliverables: novo papel `admin_geral`, rota `/admin` protegida.
- **Fase 2**: Implementação do painel (1-2 dias)
  - Key deliverables: cards, tabelas, modal de cartório, gestão de usuários.
- **Fase 3**: Banco de dados e validação (0.5-1 dia)
  - Key deliverables: scripts SQL, criação do Super Adm, checklist de validação.

## 10. User stories

### 10.1 Acesso do Super Adm

- **ID**: US-001
- **Description**: Como Super Adm, quero acessar a rota `/admin` para gerenciar o sistema globalmente.
- **Acceptance Criteria**:
  - Usuário com `admin_geral` acessa `/admin`.
  - Usuários sem `admin_geral` são bloqueados/redirecionados.

### 10.2 Gestão global de cartórios

- **ID**: US-002
- **Description**: Como Super Adm, quero visualizar e editar cartórios para manter cadastros centralizados.
- **Acceptance Criteria**:
  - Tabela exibe todos os cartórios.
  - É possível criar e editar cartório pelo painel.

### 10.3 Gestão global de usuários

- **ID**: US-003
- **Description**: Como Super Adm, quero visualizar usuários de todos os cartórios e gerenciar status de atividade.
- **Acceptance Criteria**:
  - Tabela exibe usuários com cartório e roles.
  - Alteração de ativo/inativo funciona no painel.

### 10.4 Preparação de banco e bootstrap de Super Adm

- **ID**: US-004
- **Description**: Como equipe técnica, quero scripts SQL idempotentes para habilitar o novo papel e criar o Super Adm com segurança.
- **Acceptance Criteria**:
  - Script de role/constraints executa sem dependências manuais adicionais.
  - Script de RLS cria políticas para `admin_geral`.
  - Script de criação de Super Adm faz upsert no `public.users`.
