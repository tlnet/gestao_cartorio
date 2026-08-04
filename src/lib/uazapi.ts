import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente server-side para a API da Uazapi (WhatsApp).
 * O admin token e o token da instância nunca são expostos ao browser —
 * todas as chamadas passam pelas rotas em /api/uazapi.
 *
 * Base: https://conversix.uazapi.com  (configurável via UAZAPI_URL)
 * Auth: header "admintoken" (endpoints administrativos) ou "token" (instância).
 */

const UAZAPI_URL = (
  process.env.UAZAPI_URL || "https://conversix.uazapi.com"
).replace(/\/+$/, "");
const UAZAPI_ADMIN_TOKEN = process.env.UAZAPI_ADMIN_TOKEN || "";

export interface UazapiInstance {
  id?: string;
  token?: string;
  status?: string; // connected | connecting | disconnected
  qrcode?: string | null;
  paircode?: string | null;
  name?: string;
  profileName?: string | null;
  profilePicUrl?: string | null;
  owner?: string | null; // número dono (jid)
  systemName?: string | null;
}

export interface UazapiConnectResult {
  connected: boolean;
  loggedIn: boolean;
  qrcode: string | null;
  paircode: string | null;
  status: string;
  instance: UazapiInstance | null;
}

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados."
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function ensureAdminToken() {
  if (!UAZAPI_ADMIN_TOKEN) {
    throw new Error(
      "UAZAPI_ADMIN_TOKEN não configurado no ambiente do servidor."
    );
  }
}

