# Endpoint de Campos Pendentes

## Visão Geral

Este endpoint permite que o N8N (ou qualquer serviço externo) notifique o sistema de forma **assíncrona** quando detectar campos faltantes durante a geração de uma minuta de documento.

## Endpoint

```
POST https://iacartorios.com.br/api/ia/campos-pendentes
```

## Autenticação

Atualmente não requer autenticação, mas pode ser adicionada se necessário.

## Request Body

```json
{
  "relatorio_id": "uuid-do-relatorio",
  "status": "ERROR",
  "mensagens_erro": [
    "DOC ERRADO: 'vendedor_conjuge_1_casamento' - Esperado Casamento, mas é Certidão de Nascimento de André Barros Alencar"
  ],
  "mensagens_alerta": [],
  "campos_pendentes": [
    "DATA_CASAMENTO",
    "MATRICULA_CERTIDAO_CASAMENTO",
    "CIDADE_CARTORIO_CASAMENTO",
    "DATA_EMISSAO_CERTIDAO_CASAMENTO",
    "NOME_VENDEDOR_2_SOLTEIRA",
    "DATA_CONTRATO_PARTICULAR"
  ]
}
```

### Campos Obrigatórios

- `relatorio_id` (string): ID do relatório/análise que está sendo processado
- `status` (string): Deve ser `"ERROR"` ou `"error"`
- `campos_pendentes` (array de strings): Lista de campos que precisam ser preenchidos

### Campos Opcionais

- `mensagens_erro` (array de strings): Mensagens de erro encontradas
- `mensagens_alerta` (array de strings): Mensagens de alerta

## Response

### Sucesso (200)

```json
{
  "success": true,
  "message": "Campos pendentes registrados com sucesso",
  "data": {
    "relatorio_id": "uuid-do-relatorio",
    "status": "analise_incompleta",
    "campos_pendentes": 6,
    "requer_preenchimento": true
  }
}
```

### Erro (400)

```json
{
  "error": "relatorio_id é obrigatório"
}
```

### Erro (404)

```json
{
  "error": "Relatório não encontrado"
}
```

### Erro (500)

```json
{
  "error": "Erro interno do servidor",
  "details": "Mensagem de erro detalhada"
}
```

## Exemplo de Uso no N8N

### Configuração do HTTP Request Node

1. **Method**: `POST`
2. **URL**: `https://iacartorios.com.br/api/ia/campos-pendentes`
3. **Headers**:
   ```
   Content-Type: application/json
   ```
4. **Body** (JSON):
   ```json
   {
     "relatorio_id": "{{ $json.relatorio_id }}",
     "status": "ERROR",
     "mensagens_erro": {{ $json.mensagens_erro }},
     "mensagens_alerta": {{ $json.mensagens_alerta }},
     "campos_pendentes": {{ $json.campos_pendentes }}
   }
   ```

## Fluxo de Funcionamento

1. **N8N detecta campos faltantes** durante o processamento da minuta
2. **N8N chama este endpoint** com os dados de erro e campos pendentes
3. **Endpoint atualiza o relatório** no banco de dados com status "analise_incompleta" e marca `requer_preenchimento: true`
4. **Frontend detecta automaticamente** (via polling) e abre o popup para o usuário preencher
5. **Usuário preenche os campos** e envia de volta
6. **N8N reprocessa** a minuta com os dados completos

## Vantagens da Abordagem Assíncrona

- ✅ **Não bloqueia o workflow**: O N8N não precisa esperar resposta
- ✅ **Mais resiliente**: Se o endpoint falhar, o N8N pode tentar novamente
- ✅ **Melhor performance**: Processamento não fica travado aguardando callback
- ✅ **Flexibilidade**: Pode ser chamado de qualquer ponto do workflow

## Teste do Endpoint

Você pode testar o endpoint usando:

```bash
curl -X GET https://iacartorios.com.br/api/ia/campos-pendentes
```

Isso retornará informações sobre o endpoint e o formato esperado do body.

## Notas Importantes

- O endpoint é **idempotente**: pode ser chamado múltiplas vezes com segurança
- O relatório será atualizado mesmo que já tenha campos pendentes registrados
- O frontend detecta automaticamente mudanças via polling dos relatórios
- Não há necessidade de webhook callback para este fluxo
