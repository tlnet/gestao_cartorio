# PRD: Sistema de Convite de Usuários

## 1. Product overview

### 1.1 Document title and version

- PRD: Sistema de Convite de Usuários
- Version: 1.0

### 1.2 Product summary

Este documento especifica o sistema de convite de usuários para o sistema de gestão de cartórios. Quando um administrador cria um novo usuário, ao invés de definir uma senha inicial, o sistema gerará um link único de convite que será enviado ao novo usuário por email ou WhatsApp. O novo usuário acessará este link e definirá sua própria senha, garantindo maior segurança e privacidade.

O sistema implementará tokens de convite com prazo de validade, uma página dedicada para ativação de conta onde o usuário visualizará seus dados pré-cadastrados (nome, email, telefone) e definirá apenas sua senha. Este fluxo garante que o usuário tenha controle total sobre suas credenciais desde o início, seguindo melhores práticas de segurança.

## 2. Goals

### 2.1 Business goals

- Melhorar a segurança no processo de criação de usuários
- Eliminar a necessidade de o administrador definir senhas temporárias
- Reduzir riscos de compartilhamento de senhas iniciais
- Proporcionar uma experiência profissional de onboarding
- Facilitar o gerenciamento de convites pendentes

### 2.2 User goals

- Permitir que administradores convidem novos usuários de forma segura
- Permitir que novos usuários definam suas próprias senhas
- Fornecer feedback claro sobre o status dos convites (pendente, aceito, expirado)
- Garantir que apenas pessoas autorizadas possam acessar o sistema

### 2.3 Non-goals

- Implementar recuperação de senha (feature separada)
- Implementar convite em lote (pode ser adicionado futuramente)
- Envio automático de emails (será implementado posteriormente com integração de serviço de email)
- Sistema de renovação automática de convites expirados

## 3. User personas

### 3.1 Key user types

- Administrador do cartório
- Novo usuário convidado (Atendente)

### 3.2 Basic persona details

- **Administrador**: Responsável por gerenciar usuários do cartório, incluindo criar convites e acompanhar o status das ativações
- **Novo Usuário (Atendente)**: Profissional recém-contratado que precisa ativar sua conta para começar a trabalhar no sistema

### 3.3 Role-based access

- **Administrador**: Pode criar convites, visualizar lista de convites pendentes, reenviar convites, cancelar convites
- **Novo Usuário (Não autenticado)**: Pode acessar página de ativação via link único, visualizar seus dados pré-cadastrados e definir senha

## 4. Functional requirements

- **Geração de Token de Convite** (Priority: High)
  - Gerar token único e seguro (UUID v4 ou similar)
  - Definir prazo de validade (sugerido: 7 dias)
  - Armazenar token no banco de dados vinculado ao usuário
  - Retornar URL completa com token para compartilhamento

- **Persistência de Dados de Convite** (Priority: High)
  - Criar tabela ou campos na tabela `users` para armazenar: token, data de criação, data de expiração, status
  - Garantir que tokens sejam únicos e indexados para busca rápida
  - Permitir múltiplos convites para o mesmo usuário (caso o anterior expire)

- **Página de Ativação de Conta** (Priority: Critical)
  - Criar rota `/ativar-conta?token={token}` ou `/definir-senha?token={token}`
  - Validar token: verificar existência, validade (não expirado), e se não foi já utilizado
  - Exibir dados do usuário (nome, email, telefone) - somente leitura
  - Formulário para definir senha (com confirmação e validação de força)
  - Feedback visual de erro para tokens inválidos ou expirados

- **Integração com Criação de Usuário** (Priority: Critical)
  - Modificar fluxo de criação de usuário para não exigir senha
  - Após criar usuário no banco, gerar token de convite
  - Exibir link de convite ao administrador (copiar para área de transferência)
  - Marcar usuário como "pendente de ativação" até que defina senha

- **Listagem e Gerenciamento de Convites** (Priority: Medium)
  - Na página de usuários, exibir badge/status indicando "Aguardando ativação"
  - Permitir administrador reenviar convite (gera novo token)
  - Permitir administrador cancelar convite (invalida token e remove usuário ou marca como inativo)
  - Filtro na listagem de usuários para ver apenas "Convites pendentes"

- **Validação e Segurança** (Priority: High)
  - Validar força da senha (mínimo 8 caracteres, maiúsculas, minúsculas, números)
  - Implementar rate limiting na página de ativação (prevenir ataques de força bruta)
  - Hash seguro da senha antes de salvar (bcrypt, argon2, ou similar - usar padrão do Supabase)
  - Invalidar token após uso bem-sucedido

## 5. User experience

### 5.1 Entry points & first-time user flow

- **Administrador**: Na página de Usuários, clica em "Cadastrar Novo Usuário", preenche dados (sem senha), clica em "Enviar Convite"
- **Novo Usuário**: Recebe link por email/WhatsApp, clica no link, é redirecionado para página de ativação

