# Webhook — Notificar cliente (protocolo)

## URL (N8N / Conversix)

```
POST https://webhook.conversix.com.br/webhook/api/n8n/protocolos/notificar-cliente
```

A aplicação chama internamente `POST /api/levontech/webhook` com `fluxo: "notificar-cliente"`, que repassa o body para a URL acima.

## Campos obrigatórios

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `fluxo` | string | Sempre `"notificar-cliente"` |
| `protocolo_id` | string | UUID do protocolo no Supabase |
| `cartorio_id` | string | UUID do cartório |
| `telefone_destino` | string | Número informado no popup (pode estar formatado) |
| `mensagem` | string | Texto digitado pelo usuário |

## Exemplo de payload

```json
{
  "fluxo": "notificar-cliente",
  "protocolo_id": "uuid-do-protocolo",
  "cartorio_id": "uuid-do-cartorio",
  "cartorio_nome": "1º Cartório de Notas",
  "numero_protocolo": "2025/001234",
  "numero_demanda": "DEM-001",
  "status": "Em Andamento",
  "nome_completo_solicitante": "João da Silva",
  "telefone_solicitante": "(11) 99999-9999",
  "telefone_destino": "(11) 99999-9999",
  "mensagem": "Seu protocolo foi atualizado. Qualquer dúvida, entre em contato.",
  "servicos_solicitados": ["Certidão de nascimento"],
  "tenant_id_zdg": "...",
  "external_id_zdg": "...",
  "api_token_zdg": "...",
  "channel_id_zdg": "..."
}
```

Use `telefone_destino` e `mensagem` no fluxo N8N para envio via WhatsApp (ZDG). Os campos `*_zdg` seguem o mesmo padrão do webhook de mudança de status (`status-protocolo`).