async function uazapiFetch<T>(
  path: string,
  opts: {
    method?: string;
    token?: string; // token da instância
    admin?: boolean; // usar admintoken
    body?: unknown;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts.admin) {
    ensureAdminToken();
    headers.admintoken = UAZAPI_ADMIN_TOKEN;
  }
  if (opts.token) headers.token = opts.token;

  const res = await fetch(`${UAZAPI_URL}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data as { message?: string; error?: string })?.message ||
      (data as { error?: string })?.error ||
      (typeof data === "string" ? data : "") ||
      res.statusText;
    throw new Error(`Uazapi ${res.status}: ${msg}`);
  }
  return data as T;
}

/** Cria uma nova instância (admintoken). Retorna o token da instância. */
export async function createInstance(name: string): Promise<{
  token: string;
  instance: UazapiInstance | null;
  name: string;
}> {
  const data = await uazapiFetch<{
    token?: string;
    instance?: UazapiInstance;
    name?: string;
  }>("/instance/create", { method: "POST", admin: true, body: { name } });

  if (!data?.token) {
    throw new Error("Uazapi não retornou o token da instância.");
  }
  return {
    token: data.token,
    instance: data.instance ?? null,
    name: data.name || name,
  };
}

/** Conecta a instância ao WhatsApp e retorna o QR Code / pairing code. */
export async function connectInstance(
  token: string,
  phone?: string
): Promise<UazapiConnectResult> {
  const data = await uazapiFetch<{
    connected?: boolean;
    loggedIn?: boolean;
    instance?: UazapiInstance;
  }>("/instance/connect", {
    method: "POST",
    token,
    body: phone ? { phone } : {},
  });

  const inst = data?.instance ?? null;
  return {
    connected: Boolean(data?.connected),
    loggedIn: Boolean(data?.loggedIn),
    qrcode: inst?.qrcode ?? null,
    paircode: inst?.paircode ?? null,
    status: inst?.status || (data?.connected ? "connected" : "connecting"),
    instance: inst,
  };
}

/** Consulta o status da instância. */
export async function getInstanceStatus(
  token: string
): Promise<UazapiConnectResult> {
  const data = await uazapiFetch<{
    instance?: UazapiInstance;
    status?: { connected?: boolean; loggedIn?: boolean };
    connected?: boolean;
    loggedIn?: boolean;
  }>("/instance/status", { method: "GET", token });

  const inst = data?.instance ?? null;
  const connected = Boolean(data?.status?.connected ?? data?.connected);
  const loggedIn = Boolean(data?.status?.loggedIn ?? data?.loggedIn);
  return {
    connected,
    loggedIn,
    qrcode: inst?.qrcode ?? null,
    paircode: inst?.paircode ?? null,
    status: inst?.status || (connected ? "connected" : "disconnected"),
    instance: inst,
  };
}

/** Desconecta a instância (mantém a instância criada). */
export async function disconnectInstance(token: string): Promise<void> {
  await uazapiFetch("/instance/disconnect", { method: "POST", token });
}

/** Renomeia a instância (rótulo; não afeta o token nem a conexão). */
export async function renameInstance(
  token: string,
  name: string
): Promise<void> {
  await uazapiFetch("/instance/updateInstanceName", {
    method: "POST",
    token,
    body: { name },
  });
}

/** Deleta a instância. */
export async function deleteInstance(token: string): Promise<void> {
  await uazapiFetch("/instance", { method: "DELETE", token });
}

/**
 * Configura a integração nativa com o Chatwoot.
 * A Uazapi cria/usa a inbox no Chatwoot e passa a rotear mensagens nos 2 sentidos.
 */
export async function setChatwootConfig(
  token: string,
  config: {
    url: string;
    accessToken: string;
    accountId: number;
    inboxId?: number | null;
    signMessages?: boolean;
    ignoreGroups?: boolean;
    createNewConversation?: boolean;
  }
): Promise<{ message: string; webhookUrl: string | null }> {
  const data = await uazapiFetch<{
    message?: string;
    chatwoot_inbox_webhook_url?: string;
  }>("/chatwoot/config", {
    method: "PUT",
    token,
    body: {
      enabled: true,
      url: config.url.replace(/\/+$/, ""),
      access_token: config.accessToken,
      account_id: config.accountId,
      ...(config.inboxId ? { inbox_id: config.inboxId } : {}),
      sign_messages: config.signMessages ?? false,
      ignore_groups: config.ignoreGroups ?? false,
      create_new_conversation: config.createNewConversation ?? false,
    },
  });
  return {
    message: data?.message || "Configuração do Chatwoot atualizada.",
    webhookUrl: data?.chatwoot_inbox_webhook_url ?? null,
  };
}

/**
 * Envia uma mensagem de texto pela instância do cartório.
 *
 * Usado para iniciar conversa com quem nunca escreveu: enviando por aqui, a
 * própria Uazapi cria o contato e a conversa no Chatwoot pelo caminho normal
 * dela, sem depender de montarmos o source_id no formato certo.
 *
 * @param number Telefone só com dígitos, incluindo DDI (ex.: 5541999592575).
 */
export async function sendText(
  token: string,
  number: string,
  text: string
): Promise<void> {
  await uazapiFetch("/send/text", {
    method: "POST",
    token,
    body: { number, text },
  });
}

/** Desabilita a integração com o Chatwoot. */
export async function disableChatwootConfig(token: string): Promise<void> {
  await uazapiFetch("/chatwoot/config", {
    method: "PUT",
    token,
    body: { enabled: false },
  });
}

// ----------------------------------------------------------------------------
// Persistência das credenciais da instância no cartório (via service role)
// ----------------------------------------------------------------------------

export interface CartorioUazapi {
  id: string;
  uazapi_instance_name: string | null;
  uazapi_instance_token: string | null;
  whatsapp_numero: string | null;
  whatsapp_status: string | null;
  chatwoot_account_id: string | null;
  chatwoot_token: string | null;
  chatwoot_inbox_id: string | null;
}

export async function getCartorioUazapi(
  cartorioId: string
): Promise<CartorioUazapi> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("cartorios")
    .select(
      "id, uazapi_instance_name, uazapi_instance_token, whatsapp_numero, whatsapp_status, chatwoot_account_id, chatwoot_token, chatwoot_inbox_id"
    )
    .eq("id", cartorioId)
    .single();
  if (error || !data) {
    throw new Error(error?.message || "Cartório não encontrado.");
  }
  return data as CartorioUazapi;
}

export async function updateCartorioUazapi(
  cartorioId: string,
  fields: Partial<{
    uazapi_instance_name: string | null;
    uazapi_instance_token: string | null;
    whatsapp_numero: string | null;
    whatsapp_status: string | null;
  }>
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from("cartorios")
    .update(fields)
    .eq("id", cartorioId);
  if (error) {
    console.error("[uazapi] Erro ao atualizar cartório:", error.message);
  }
}

/** Gera um nome de instância determinístico por cartório. */
export function instanceNameForCartorio(cartorioId: string): string {
  return `iacartorios-${cartorioId.replace(/-/g, "").slice(0, 16)}`;
}

const DEFAULT_CHATWOOT_URL =
  process.env.CHATWOOT_URL || "https://chat.conversix.com.br";

/**
 * Vincula a instância ao Chatwoot do cartório (integração nativa Uazapi).
 * Retorna true se vinculou, false se faltam credenciais do Chatwoot.
 */
export async function linkChatwootForCartorio(
  cart: CartorioUazapi,
  token: string
): Promise<boolean> {
  if (!cart.chatwoot_account_id || !cart.chatwoot_token) return false;
  await setChatwootConfig(token, {
    url: DEFAULT_CHATWOOT_URL,
    accessToken: cart.chatwoot_token,
    accountId: Number(cart.chatwoot_account_id),
    inboxId: cart.chatwoot_inbox_id ? Number(cart.chatwoot_inbox_id) : null,
  });
  return true;
}

/** Extrai um número de telefone legível a partir do dono/jid da instância. */
export function numeroFromInstance(inst: UazapiInstance | null): string | null {
  if (!inst) return null;
  const owner = inst.owner || "";
  const digits = owner.split("@")[0]?.split(":")[0] || "";
  return digits || inst.profileName || null;
}