### 5.2 Core experience

- **Passo 1: Administrador cria convite**
  - Formulário simplificado (remove campo senha)
  - Após submit, exibe modal de sucesso com link de convite gerado
  - Botão "Copiar Link" para facilitar compartilhamento
  - Instrução clara de que o link expira em 7 dias

- **Passo 2: Novo usuário acessa link**
  - Validação automática do token ao carregar página
  - Se válido: exibe formulário de ativação
  - Se inválido/expirado: exibe mensagem de erro clara com instruções

- **Passo 3: Definição de senha**
  - Campos: "Nova Senha" e "Confirmar Senha"
  - Indicador visual de força da senha
  - Validação em tempo real (senhas coincidem, requisitos atendidos)
  - Botão "Ativar Conta" desabilitado até validações passarem

- **Passo 4: Confirmação e redirecionamento**
  - Mensagem de sucesso
  - Redirecionamento automático para página de login após 2 segundos
  - Opção de fazer login imediatamente

### 5.3 Advanced features & edge cases

- Token já utilizado: exibir mensagem informando que conta já foi ativada
- Token expirado: exibir mensagem com orientação para contatar administrador
- Administrador pode ver histórico de convites enviados
- Notificação para administrador quando convite é aceito (opcional)
- Resend automático de convite próximo do vencimento (opcional)

### 5.4 UI/UX highlights

- Página de ativação com design limpo e focado
- Logo do sistema no topo
- Card centralizado com informações do usuário
- Feedback visual claro em cada etapa
- Loading states durante validações
- Mensagens de erro amigáveis e instrucionais
- Design responsivo para acesso mobile

## 6. Narrative

José, administrador do cartório, precisa cadastrar Maria, a nova atendente. Ele acessa a página de Usuários, clica em "Cadastrar Novo Usuário" e preenche nome, email e telefone de Maria, sem se preocupar com senha. Ao clicar em "Enviar Convite", o sistema gera um link único que José copia e envia para Maria por WhatsApp. Maria recebe o link, clica e é direcionada para uma página onde vê seus dados já preenchidos. Ela precisa apenas criar uma senha segura. Após definir a senha, sua conta é ativada e ela pode fazer login imediatamente. José vê na lista de usuários que Maria está ativa, e Maria tem controle total sobre sua senha desde o início, garantindo privacidade e segurança.

## 7. Success metrics

### 7.1 User-centric metrics

- Taxa de ativação de convites (% de convites aceitos vs enviados)
- Tempo médio entre envio de convite e ativação
- Número de convites que expiram sem uso
- Satisfação do administrador com processo de convite

### 7.2 Business metrics

- Redução no tempo de onboarding de novos usuários
- Redução em tickets de suporte relacionados a senhas iniciais
- Aumento na segurança percebida do sistema

### 7.3 Technical metrics

- Taxa de erro na validação de tokens
- Performance da página de ativação (tempo de carregamento)
- Taxa de tentativas de acesso com tokens inválidos (possíveis ataques)

## 8. Technical considerations

### 8.1 Integration points

- **Supabase Auth**: Atualizar senha do usuário após ativação
- **Supabase Database**: Armazenar tokens e status de convites
- **API Routes**: Criar endpoints para geração, validação e consumo de tokens
- **Email/WhatsApp** (futuro): Integrar com serviço de notificações para envio automático

### 8.2 Data storage & privacy

- Tokens devem ser armazenados de forma segura (hash ou criptografia)
- Dados pessoais exibidos na página de ativação devem ser transmitidos via HTTPS
- Implementar políticas RLS no Supabase para controlar acesso aos dados de convite
- LGPD: Garantir que dados de usuários pendentes possam ser removidos se solicitado

### 8.3 Scalability & performance

- Índice na coluna de token para busca rápida
- Limpeza automática de tokens expirados (job periódico ou on-demand)
- Cache de validação de token para evitar múltiplas consultas ao banco
- Limite de tentativas de validação de token por IP

### 8.4 Potential challenges

- **Sincronização com Supabase Auth**: Garantir que usuário é criado no auth.users mas com status "não confirmado" até ativar convite
- **Tokens expirados**: Decidir se usuário "convite expirado" deve ser removido ou mantido como inativo
- **Reenvio de convites**: Invalidar token anterior ao gerar novo para mesmo usuário
- **Rate limiting**: Implementar proteção contra tentativas de força bruta em tokens

## 9. Milestones & sequencing

### 9.1 Project estimate

- Medium: 1-2 semanas

### 9.2 Team size & composition

- Small Team: 1-2 pessoas (1 Desenvolvedor Full-Stack ou 1 Backend + 1 Frontend)

### 9.3 Suggested phases

