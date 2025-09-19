# Guia de Integração IA - Sistema de Cartórios

## 📋 Visão Geral

A funcionalidade de IA foi implementada com integração completa ao banco de dados real e preparada para trabalhar com N8N. O sistema permite:

- **Upload de documentos** para análise
- **Processamento via N8N** com webhooks
- **Armazenamento seguro** no Supabase Storage
- **Histórico completo** de análises
- **Métricas em tempo real**

## 🗄️ Estrutura do Banco de Dados

### Tabela `relatorios_ia`

```sql
CREATE TABLE relatorios_ia (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tipo VARCHAR(50) CHECK (tipo IN ('resumo_matricula', 'analise_malote', 'minuta_documento')) NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    arquivo_original TEXT NOT NULL,
    relatorio_pdf TEXT,
    relatorio_doc TEXT,
    relatorio_docx TEXT,
    resumo JSONB,
    status VARCHAR(20) CHECK (status IN ('processando', 'concluido', 'erro')) DEFAULT 'processando',
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL NOT NULL,
    cartorio_id UUID REFERENCES cartorios(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 Configuração Inicial

### 1. Configurar Storage Bucket

Execute o script SQL no Supabase:

```sql
-- Executar o arquivo: setup-ia-storage.sql
```

### 2. Configurar N8N

1. Crie um webhook no N8N
2. Configure a URL do webhook no sistema
3. Configure o callback URL: `https://seu-dominio.com/api/ia/webhook`

## 🔄 Fluxo de Funcionamento

### 1. Upload de Documento

```typescript
// Usuário seleciona arquivo
const arquivoUrl = await uploadFile(file);

// Cria registro no banco
const relatorio = await createRelatorio({
  tipo: "resumo_matricula",
  nome_arquivo: file.name,
  arquivo_original: arquivoUrl,
  usuario_id: user.id,
  cartorio_id: user.cartorio_id,
});
```

### 2. Chamada para N8N

```typescript
await callN8NWebhook(webhookUrl, {
  relatorio_id: relatorio.id,
  tipo: "resumo_matricula",
  arquivo_url: arquivoUrl,
  webhook_callback: "https://seu-dominio.com/api/ia/webhook",
});
```

### 3. Processamento N8N

O N8N recebe o documento e:

1. Processa com IA
2. Gera relatórios (PDF, DOC, DOCX)
3. Chama o webhook de retorno

### 4. Webhook de Retorno

```typescript
// POST /api/ia/webhook
{
  "relatorio_id": "uuid",
  "status": "concluido",
  "relatorio_pdf": "https://storage.../relatorio.pdf",
  "relatorio_doc": "https://storage.../relatorio.doc",
  "relatorio_docx": "https://storage.../relatorio.docx",
  "resumo": {
    "proprietario": "João Silva",
    "imovel": "Apartamento 101",
    "area": "85,50 m²"
  }
}
```

## 📁 Tipos de Análise Suportados

### 1. Resumo de Matrícula

- **Entrada:** PDF de matrícula imobiliária
- **Saída:** Resumo estruturado com dados do imóvel
- **Campos:** proprietario, imovel, area, registro, situacao

### 2. Análise de Malote

- **Entrada:** ZIP com múltiplos documentos
- **Saída:** Relatório de validação e organização
- **Campos:** totalDocumentos, documentosValidos, problemas

### 3. Minuta de Documento

- **Entrada:** Documentos de compradores, vendedores e matrícula
- **Saída:** Minuta de escritura gerada automaticamente
- **Campos:** tipoDocumento, compradores, vendedores, observacoes

## 🔧 Endpoints da API

### GET /api/ia/webhook

Testa se o endpoint está funcionando.

### POST /api/ia/webhook

Recebe resultados do N8N e atualiza o banco.

**Payload esperado:**

```json
{
  "relatorio_id": "uuid",
  "status": "concluido|erro",
  "relatorio_pdf": "url",
  "relatorio_doc": "url",
  "relatorio_docx": "url",
  "resumo": {},
  "error_message": "string (se erro)"
}
```

## 📊 Hooks Disponíveis

### useRelatoriosIA

```typescript
const {
  relatorios, // Lista de relatórios
  loading, // Estado de carregamento
  error, // Erros
  createRelatorio, // Criar novo relatório
  updateRelatorio, // Atualizar relatório
  deleteRelatorio, // Excluir relatório
  uploadFile, // Upload de arquivo
  callN8NWebhook, // Chamar webhook N8N
} = useRelatoriosIA();
```

## 🎯 Próximos Passos

### Implementações Pendentes:

1. **Atualizações em tempo real** - WebSocket ou polling
2. **Configuração de webhooks** por cartório
3. **Templates personalizados** de minutas
4. **Notificações** quando análise concluir
5. **Relatórios avançados** de uso da IA

### Melhorias Futuras:

1. **Cache de resultados** para otimização
2. **Processamento em lote** para múltiplos documentos
3. **Integração com outros serviços** de IA
4. **Dashboard de métricas** avançado

## 🛠️ Troubleshooting

### Problemas Comuns:

1. **Erro de upload:** Verificar permissões do bucket
2. **Webhook não funciona:** Verificar URL e conectividade
3. **Status não atualiza:** Verificar endpoint de callback
4. **Arquivo não encontrado:** Verificar URLs do storage

### Logs Importantes:

- Console do navegador para erros de frontend
- Logs do Supabase para erros de banco
- Logs do N8N para erros de processamento

## 📞 Suporte

Para dúvidas ou problemas:

1. Verificar logs de erro
2. Testar endpoints individualmente
3. Validar configurações do N8N
4. Verificar permissões do Supabase
