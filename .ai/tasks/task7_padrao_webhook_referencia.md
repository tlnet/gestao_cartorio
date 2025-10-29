# Padrão de Webhook para Análises de IA

## Estrutura Padrão Identificada

### 1. Funções de Processamento

Todas as análises devem usar funções específicas que chamam `processarAnalise` internamente:

```typescript
// Padrão para todas as análises
const processarX = async (
  file: File | File[],
  usuarioId: string,
  cartorioId: string,
  dadosAdicionais?: any,
  webhookUrl?: string
) => {
  return processarAnalise(
    "tipo_analise",
    file,
    usuarioId,
    cartorioId,
    dadosAdicionais,
    webhookUrl
  );
};
```

### 2. Obtenção de Webhook URL

**Na página (antes de chamar a função):**

```typescript
const webhookUrl = getWebhookUrl("tipo_analise");
await processarX(file, user.id, cartorioId, webhookUrl);
```

**Dentro de `processarAnalise` (fallback):**

- Se `webhookUrl` não for passado, busca da configuração N8N
- Usa webhook específico (`webhook_resumo_matricula`, etc.) ou fallback para `webhook_url`

### 3. Estrutura do Payload

Todos os payloads seguem o mesmo padrão:

```typescript
{
  relatorio_id: string,
  tipo: "resumo_matricula" | "analise_malote" | "minuta_documento",
  arquivos_urls: string[],
  webhook_callback: `${window.location.origin}/api/ia/webhook`,
  dados_processamento: {
    arquivos_originais: string[],
    tipo_documento: string,
    timestamp: string,
    ...dadosAdicionais
  },
  metadata: {
    usuario_id: string,
    cartorio_id: string,
    origem: "gestao_cartorio_app"
  }
}
```

### 4. Tratamento de Resposta

- Todas as análises devem processar respostas binárias (PDF, DOC, DOCX) da mesma forma
- Atualizar relatório no banco com mesma estrutura:
  - `relatorio_pdf` para PDFs
  - `relatorio_doc` para DOC/DOCX
  - `arquivo_resultado` como fallback

### 5. Tratamento de Erros

- Todas devem verificar se webhook está configurado antes de processar
- Todas devem ter tratamento de CORS (tentar direto, depois proxy)
- Mensagens de erro consistentes

## Status Atual

✅ **Resumir Matrícula**: Segue o padrão corretamente
✅ **Analisar Malote**: Segue o padrão corretamente  
✅ **Gerar minuta de documento**: Segue o padrão corretamente

## Conclusão

Todas as três análises já estão padronizadas e seguem a mesma estrutura. Não há necessidade de ajustes, mas vamos validar que tudo está funcionando corretamente.
