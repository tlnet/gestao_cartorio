/**
 * Configuração interna de webhooks
 * Estes webhooks são configurados diretamente no código e não dependem de configuração do usuário
 */

export const WEBHOOKS_CONFIG = {
  resumo_matricula: "https://webhook.conversix.com.br/webhook/resumo-matricula",
  analise_malote: "https://webhook.conversix.com.br/webhook/resumo-malote-eletronico",
  minuta_documento: "https://webhook.conversix.com.br/webhook/minuta-compra-e-venda",
  generic: "https://webhook.conversix.com.br/webhook/generic",
} as const;

/**
 * Obtém a URL do webhook para um tipo específico de análise
 * @param tipo Tipo de análise: resumo_matricula, analise_malote, minuta_documento
 * @returns URL do webhook configurada internamente
 */
export const getWebhookUrl = (
  tipo: "resumo_matricula" | "analise_malote" | "minuta_documento"
): string => {
  return WEBHOOKS_CONFIG[tipo] || WEBHOOKS_CONFIG.generic;
};

