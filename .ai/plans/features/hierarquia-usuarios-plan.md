# PRD: Sistema de Hierarquia de Usuários

## 1. Product overview

### 1.1 Document title and version

- PRD: Sistema de Hierarquia de Usuários
- Version: 1.0

### 1.2 Product summary

O sistema de gestão de cartório atualmente possui usuários com tipos definidos (admin, supervisor, atendente) mas não implementa controle de acesso baseado nesses tipos. Esta feature visa implementar um sistema de hierarquia de usuários com dois níveis principais: "Administrador" e "Atendente", onde cada tipo terá diferentes permissões de acesso às páginas e funcionalidades do sistema.

O Administrador terá acesso total a todas as páginas e funcionalidades, enquanto o Atendente terá restrições de acesso às páginas "Usuários" e "Configurações". Este sistema garantirá que apenas usuários com as permissões adequadas possam acessar áreas sensíveis do sistema, melhorando a segurança e o controle organizacional.

## 2. Goals

### 2.1 Business goals

- Implementar controle de acesso baseado em funções (RBAC - Role-Based Access Control)
- Melhorar a segurança do sistema restringindo acesso a áreas sensíveis
- Permitir melhor organização e delegação de responsabilidades dentro do cartório
- Prevenir que usuários não autorizados modifiquem configurações críticas do sistema
- Facilitar a gestão de permissões através de tipos de usuário bem definidos

### 2.2 User goals

- **Administradores**: Ter controle total sobre o sistema, incluindo gestão de usuários e configurações
- **Atendentes**: Acessar as funcionalidades operacionais necessárias para o dia a dia sem se preocupar com configurações complexas
- **Todos os usuários**: Ter clareza sobre quais áreas do sistema podem acessar

### 2.3 Non-goals

- Implementar níveis de hierarquia mais complexos (por enquanto, apenas Administrador e Atendente)
- Criar sistema de permissões granulares por funcionalidade individual
- Implementar aprovação de ações entre diferentes níveis hierárquicos
- Criar sistema de auditoria de acessos (pode ser implementado posteriormente)
- Permitir que usuários tenham múltiplas funções simultaneamente

## 3. User personas

### 3.1 Key user types

- Administradores do Cartório
- Atendentes do Cartório

### 3.2 Basic persona details

- **Carlos - Administrador**: Responsável pela gestão geral do cartório, configuração do sistema, e gerenciamento de equipe. Precisa de acesso total para configurar integrações, gerenciar usuários e ajustar configurações do sistema.
- **Ana - Atendente**: Trabalha no atendimento diário ao público, registra protocolos, consulta informações e acompanha processos. Não precisa acessar configurações do sistema ou gerenciar outros usuários.

### 3.3 Role-based access

- **Administrador**: 
  - Acesso total a todas as páginas do sistema
  - Pode gerenciar usuários (criar, editar, desativar)
  - Pode acessar e modificar todas as configurações do sistema
  - Pode visualizar e gerenciar todos os dados do cartório
  
- **Atendente**: 
  - Acesso a páginas operacionais: Dashboard, Protocolos, Contas, Relatórios, IA, CNIB, Notificações, Perfil
  - NÃO pode acessar: Usuários, Configurações
  - Pode visualizar e criar dados relacionados às suas funções
  - Pode editar apenas dados que criou (dependendo da implementação futura)

## 4. Functional requirements

- **Controle de Acesso na Sidebar** (Priority: High)
  - Ocultar ou desabilitar itens do menu lateral para usuários sem permissão
  - Exibir apenas as páginas/funcionalidades acessíveis ao tipo de usuário
  - Aplicar estilo visual diferenciado para itens restritos (se aplicável)

- **Proteção de Rotas** (Priority: Critical)
  - Implementar middleware ou guards de rota para verificar permissões
  - Redirecionar usuários não autorizados que tentarem acessar páginas restritas
  - Exibir mensagem de erro apropriada quando acesso for negado
  - Garantir que acesso direto via URL também seja bloqueado

- **Gerenciamento de Tipo de Usuário** (Priority: High)
  - Buscar informações do tipo de usuário do banco de dados (tabela users)
  - Armazenar tipo de usuário no contexto de autenticação
  - Disponibilizar tipo de usuário para todos os componentes que precisarem

- **Interface Visual de Restrições** (Priority: Medium)
  - Exibir mensagem clara quando usuário tentar acessar página restrita
  - Oferecer botão de retorno para página autorizada
  - (Opcional) Mostrar tooltip explicativo em itens de menu desabilitados

