/**
 * Payload POST para o webhook N8N que fornece o token CNIB.
 * Mantém o mesmo padrão dos demais webhooks do app (cartorio_id + metadata).
 */
export function buildCnibTokenWebhookRequestBody(
  cartorioId: string | null | undefined,
  usuarioId: string | null | undefined
) {
  const cartorio_id =
    cartorioId === undefined || cartorioId === null ? null : String(cartorioId);
  const usuario_id =
    usuarioId === undefined || usuarioId === null ? null : String(usuarioId);

  return {
    cartorio_id,
    usuario_id,
    origem: "gestao_cartorio_app",
    fluxo: "cnib_access_token",
    metadata: {
      usuario_id,
      cartorio_id,
      origem: "gestao_cartorio_app",
      fluxo: "cnib_access_token",
    },
  };
}
