# PRD: Refatoração do Upload de Documentos para Minuta

## 1. Product overview

### 1.1 Document title and version

- PRD: Refatoração do Upload de Documentos para Geração de Minuta
- Version: 1.0

### 1.2 Product summary

A funcionalidade atual de "Gerar Minuta de Documento" permite o upload de documentos em categorias genéricas. Esta refatoração visa transformar a experiência de upload em um processo mais estruturado e guiado, onde cada categoria de documento abre um modal específico com campos obrigatórios e upload de documentos específicos.

O novo fluxo será baseado em cards que, ao serem clicados, abrem modais individuais para cada categoria: Documentos dos Compradores, Documentos dos Vendedores, Certidões Fiscais e Documentos do Imóvel. Cada modal conterá campos de dados obrigatórios e upload de documentos específicos, garantindo que todas as informações necessárias sejam coletadas antes de gerar a minuta.

## 2. Goals

### 2.1 Business goals

- Aumentar a qualidade dos dados coletados para geração de minutas
- Reduzir erros e retrabalho na análise de documentos
- Melhorar a experiência do usuário com um fluxo mais guiado
- Garantir completude das informações antes do processamento

### 2.2 User goals

- Entender claramente quais documentos e informações são necessários
- Preencher informações de forma organizada e estruturada
- Ter feedback claro sobre o preenchimento obrigatório
- Enviar documentos com confiança de que todas as informações estão completas

### 2.3 Non-goals

- Não incluir validação de documentos (OCR ou análise automática)
- Não adicionar funcionalidades de edição de minutas geradas
- Não implementar salvamento de rascunhos (nesta versão)

## 3. User personas

### 3.1 Key user types

- Atendentes de cartório
- Supervisores
- Administradores do sistema

### 3.2 Basic persona details

- **Atendente**: Funcionário responsável por coletar e organizar documentos para processos de escritura
- **Supervisor**: Profissional que revisa e aprova documentos antes do envio final

### 3.3 Role-based access

- **Atendente**: Acesso completo ao formulário de upload e preenchimento de dados
- **Supervisor**: Acesso completo + visualização de histórico de uploads
- **Admin**: Acesso total ao sistema

## 4. Functional requirements

- **Card 1: Documentos dos Compradores** (Priority: High)
  - Campos obrigatórios: RG, CPF, Comprovante de Endereço, E-mail, Qualificação Profissional
  - Campos condicionais (se casado): RG e CPF do Cônjuge, E-mail do Cônjuge, Qualificação Profissional do Cônjuge, Certidão de Casamento
  - Upload de documentos: Aceitar apenas PDF, JPG, PNG
  - Validação: Todos os campos obrigatórios devem ser preenchidos

- **Card 2: Documentos dos Vendedores** (Priority: High)
  - Campos obrigatórios: RG, CPF, Comprovante de Endereço, E-mail, Qualificação Profissional
  - Campos condicionais (se casado): RG e CPF do Cônjuge, E-mail do Cônjuge, Qualificação Profissional do Cônjuge, Certidão de Casamento
  - Checkbox: "Mais de um vendedor"
  - Se múltiplos vendedores: Adicionar conjunto adicional de campos para cada vendedor
  - Upload de documentos: Aceitar apenas PDF, JPG, PNG
  - Validação: Todos os campos obrigatórios devem ser preenchidos para cada vendedor

- **Card 3: Certidões Fiscais** (Priority: High)
  - Upload obrigatório: CNDT (Certidão Negativa de Débitos Trabalhistas)
  - Upload obrigatório: CND Federal (Certidão Negativa de Débitos Federais)
  - Validação: Ambos os documentos devem ser enviados

- **Card 4: Documentos do Imóvel** (Priority: High)
  - Upload obrigatório: Matrícula do Imóvel Atualizada
  - Upload obrigatório: Guia ITBI
  - Upload obrigatório: Certidão de Ônus
  - Validação: Todos os três documentos devem ser enviados

- **Sistema de Validação Global** (Priority: Critical)
  - Botão "Gerar Minuta" deve ficar desabilitado até que todos os 4 cards estejam completos
  - Indicadores visuais nos cards mostrando status (pendente/completo)
  - Mensagem clara informando quais cards ainda precisam ser preenchidos

## 5. User experience

### 5.1 Entry points & first-time user flow

- Usuário acessa página "Análise de IA"
- Visualiza card "Gerar Minuta de Documento"
- Clica em "Enviar Documentos"
- Visualiza 4 cards principais no dialog

### 5.2 Core experience