- **Validação de Permissões no Backend** (Priority: High)
  - Implementar verificação de permissões nas API routes
  - Retornar erro 403 (Forbidden) para requisições não autorizadas
  - Garantir que mesmo que o frontend seja burlado, o backend mantenha a segurança

## 5. User experience

### 5.1 Entry points & first-time user flow

- Após o login, o sistema busca automaticamente o tipo de usuário da base de dados
- O tipo de usuário é armazenado no contexto de autenticação
- A sidebar é renderizada exibindo apenas os itens aos quais o usuário tem acesso
- Não há necessidade de configuração manual pelo usuário

### 5.2 Core experience

- **Login e Carregamento de Perfil**: 
  - Ao fazer login, o sistema busca os dados do usuário incluindo o tipo
  - O tipo é armazenado no contexto e disponibilizado para toda a aplicação
  - A interface é ajustada automaticamente baseada nas permissões

- **Navegação pelo Sistema (Atendente)**:
  - Ao acessar o sistema, vê apenas os itens de menu permitidos
  - Não visualiza links para "Usuários" e "Configurações" na sidebar
  - Pode navegar livremente pelas páginas operacionais
  - Tem experiência simplificada e focada nas tarefas do dia a dia

- **Navegação pelo Sistema (Administrador)**:
  - Vê todos os itens de menu disponíveis
  - Tem acesso completo a todas as funcionalidades
  - Pode gerenciar usuários e suas permissões
  - Pode configurar o sistema conforme necessário

- **Tentativa de Acesso Não Autorizado**:
  - Se usuário tentar acessar URL diretamente (ex: /usuarios)
  - Sistema detecta falta de permissão
  - Exibe página de erro 403 ou redireciona para dashboard
  - Mostra mensagem clara: "Você não tem permissão para acessar esta página"
  - Oferece botão para voltar ao dashboard

### 5.3 Advanced features & edge cases

- Usuário sem tipo definido: Tratar como Atendente por padrão (mais restritivo)
- Mudança de tipo de usuário: Recarregar permissões ao detectar atualização
- Sessão expirada: Redirecionar para login e limpar cache de permissões
- Múltiplas abas abertas: Garantir consistência de permissões em todas

### 5.4 UI/UX highlights

- Interface limpa e intuitiva
- Ausência de itens restritos evita confusão e frustração
- Mensagens de erro claras e amigáveis
- Transições suaves na interface
- Design consistente com o restante do sistema

## 6. Narrative

Ana, atendente do cartório, faz login no sistema pela manhã. Ao acessar, ela vê imediatamente o dashboard com as informações dos protocolos do dia e um menu lateral simplificado, focado apenas nas ferramentas que precisa: protocolos, contas, relatórios e consultas CNIB. Ela não precisa se preocupar com configurações complexas ou gerenciamento de usuários - essas opções simplesmente não aparecem para ela. Ana trabalha de forma eficiente durante todo o dia, registrando protocolos e consultando informações, sem distrações ou riscos de modificar configurações acidentalmente.

Já Carlos, o administrador, tem acesso completo ao sistema. Ele pode gerenciar a equipe de atendentes, configurar integrações com sistemas externos, e ajustar as configurações conforme necessário. Carlos aprecia ter controle total, sabendo que informações sensíveis e configurações críticas estão protegidas e acessíveis apenas a ele.

## 7. Success metrics

### 7.1 User-centric metrics

- Usuários conseguem acessar todas as páginas permitidas sem problemas
- Nenhum usuário reporta acesso indevido a áreas restritas
- Redução de erros causados por modificações acidentais de configurações
- Satisfação dos usuários com a organização e clareza do sistema

### 7.2 Business metrics

- 100% das tentativas de acesso não autorizado bloqueadas
- Zero incidentes de segurança relacionados a permissões
- Tempo de configuração de novos usuários reduzido
- Conformidade com requisitos de segurança e auditoria

### 7.3 Technical metrics

- Tempo de resposta < 100ms para verificação de permissões
- Cobertura de testes para lógica de permissões > 90%
- Zero falhas de segurança em penetration testing
- Logs de acesso funcionando corretamente

## 8. Technical considerations

### 8.1 Integration points

- **Supabase (tabela users)**: Buscar informações de tipo de usuário
- **AuthContext**: Armazenar e disponibilizar informações de permissões
- **Next.js Middleware**: Proteger rotas no nível do servidor
- **Componentes de Layout**: Ajustar visualização da sidebar baseado em permissões

### 8.2 Data storage & privacy

