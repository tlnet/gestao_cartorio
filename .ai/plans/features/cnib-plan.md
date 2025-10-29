# PRD: Página CNIB - Consulta de Indisponibilidade

## 1. Product overview

### 1.1 Document title and version

- PRD: Página CNIB - Consulta de Indisponibilidade
- Version: 1.0

### 1.2 Product summary

Esta funcionalidade visa criar uma página dedicada para consultas ao sistema CNIB (Centro Nacional de Informações de Bens) através da integração com o portal https://indisponibilidade.onr.org.br/.

Em sua primeira fase, o desenvolvimento focará apenas na criação do layout visual e estrutura da página, seguindo os padrões de design já estabelecidos no sistema. A página permitirá que usuários do cartório insiram CPF/CNPJ para consulta e visualizem os resultados retornados, preparando a base para futura implementação da integração real com a API do CNIB.

## 2. Goals

### 2.1 Business goals

- Facilitar o acesso aos serviços de consulta CNIB diretamente do sistema de gestão do cartório
- Reduzir a necessidade de acesso manual ao portal externo do CNIB
- Preparar a infraestrutura para futura integração automatizada com a API do CNIB
- Melhorar a eficiência operacional dos cartórios na verificação de indisponibilidade de bens

### 2.2 User goals

- Realizar consultas CNIB de forma rápida e intuitiva
- Visualizar resultados de consultas de forma organizada e legível
- Ter uma interface consistente com o restante do sistema
- Poder realizar múltiplas consultas de forma prática

### 2.3 Non-goals

- Integração real com a API do CNIB (será desenvolvida em fase posterior)
- Histórico de consultas realizadas (pode ser considerado em versão futura)
- Exportação de resultados (pode ser considerado em versão futura)
- Notificações automáticas baseadas em consultas (pode ser considerado em versão futura)

## 3. User personas

### 3.1 Key user types

- Cartorários e atendentes que realizam consultas frequentes ao CNIB
- Supervisores que precisam validar informações de indisponibilidade

### 3.2 Basic persona details

- **Cartorário/Atendente**: Usuário que realiza consultas diárias ao CNIB como parte do processo de análise de protocolos e processos
- **Supervisor**: Usuário que precisa verificar informações de indisponibilidade para validação de processos importantes

### 3.3 Role-based access

- **admin**: Acesso completo à página CNIB
- **supervisor**: Acesso completo à página CNIB
- **atendente**: Acesso completo à página CNIB (consulta é parte do fluxo de trabalho)

## 4. Functional requirements

- **Campo de Entrada CPF/CNPJ** (Priority: High)

  - Campo de texto com validação de formato CPF/CNPJ
  - Máscara de formatação automática (000.000.000-00 para CPF ou 00.000.000/0000-00 para CNPJ)
  - Validação de dígitos verificadores (opcional nesta fase)
  - Limpeza automática de caracteres especiais antes do envio

- **Botão de Consulta** (Priority: High)

  - Botão destacado para iniciar a consulta
  - Estado de loading durante o processamento (simulado nesta fase)
  - Feedback visual durante o processo

- **Área de Resultados** (Priority: High)

  - Seção dedicada para exibição dos resultados da consulta
  - Layout responsivo e organizado
  - Estados vazios quando não há consulta realizada
  - Preparação para exibir estrutura de dados do CNIB

- **Layout Consistente** (Priority: Medium)
  - Seguir padrões visuais das outras páginas do sistema
  - Usar componentes Shadcn/UI já estabelecidos
  - Integração com MainLayout e Sidebar
  - Responsividade mobile/desktop

## 5. User experience

### 5.1 Entry points & first-time user flow

- Usuário acessa a página CNIB através do menu lateral (Sidebar)
- Ao carregar a página, vê um formulário simples com campo CPF/CNPJ
- Área de resultados aparece inicialmente vazia ou com mensagem de boas-vindas

### 5.2 Core experience

- **Passo 1**: Usuário preenche o campo CPF/CNPJ

  - Campo aceita CPF ou CNPJ e aplica formatação automática
  - Validação em tempo real indica se o formato está correto

- **Passo 2**: Usuário clica no botão "Consultar"

  - Botão fica em estado de loading
  - Mensagem de "Consultando..." é exibida
  - (Nesta fase, simulará um delay de 1-2 segundos)

- **Passo 3**: Resultados são exibidos na área de resultados
  - Área de resultados é expandida/se torna visível
  - Estrutura preparada para exibir dados do CNIB (nesta fase pode mostrar dados mockados ou estrutura vazia)
  - Botão permite nova consulta

