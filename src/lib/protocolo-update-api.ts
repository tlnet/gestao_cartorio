/**
 * Atualiza protocolo via API (service role), contornando falha de RLS
 * no trigger que insere notificações para outros usuários.
 */
export async function patchProtocoloUpdate(
  accessToken: string,
  protocoloId: string,
  updates: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch("/api/protocolos/update", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ id: protocoloId, updates }),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof payload?.error === "string"
        ? payload.error
        : "Erro ao atualizar protocolo.";
    const err = new Error(msg) as Error & {
      code?: string;
      details?: string;
    };
    err.code = payload?.code;
    err.details = payload?.details;
    throw err;
  }

  if (!payload?.protocolo) {
    throw new Error("Resposta inválida do servidor.");
  }

  return payload.protocolo as Record<string, unknown>;
}
