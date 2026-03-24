/**
 * Atualiza cartório via API admin (service role), contornando RLS no cliente.
 */
export async function putCartorioUpdate(
  accessToken: string,
  cartorioId: string,
  updates: Record<string, unknown>
): Promise<{ cartorio: Record<string, unknown> }> {
  const res = await fetch("/api/admin/editar-cartorio", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ id: cartorioId, updates }),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof payload?.error === "string"
        ? payload.error
        : "Erro ao atualizar cartório.";
    throw new Error(msg);
  }

  if (!payload?.cartorio) {
    throw new Error("Resposta inválida do servidor.");
  }

  return { cartorio: payload.cartorio };
}
