# Endpoint unificado: resultado da análise de malote

## Visão geral
Um endpoint HTTP recebe o resultado (concluído/erro) do fluxo de **Analisar Malote** e atualiza o registro correspondente na tabela `relatorios_ia`.

**URL:** `POST https://SEU_DOMINIO/api/ia/analise-malote-resultado`

## Identificador (obrigatório)
O endpoint identifica o relatório pelo campo:

- `relatorio_id` (UUID do relatório no sistema)

Esse é o mesmo `relatorio.id` que o frontend cria ao chamar o N8N.

## Tipos de envio

### 1. Multipart (recomendado quando há PDF binário)
Envie:
- `payload`: string JSON
- `file`: PDF binário (opcional)

### 2. JSON (sem arquivo)
Envie apenas JSON se o N8N já tiver URLs prontas.

## Estrutura do payload (JSON)

Campos comuns:

- `relatorio_id`: string (obrigatório)
- `status`: string (obrigatório)

Status aceitos:

- sucesso: `"concluido"` (ou variações como `success`, `ok`, `done`)
- erro: `"erro"` / `"error"` / `"ERROR"`

Campos opcionais:

- `resumo`: object (opcional) -> salva em `resumo`
- `resultado_final`: object (opcional) -> salva em `resultado_final`
- `dados_extraidos`: object (opcional) -> mescla em `resultado_final.dados_extraidos` (quando sucesso)
- `relatorio_pdf_url`: string (opcional) -> salva em `relatorio_pdf` (quando sucesso)
- `relatorio_doc_url`: string (opcional) -> salva em `relatorio_doc` (quando sucesso)
- `erro`: string (opcional) ou `error_message`: string (opcionais) -> salva em `resultado_final.erro` (quando erro)
- `motivo`: string (opcional) -> salva em `resultado_final.motivo` (quando erro)

### Exemplos (JSON)

Sucesso (sem arquivo):

```json
{
  "relatorio_id": "uuid-aqui",
  "status": "concluido",
  "relatorio_pdf_url": "https://.../malote.pdf",
  "resumo": { "mensagem": "Tudo ok" }
}
```

Erro:

```json
{
  "relatorio_id": "uuid-aqui",
  "status": "erro",
  "error_message": "Falha no processamento"
}
```

## Uso no N8N (instrução de configuração)
No final do workflow, use um nó **HTTP Request**:

1. **URL:** o endpoint acima
2. **Method:** `POST`
3. **Body:**
   - se tiver PDF binário: `multipart/form-data` com `payload` e `file`
   - se não tiver PDF binário: `application/json` enviando `relatorio_pdf_url` (ou URLs equivalentes)

### Parâmetros que você precisa montar no N8N

1. `relatorio_id`: deve ser o mesmo UUID do relatório (veio no payload do início)
2. `status`: `"concluido"` ou `"erro"`
3. sucesso: enviar `file` (opcional) ou `relatorio_pdf_url`
4. erro: enviar `error_message` (ou `erro`)