- Tipo de usuário já está armazenado na tabela `users` (campo `tipo`)
- Não há necessidade de armazenar dados adicionais de permissões
- Informações de tipo de usuário são consideradas não sensíveis (dentro do contexto de autenticação)
- Não há coleta de dados adicionais relacionados a permissões

### 8.3 Scalability & performance

- Verificação de permissões deve ser feita em memória (contexto) sem consultas adicionais ao BD
- Cache de tipo de usuário na sessão para evitar consultas repetidas
- Implementação leve que não impacta performance da aplicação
- Preparado para expansão futura com mais níveis de hierarquia

### 8.4 Potential challenges

- **Sincronização de Estado**: Garantir que mudanças de tipo de usuário sejam refletidas imediatamente em todas as abas/sessões
- **Rotas Dinâmicas**: Proteger não apenas páginas estáticas mas também rotas dinâmicas (ex: /protocolos/[id])
- **API Routes**: Garantir que todas as API routes também verifiquem permissões
- **Compatibilidade**: Manter compatibilidade com sistema existente sem quebrar funcionalidades
- **Migração**: Garantir que usuários existentes tenham tipo definido (migração de dados se necessário)

## 9. Milestones & sequencing

### 9.1 Project estimate

- Small: 1-2 dias de desenvolvimento

### 9.2 Team size & composition

- Small Team: 1 pessoa (1 Dev Full-Stack)

### 9.3 Suggested phases

- **Fase 1: Preparação e Contexto de Permissões** (4 horas)
  - Key deliverables: AuthContext atualizado, hook de permissões criado, tipos TypeScript definidos

- **Fase 2: Proteção de Rotas e Sidebar** (3 horas)
  - Key deliverables: Middleware de proteção, sidebar com controle de visibilidade, página de acesso negado

- **Fase 3: Validação Backend e Testes** (2 horas)
  - Key deliverables: Verificação de permissões nas API routes, testes de acesso, documentação

## 10. User stories

### 10.1 Controle de visualização da sidebar

- **ID**: US-001
- **Description**: Como um atendente, eu quero ver apenas as opções de menu que tenho permissão para acessar, para que minha interface seja mais simples e focada no meu trabalho.
- **Acceptance Criteria**:
  - Sidebar exibe apenas itens permitidos para o tipo de usuário logado
  - Itens "Usuários" e "Configurações" não aparecem para atendentes
  - Administradores veem todos os itens de menu
  - Transição visual suave ao carregar a sidebar

### 10.2 Proteção de rotas restritas

- **ID**: US-002
- **Description**: Como administrador do sistema, eu quero que atendentes sejam impedidos de acessar páginas de Usuários e Configurações, para garantir a segurança e integridade do sistema.
- **Acceptance Criteria**:
  - Tentativa de acesso direto via URL é bloqueada
  - Usuário é redirecionado para página de erro ou dashboard
  - Mensagem clara é exibida explicando a restrição
  - Sistema registra tentativa de acesso não autorizado (opcional/futuro)

### 10.3 Carregamento de informações de permissão

- **ID**: US-003
- **Description**: Como desenvolvedor, eu quero que o tipo de usuário seja carregado automaticamente após o login e disponibilizado via contexto, para facilitar verificações de permissão em toda a aplicação.
- **Acceptance Criteria**:
  - Tipo de usuário é buscado da tabela users após login bem-sucedido
  - Informação é armazenada no AuthContext
  - Hook `useAuth` disponibiliza informações de permissão
  - Tipo de usuário é atualizado se houver mudança na sessão

### 10.4 Feedback visual de acesso negado

- **ID**: US-004
- **Description**: Como um usuário, eu quero receber feedback claro e amigável quando tentar acessar uma página restrita, para entender por que não consigo acessá-la.
- **Acceptance Criteria**:
  - Página de erro 403 personalizada é exibida
  - Mensagem clara explica que o acesso é restrito
  - Botão "Voltar ao Dashboard" é disponibilizado
  - Design consistente com o resto da aplicação

### 10.5 Validação de permissões no backend

- **ID**: US-005
- **Description**: Como administrador do sistema, eu quero que as API routes também verifiquem permissões, para garantir segurança mesmo se o frontend for comprometido.
- **Acceptance Criteria**:
  - Todas as API routes sensíveis verificam tipo de usuário
  - Requisições não autorizadas retornam erro 403
  - Validação é feita antes de processar qualquer lógica de negócio
  - Logs de tentativas de acesso não autorizado são registrados (opcional)
