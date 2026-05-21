import { supabase } from "@/lib/supabase";

export const FLUXO_NOTIFICAR_CLIENTE = "notificar-cliente" as const;

export const WEBHOOK_NOTIFICAR_CLIENTE_URL =
  "https://webhook.conversix.com.br/webhook/api/n8n/protocolos/notificar-cliente";

export type ProtocoloNotificarClienteInput = {
  id: string;
  protocolo?: string;
  demanda?: string;
  status?: string;
  solicitante?: string;
  telefone?: string;
  servicos?: string[];
  cartorio_id?: string;
};

export type NotificarClientePayload = {
  fluxo: typeof FLUXO_NOTIFICAR_CLIENTE;
  protocolo_id: string;
  cartorio_id: string;
  cartorio_nome: string | null;
  numero_protocolo: string | null;
  numero_demanda: string | null;
  status: string | null;
  nome_completo_solicitante: string | null;
  telefone_solicitante: string | null;
  telefone_destino: string;
  mensagem: string;
  servicos_solicitados: string[];
  tenant_id_zdg: string | null;
  external_id_zdg: string | null;
  api_token_zdg: string | null;
  channel_id_zdg: string | null;
};

export async function buildNotificarClientePayload(
  protocolo: ProtocoloNotificarClienteInput,
  telefoneDestino: string,
  mensagem: string
): Promise<NotificarClientePayload> {
  const cartorioId = protocolo.cartorio_id;
  if (!cartorioId) {
    throw new Error("Cartório não vinculado ao protocolo.");
  }

  const { data: cartorioData, error: cartorioError } = await supabase
    .from("cartorios")
    .select("nome, tenant_id_zdg, external_id_zdg, api_token_zdg, channel_id_zdg")
    .eq("id", cartorioId)
    .maybeSingle();

  if (cartorioError) {
    console.warn("Erro ao buscar dados do cartório para notificação:", cartorioError);
  }

  return {
    fluxo: FLUXO_NOTIFICAR_CLIENTE,
    protocolo_id: protocolo.id,
    cartorio_id: cartorioId,
    cartorio_nome: cartorioData?.nome ?? null,
    numero_protocolo: protocolo.protocolo ?? null,
    numero_demanda: protocolo.demanda ?? null,
    status: protocolo.status ?? null,
    nome_completo_solicitante: protocolo.solicitante ?? null,
    telefone_solicitante: protocolo.telefone ?? null,
    telefone_destino: telefoneDestino.trim(),
    mensagem: mensagem.trim(),
    servicos_solicitados: protocolo.servicos ?? [],
    tenant_id_zdg: cartorioData?.tenant_id_zdg ?? null,
    external_id_zdg: cartorioData?.external_id_zdg ?? null,
    api_token_zdg: cartorioData?.api_token_zdg ?? null,
    channel_id_zdg: cartorioData?.channel_id_zdg ?? null,
  };
}

export async function dispararNotificarClienteWebhook(
  payload: NotificarClientePayload
): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch("/api/levontech/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: "Erro ao enviar notificação",
    }));
    return {
      ok: false,
      error: errorData.error || `Erro ${response.status}`,
    };
  }

  return { ok: true };
}
