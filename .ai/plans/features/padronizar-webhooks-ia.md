# PRD: Padronização de Webhooks para Análises de IA

## 1. Product overview

### 1.1 Document title and version

- PRD: Padronização de Webhooks para Análises de IA
- Version: 1.0

### 1.2 Product summary

Padronizar a estrutura de webhooks para todas as análises de IA (Analisar Malote e Gerar minuta de documento) para seguir o mesmo padrão funcional já implementado em "Resumir Matrícula".

Atualmente, o "Resumir Matrícula" possui uma estrutura completa e funcional de webhook que funciona corretamente. As outras análises (Analisar Malote e Gerar minuta de documento) precisam ser ajustadas para seguir exatamente o mesmo padrão, garantindo consistência e funcionalidade em todas as integrações.

## 2. Goals

### 2.1 Business goals

- Garantir consistência na estrutura de webhooks entre todas as análises de IA
- Melhorar a confiabilidade das integrações com N8N
- Facilitar manutenção futura através de código padronizado
- Reduzir erros e inconsistências no processamento de análises

### 2.2 User goals

- Ter todas as análises funcionando de forma igual e confiável
- Receber feedback consistente durante o processamento
- Ter resultados tratados de forma padronizada

### 2.3 Non-goals

- Criar novas funcionalidades de análise
- Modificar a estrutura do "Resumir Matrícula" (já está correto)
- Alterar a interface do usuário (apenas backend/webhook)

## 3. User personas

### 3.1 Key user types

- Cartorários que utilizam análises de IA no dia a dia
- Desenvolvedores que precisam manter o código consistente

## 4. Functional requirements

### 4.1 Estrutura de Webhook Padronizada (Priority: High)

- Replicar a estrutura completa do "Resumir Matrícula" para "Analisar Malote"
- Replicar a estrutura completa do "Resumir Matrícula" para "Gerar minuta de documento"
- Garantir que todas as análises:
  - Usam a mesma função base `processarAnalise`
  - Tratam webhooks da mesma forma
  - Processam callbacks de forma idêntica
  - Têm tratamento de erros consistente

### 4.2 Verificação de Webhook Configurado (Priority: High)

- Todas as análises devem verificar se o webhook está configurado antes de processar
- Exibir mensagens de erro consistentes quando webhook não estiver configurado
- Usar a mesma lógica de obtenção de webhook URL para todos os tipos

### 4.3 Processamento de Resposta (Priority: High)

- Tratar respostas binárias (PDF, DOC, DOCX) da mesma forma
- Atualizar relatório no banco com mesma estrutura
- Processar callbacks do webhook de forma idêntica

## 5. User experience

### 5.1 Fluxo de Uso

O usuário deve ter a mesma experiência ao usar qualquer tipo de análise:

1. Selecionar arquivo(s)
2. Clicar em "Iniciar Análise" / "Gerar Minuta"
3. Ver feedback de loading consistente
4. Receber resultado tratado da mesma forma

### 5.2 Mensagens de Erro

- Mensagens de erro devem ser consistentes entre todas as análises
- Feedback visual deve ser idêntico para todos os tipos

## 6. Technical considerations

### 6.1 Estrutura Atual

- `processarResumoMatricula`: ✅ Funcional e correto (padrão a seguir)
- `processarAnaliseMalote`: ⚠️ Precisa ser ajustado
- `processarMinutaDocumento`: ⚠️ Precisa ser ajustado

### 6.2 Função Base

Todas devem usar `processarAnalise` com os mesmos parâmetros e tratamento.

### 6.3 Webhook Callback

Todas devem usar o mesmo endpoint: `/api/ia/webhook`

### 6.4 Tratamento de Resposta

- Verificar content-type da resposta
- Processar arquivos binários da mesma forma
- Atualizar relatório no banco com mesma estrutura

## 7. Success metrics

- Todas as análises funcionam de forma idêntica
- Código padronizado e consistente
- Sem erros de processamento relacionados a webhooks
- Testes bem-sucedidos para todas as análises

## 8. Milestones

1. **Análise da estrutura atual** - Entender exatamente como "Resumir Matrícula" funciona
2. **Padronização de Analisar Malote** - Ajustar para seguir o padrão
3. **Padronização de Gerar minuta** - Ajustar para seguir o padrão
4. **Testes e validação** - Garantir que tudo funciona igual

## 9. User stories

- Como desenvolvedor, quero que todas as análises tenham estrutura de webhook idêntica para facilitar manutenção
- Como usuário, quero que todas as análises funcionem de forma consistente e confiável
- Como desenvolvedor, quero código padronizado para reduzir bugs