- **Visualização dos Cards**: Usuário vê 4 cards grandes com ícones e status
  - Cards pendentes mostram badge "Pendente" em amarelo
  - Cards completos mostram badge "Completo" em verde
  
- **Preenchimento de Comprador**: Usuário clica no Card 1
  - Modal abre com formulário estruturado
  - Preenche campos de dados (RG, CPF, etc.)
  - Checkbox "Casado(a)?" expande campos do cônjuge
  - Upload de documentos no final do formulário
  - Botão "Salvar" valida e fecha modal
  
- **Preenchimento de Vendedor**: Usuário clica no Card 2
  - Similar ao comprador
  - Checkbox adicional "Mais de um vendedor"
  - Se marcado, adiciona novo conjunto de campos
  - Cada vendedor adicional tem seu próprio accordion/seção

- **Upload de Certidões**: Usuário clica no Card 3
  - Modal com dois campos de upload claros
  - Preview dos arquivos após upload
  - Botão "Salvar" valida presença dos dois arquivos

- **Upload de Documentos do Imóvel**: Usuário clica no Card 4
  - Modal com três campos de upload
  - Preview dos arquivos após upload
  - Botão "Salvar" valida presença dos três arquivos

- **Envio Final**: Após preencher todos os cards
  - Botão "Gerar Minuta" fica habilitado
  - Usuário clica e documentos são processados
  - Loading state durante processamento
  - Sucesso ou erro são exibidos

### 5.3 Advanced features & edge cases

- Edição de cards já preenchidos (reabrir modal e alterar dados)
- Remoção de vendedor adicional
- Substituição de arquivos já enviados
- Validação de formato de e-mail
- Validação de formato de CPF/RG (opcional, mas recomendado)

### 5.4 UI/UX highlights

- Cards com visual limpo e status claro
- Badges coloridos para indicar status
- Modais com scroll interno para formulários longos
- Preview de arquivos com opção de remover
- Feedback visual claro de campos obrigatórios
- Transições suaves entre estados

## 6. Narrative

Um atendente de cartório recebe documentos de um casal que está comprando um imóvel de um vendedor. Ao abrir o sistema, ele acessa "Gerar Minuta de Documento" e vê 4 cards claros indicando o que precisa ser preenchido. Ele começa pelos compradores, clicando no card e preenchendo todos os dados do casal, marcando "Casado" e incluindo os documentos do cônjuge. Depois, preenche os dados do vendedor, faz upload das certidões fiscais e dos documentos do imóvel. Com todos os cards completos e marcados em verde, ele clica em "Gerar Minuta" com confiança de que todas as informações necessárias foram fornecidas.

## 7. Success metrics

### 7.1 User-centric metrics

- Taxa de preenchimento completo dos formulários
- Tempo médio para preencher todos os cards
- Taxa de retrabalho (reopening de modais)
- Satisfação do usuário com o novo fluxo

### 7.2 Business metrics

- Redução de erros na geração de minutas
- Redução de tempo de processamento
- Aumento na taxa de minutas aprovadas sem revisão

### 7.3 Technical metrics

- Tempo de carregamento dos modais
- Taxa de erro no upload de arquivos
- Performance do sistema com múltiplos vendedores

## 8. Technical considerations

### 8.1 Integration points

- Integração com sistema de upload existente (Supabase Storage)
- Integração com webhook N8N para processamento de minutas
- Uso de hooks existentes (useRelatoriosIA, useN8NConfig)

### 8.2 Data storage & privacy

- Armazenamento temporário dos dados do formulário (state local)
- Upload seguro de arquivos para Supabase Storage
- Dados sensíveis (CPF, RG) não são armazenados permanentemente no frontend
- LGPD compliance: dados são enviados apenas quando usuário confirma

### 8.3 Scalability & performance

- Suporte para múltiplos vendedores (até 5 recomendado)
- Otimização de uploads com validação de tamanho (10MB por arquivo)
- Lazy loading de modais para melhor performance inicial

### 8.4 Potential challenges

- Complexidade do estado para gerenciar múltiplos vendedores
- Validação sincronizada entre múltiplos modais
- UX para adicionar/remover vendedores dinamicamente
- Manter sincronização entre badges de status e conteúdo dos modais

## 9. Milestones & sequencing

### 9.1 Project estimate

- Medium: 3-5 dias de desenvolvimento

### 9.2 Team size & composition

- Small Team: 1 desenvolvedor frontend

### 9.3 Suggested phases

- **Phase 1**: Estrutura de cards e sistema de modais (1 dia)
  - Key deliverables: Cards visuais, sistema de abertura/fechamento de modais, badges de status
  