### 5.3 Advanced features & edge cases

- Limpar campo e resultados para nova consulta
- Tratamento de erros de validação (CPF/CNPJ inválido)
- Mensagem amigável quando campo está vazio ao tentar consultar
- Layout responsivo para dispositivos móveis

### 5.4 UI/UX highlights

- Design limpo e focado na tarefa principal
- Feedback visual claro em cada etapa do processo
- Cores e estilos consistentes com o restante do sistema
- Animações sutis para transições de estado

## 6. Narrative

Um cartorário precisa verificar a indisponibilidade de bens de um CPF/CNPJ específico. Ao invés de acessar o portal externo do CNIB, ele acessa a página CNIB no sistema do cartório, insere o documento, clica em consultar e visualiza os resultados de forma organizada, tudo dentro do mesmo ambiente que já usa para outros processos.

## 7. Success metrics

### 7.1 User-centric metrics

- Facilidade de uso da interface (avaliação subjetiva)
- Tempo necessário para realizar uma consulta (deve ser rápido e intuitivo)

### 7.2 Business metrics

- Redução de tempo gasto em consultas CNIB (quando integração real for implementada)
- Adoção da funcionalidade pelos usuários

### 7.3 Technical metrics

- Tempo de carregamento da página (< 2 segundos)
- Responsividade em diferentes dispositivos

## 8. Technical considerations

### 8.1 Integration points

- Integração futura com API do CNIB (https://indisponibilidade.onr.org.br/)
- Uso de componentes existentes do sistema (MainLayout, Card, Input, Button)
- Integração com sistema de autenticação existente

### 8.2 Data storage & privacy

- Nesta fase inicial, não há armazenamento de dados
- Em versão futura, considerar privacidade e LGPD ao armazenar consultas realizadas

### 8.3 Scalability & performance

- Página deve carregar rapidamente
- Componentes otimizados para re-renderização mínima
- Preparação para futuras requisições à API externa

### 8.4 Potential challenges

- Validação adequada de CPF/CNPJ
- Formatação correta de diferentes tamanhos de documento
- Preparação da estrutura para diferentes formatos de resposta da API CNIB

## 9. Milestones & sequencing

### 9.1 Project estimate

- Small: 1-2 semanas (apenas layout visual)

### 9.2 Team size & composition

- Small Team: 1 desenvolvedor (1 Eng)

### 9.3 Suggested phases

- **Fase 1**: Criação da estrutura básica da página (1-2 dias)

  - Key deliverables: Página CNIB criada, rota configurada, integração com sidebar

- **Fase 2**: Implementação do formulário de consulta (2-3 dias)

  - Key deliverables: Campo CPF/CNPJ com validação e máscara, botão de consulta

- **Fase 3**: Área de resultados e refinamentos (2-3 dias)
  - Key deliverables: Área de resultados estruturada, estados de loading, tratamento de erros

## 10. User stories

### 10.1 Consulta CNIB por CPF/CNPJ

- **ID**: US-001
- **Description**: Como cartorário, eu quero inserir um CPF ou CNPJ e realizar uma consulta CNIB para verificar indisponibilidade de bens.
- **Acceptance Criteria**:
  - Campo aceita CPF no formato 000.000.000-00
  - Campo aceita CNPJ no formato 00.000.000/0000-00
  - Máscara é aplicada automaticamente durante a digitação
  - Botão de consulta só fica habilitado quando há um CPF/CNPJ válido
  - Ao clicar em consultar, aparece feedback visual de loading

### 10.2 Visualização de Resultados

- **ID**: US-002
- **Description**: Como cartorário, eu quero visualizar os resultados da consulta CNIB de forma organizada e legível.
- **Acceptance Criteria**:
  - Área de resultados aparece após a consulta ser realizada
  - Layout é responsivo e funciona em diferentes tamanhos de tela
  - Estrutura está preparada para exibir dados do CNIB (mesmo que vazia nesta fase)
  - Botão para realizar nova consulta está disponível

### 10.3 Validação e Tratamento de Erros

- **ID**: US-003
- **Description**: Como cartorário, eu quero ser informado quando o CPF/CNPJ está inválido ou quando há problemas na consulta.
- **Acceptance Criteria**:
  - Validação em tempo real do formato do documento
  - Mensagem de erro clara quando formato está inválido
  - Mensagem informativa quando campo está vazio ao tentar consultar
  - Tratamento de estados de erro de forma amigável
