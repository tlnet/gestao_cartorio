/**
 * N8N pode devolver o corpo como objeto ou como array com um item.
 * Campos de token já vistos: cnib_access_token, cnib_token, access_token, token.
 */
export function normalizeN8nWebhookTokenPayload(
  body: unknown
): Record<string, unknown> {
  if (Array.isArray(body) && body.length > 0) {
    const first = body[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      return first as Record<string, unknown>;
    }
  }
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return {};
}

export function extractCnibTokenStringFromWebhook(
  body: unknown
): string | null {
  const o = normalizeN8nWebhookTokenPayload(body);
  const candidates = [
    o.cnib_access_token,
    o.cnib_token,
    o.access_token,
    o.token,
  ];
  for (const v of candidates) {
    if (typeof v === "string" && v.trim().length > 0) {
      return v.trim();
    }
  }
  return null;
}