- **Phase 2**: Implementação dos formulários (2 dias)
  - Key deliverables: Formulários completos para compradores e vendedores, sistema de vendedores múltiplos, validações
  
- **Phase 3**: Upload de documentos e validação final (1 dia)
  - Key deliverables: Modais de certidões e documentos do imóvel, validação global, integração com processamento

- **Phase 4**: Testes e ajustes finais (1 dia)
  - Key deliverables: Testes de todos os fluxos, correções de bugs, refinamento de UX

## 10. User stories

### 10.1 Visualizar cards de categorias

- **ID**: US-001
- **Description**: Como atendente, eu quero ver cards claros das 4 categorias de documentos para que eu saiba exatamente o que preciso preencher.
- **Acceptance Criteria**:
  - São exibidos 4 cards: Compradores, Vendedores, Certidões Fiscais, Documentos do Imóvel
  - Cada card tem ícone, título e badge de status
  - Badge mostra "Pendente" (amarelo) ou "Completo" (verde)
  - Cards são clicáveis e abrem modais correspondentes

### 10.2 Preencher dados dos compradores

- **ID**: US-002
- **Description**: Como atendente, eu quero preencher os dados dos compradores incluindo informações do cônjuge quando casado para que todas as informações necessárias sejam coletadas.
- **Acceptance Criteria**:
  - Modal abre com campos: RG, CPF, Comprovante Endereço, E-mail, Qualificação Profissional
  - Checkbox "Casado(a)?" expande campos do cônjuge
  - Campos do cônjuge: RG, CPF, E-mail, Qualificação Profissional, upload de Certidão de Casamento
  - Todos os campos obrigatórios são marcados com asterisco
  - Upload aceita apenas PDF, JPG, PNG
  - Botão "Salvar" valida preenchimento antes de fechar

### 10.3 Preencher dados de múltiplos vendedores

- **ID**: US-003
- **Description**: Como atendente, eu quero adicionar informações de múltiplos vendedores quando necessário para que transações com vários proprietários sejam contempladas.
- **Acceptance Criteria**:
  - Checkbox "Mais de um vendedor" adiciona seção para vendedor adicional
  - Cada vendedor tem conjunto completo de campos (RG, CPF, etc.)
  - Campos do cônjuge disponíveis para cada vendedor casado
  - Possível adicionar até 5 vendedores
  - Possível remover vendedores adicionais
  - Validação individual para cada vendedor

### 10.4 Upload de certidões fiscais

- **ID**: US-004
- **Description**: Como atendente, eu quero fazer upload das certidões fiscais obrigatórias para que o processo esteja em conformidade legal.
- **Acceptance Criteria**:
  - Modal mostra dois campos de upload: CNDT e CND Federal
  - Labels claros indicando qual certidão em cada campo
  - Preview do arquivo após upload
  - Botão para remover e substituir arquivo
  - Validação garante que ambos os arquivos foram enviados
  - Aceita apenas PDF, JPG, PNG

### 10.5 Upload de documentos do imóvel

- **ID**: US-005
- **Description**: Como atendente, eu quero fazer upload dos documentos do imóvel para que as informações da propriedade sejam incluídas na minuta.
- **Acceptance Criteria**:
  - Modal mostra três campos de upload: Matrícula, Guia ITBI, Certidão Ônus
  - Labels claros para cada documento
  - Preview de cada arquivo
  - Botão para substituir arquivos
  - Validação garante que todos os três documentos foram enviados
  - Aceita apenas PDF, JPG, PNG

### 10.6 Validação global e envio

- **ID**: US-006
- **Description**: Como atendente, eu quero ter certeza de que todos os dados foram preenchidos antes de enviar para que a minuta seja gerada corretamente.
- **Acceptance Criteria**:
  - Botão "Gerar Minuta" desabilitado até todos os 4 cards estarem completos
  - Indicador visual claro de quantos cards estão completos (ex: "3/4 completos")
  - Ao clicar em "Gerar Minuta" sem completar, mensagem clara indica cards pendentes
  - Após envio bem-sucedido, formulário é limpo e modal fecha
  - Loading state durante processamento
  - Mensagens de erro claras em caso de falha

### 10.7 Editar dados já preenchidos

- **ID**: US-007
- **Description**: Como atendente, eu quero poder reabrir e editar cards já preenchidos para que eu possa corrigir erros ou atualizar informações.
- **Acceptance Criteria**:
  - Clicar em card completo reabre modal com dados preenchidos
  - Dados são editáveis
  - Salvando novamente mantém status "Completo"
  - Removendo campos obrigatórios volta status para "Pendente"

