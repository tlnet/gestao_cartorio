# Endpoint unificado: resultado da minuta de documento

## Visão geral

Um único endpoint HTTP recebe **todos** os retornos do fluxo de geração de minuta de documento. O **recebimento é o mesmo** para completo e incompleto:

- **Minuta completa**: `status: "concluido"` + opcional `resumo` + opcional arquivo PDF (binário)
- **Minuta incompleta**: `status: "ERROR"` / `"incompleto"` + `campos_pendentes` + opcional mensagens + opcional arquivo PDF (binário)

Em **ambos** os casos o binário do PDF pode ser enviado no campo **file** (multipart). Quando enviado, é sempre armazenado e disponibilizado ao usuário em `relatorio_pdf` (completo ou incompleto).

**URL:** `POST https://painel.iacartorios.com.br/api/ia/minuta-resultado`

---

## Formas de envio

### 1. Multipart (com arquivo PDF)

Use quando houver arquivo (minuta completa ou PDF parcial).

- **Content-Type:** `multipart/form-data`
- **Campos:**
  - **payload** (obrigatório): string JSON com a estrutura abaixo
  - **file** (opcional): arquivo PDF (binário)

### 2. JSON (sem arquivo)

Use para incompleto sem PDF ou para testes.

- **Content-Type:** `application/json`
- **Body:** objeto JSON com a estrutura abaixo (sem campo `file`)

---

## Estrutura do payload (JSON)

Campos comuns:

| Campo           | Obrigatório | Tipo   | Descrição                          |
|----------------|-------------|--------|------------------------------------|
| `relatorio_id` | Sim         | string | UUID do relatório no sistema       |
| `status`       | Sim         | string | `"concluido"` ou `"ERROR"` / `"error"` / `"incompleto"` |

### Quando `status` = `"concluido"` (minuta completa)

| Campo    | Obrigatório | Tipo   | Descrição                    |
|---------|-------------|--------|------------------------------|
| `resumo`| Não         | object | Metadados adicionais         |

- Envie o **PDF** pelo campo **file** (multipart) para que o cliente visualize no painel.
- O sistema faz upload do arquivo para o storage e grava a URL em `relatorio_pdf`.

**Exemplo (multipart):**  
- `payload`: `{"relatorio_id":"e620d8eb-45d7-427e-b841-0386df7be412","status":"concluido","resumo":{"mensagem":"Minuta gerada com sucesso"}}`  
- `file`: arquivo PDF

**Exemplo (só JSON, sem arquivo):**  
```json
{
  "relatorio_id": "e620d8eb-45d7-427e-b841-0386df7be412",
  "status": "concluido",
  "resumo": { "mensagem": "Minuta gerada com sucesso" }
}
```

### Quando `status` = `"ERROR"` | `"error"` | `"incompleto"` (minuta incompleta)

| Campo               | Obrigatório | Tipo     | Descrição                          |
|---------------------|-------------|----------|------------------------------------|
| `campos_pendentes`  | Sim         | string[] | Lista de códigos dos campos faltantes |
| `mensagens_erro`    | Não         | string[] | Mensagens de erro                  |
| `mensagens_alerta`  | Não         | string[] | Avisos                             |

- **file** (multipart): opcional; se enviado, é armazenado como PDF parcial e a URL fica em `relatorio_pdf` para o cliente visualizar.

**Exemplo (JSON):**  
```json
{
  "relatorio_id": "e620d8eb-45d7-427e-b841-0386df7be412",
  "status": "ERROR",
  "campos_pendentes": ["DATA_CASAMENTO", "NOME_VENDEDOR_2_SOLTEIRA"],
  "mensagens_erro": ["DOC ERRADO: esperado Certidão de Casamento"],
  "mensagens_alerta": []
}
```

**Exemplo (multipart com PDF parcial):**  
- `payload`: JSON acima  
- `file`: PDF parcial (opcional)

---

## Comportamento no sistema

- **Concluído:** o relatório é atualizado com `status = "concluido"`, `resumo` (se enviado) e `relatorio_pdf` (se vier file).
- **Incompleto:** o relatório é atualizado com `status = "analise_incompleta"`, `resumo` com `requer_preenchimento`, `campos_pendentes`, `mensagens_erro` e `mensagens_alerta`, e `relatorio_pdf` (se vier file).

O PDF binário tem o **mesmo tratamento** nos dois cenários: quando enviado no campo **file**, é feito upload e a URL é gravada em `relatorio_pdf` para o usuário visualizar.

---

## Respostas

### Sucesso (200)

```json
{
  "success": true,
  "message": "Minuta concluída registrada com sucesso",
  "data": {
    "relatorio_id": "uuid",
    "status": "concluido",
    "requer_preenchimento": false
  }
}
```

Ou, para incompleto:

```json
{
  "success": true,
  "message": "Campos pendentes registrados com sucesso",
  "data": {
    "relatorio_id": "uuid",
    "status": "analise_incompleta",
    "requer_preenchimento": true
  }
}
```

### Erros

- **400:** payload inválido, `relatorio_id`/`status` faltando ou `campos_pendentes` ausente quando status é incompleto
- **404:** relatório não encontrado
- **500:** erro interno ou falha ao atualizar/upload

---

## Uso no N8N

1. Use um único nó **HTTP Request** para o resultado da minuta.
2. **URL:** `https://painel.iacartorios.com.br/api/ia/minuta-resultado`
3. **Method:** POST
4. **Send Body:** Sim
5. **Body Content Type:**
   - Para enviar PDF: **Form-Data**; adicione campos `payload` (JSON string) e `file` (binary).
   - Para só JSON: **JSON**; body = objeto com `relatorio_id`, `status` e demais campos conforme o caso.
6. Em fluxos com condição (completo vs incompleto), monte o `payload` e opcionalmente anexe o `file` conforme o ramo.

---

## Migração dos endpoints antigos

- **Webhook genérico** (`/api/ia/webhook`): continua disponível para outros tipos (resumo de matrícula, análise de malote). Para **minuta de documento**, prefira este endpoint unificado.
- **Campos pendentes** (`/api/ia/campos-pendentes`): continua funcionando; para minuta, pode-se usar só este endpoint enviando `status` incompleto e, se quiser, o PDF no campo `file`.