- **Phase 1: Backend e Banco de Dados** (3-4 dias)
  - Key deliverables: Schema de banco de dados, API routes para geração/validação de tokens, integração com Supabase Auth
  
- **Phase 2: Frontend - Página de Ativação** (2-3 dias)
  - Key deliverables: Página `/ativar-conta`, validação de token, formulário de senha, UX completa
  
- **Phase 3: Integração com Criação de Usuário** (2 dias)
  - Key deliverables: Modificar formulário de criação, exibir modal com link de convite, atualizar listagem de usuários
  
- **Phase 4: Testes e Refinamentos** (1-2 dias)
  - Key deliverables: Testes de fluxo completo, ajustes de UX, validação de segurança

## 10. User stories

### 10.1 Criar Convite de Usuário

- **ID**: US-001
- **Description**: Como administrador, eu quero criar um convite para um novo usuário sem precisar definir uma senha, para que o próprio usuário possa criar sua senha de forma segura.
- **Acceptance Criteria**:
  - Formulário de criação de usuário não exige campo de senha
  - Após submit, sistema gera token único de convite
  - Link completo de convite é exibido ao administrador
  - Link pode ser copiado para área de transferência
  - Usuário é criado no banco com status "pendente de ativação"

### 10.2 Validar Token de Convite

- **ID**: US-002
- **Description**: Como novo usuário, eu quero acessar um link de convite válido para poder ativar minha conta, garantindo que apenas eu possa definir minha senha.
- **Acceptance Criteria**:
  - Ao acessar URL com token válido, página de ativação carrega normalmente
  - Token inválido exibe mensagem de erro clara
  - Token expirado exibe mensagem específica com instruções
  - Token já utilizado informa que conta já está ativa

### 10.3 Definir Senha na Ativação

- **ID**: US-003
- **Description**: Como novo usuário, eu quero definir minha senha ao ativar minha conta, para ter controle total sobre minhas credenciais desde o início.
- **Acceptance Criteria**:
  - Formulário exibe campos de "Nova Senha" e "Confirmar Senha"
  - Validação em tempo real de força da senha
  - Validação de que senhas coincidem
  - Indicador visual de requisitos de senha (8+ caracteres, maiúsculas, etc.)
  - Botão de ativação só fica habilitado quando validações passam

### 10.4 Ativar Conta com Sucesso

- **ID**: US-004
- **Description**: Como novo usuário, após definir minha senha, eu quero que minha conta seja ativada automaticamente e poder fazer login imediatamente.
- **Acceptance Criteria**:
  - Após submit bem-sucedido, senha é salva no Supabase Auth
  - Token é invalidado/marcado como usado
  - Usuário no banco é marcado como "ativo"
  - Mensagem de sucesso é exibida
  - Redirecionamento automático para página de login após 2-3 segundos

### 10.5 Visualizar Status de Convites

- **ID**: US-005
- **Description**: Como administrador, eu quero visualizar na lista de usuários quais convites estão pendentes de ativação, para acompanhar o status de novos usuários.
- **Acceptance Criteria**:
  - Badge "Aguardando Ativação" aparece para usuários com convite pendente
  - Badge "Ativo" aparece após usuário ativar conta
  - Filtro na listagem permite ver apenas convites pendentes
  - Data de envio do convite é exibida (opcional)

### 10.6 Reenviar Convite Expirado

- **ID**: US-006
- **Description**: Como administrador, eu quero reenviar um convite para um usuário caso o convite anterior tenha expirado, gerando um novo link válido.
- **Acceptance Criteria**:
  - Botão "Reenviar Convite" disponível para usuários com convite pendente
  - Ao clicar, sistema invalida token anterior
  - Novo token é gerado com nova data de expiração
  - Novo link é exibido ao administrador
  - Modal confirma que convite foi reenviado

### 10.7 Cancelar Convite

- **ID**: US-007
- **Description**: Como administrador, eu quero cancelar um convite pendente caso o novo usuário não seja mais necessário, para manter a lista de usuários limpa.
- **Acceptance Criteria**:
  - Botão "Cancelar Convite" disponível para usuários com convite pendente
  - Modal de confirmação pergunta se deseja cancelar
  - Ao confirmar, token é invalidado
  - Usuário é removido da lista ou marcado como "Convite Cancelado"
  - Ação não pode ser desfeita

### 10.8 Prevenir Uso Indevido de Token

- **ID**: US-008
- **Description**: Como sistema, eu quero implementar medidas de segurança para prevenir uso indevido de tokens de convite, garantindo que apenas usuários legítimos possam ativar contas.
- **Acceptance Criteria**:
  - Rate limiting na página de ativação (máx. 5 tentativas por IP em 10 minutos)
  - Token é invalidado após uso bem-sucedido
  - Token expira após 7 dias
  - Tentativas de acesso com token inválido são logadas
  - Hash seguro é usado para armazenar ou validar tokens
