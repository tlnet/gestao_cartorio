import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente server-side para a Application API do Chatwoot.
 * O token do cartório nunca é exposto ao browser — todas as chamadas passam
 * pelas rotas em /api/chatwoot, que usam este módulo.
 */

const DEFAULT_CHATWOOT_URL =
  process.env.CHATWOOT_URL || "https://chat.conversix.com.br";

export interface ChatwootConfig {
  cartorioId: string;
  baseUrl: string;
  accountId: string;
  token: string;
  inboxId: string | null;
}

export interface ChatwootContact {
  id: number;
  name: string | null;
  phone_number: string | null;
  email?: string | null;
  thumbnail: string | null;
  identifier?: string | null;
  additional_attributes?: Record<string, unknown> | null;
  custom_attributes?: Record<string, unknown> | null;
}

export interface ChatwootMessage {
  id: number;
  content: string | null;
  message_type: number; // 0 incoming, 1 outgoing, 2 activity, 3 template
  created_at: number; // epoch seconds
  private?: boolean;
  status?: string | null; // sent, delivered, read, failed (outgoing)
  sender?: { name?: string | null } | null;
  attachments?: Array<{ data_url?: string; file_type?: string }> | null;
}

export interface ChatwootConversation {
  id: number;
  inbox_id: number;
  status: string;
  unread_count?: number;
  muted?: boolean;
  priority?: string | null;
  snoozed_until?: string | number | null;
  labels?: string[];
  meta?: { sender?: ChatwootContact | null } | null;
  last_non_activity_message?: ChatwootMessage | null;
  messages?: ChatwootMessage[];
}

export interface ChatwootLabel {
  id: number;
  title: string;
  description?: string | null;
  color?: string | null;
}

export interface ConversationsPage {
  payload: ChatwootConversation[];
  meta: Record<string, unknown>;
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

function buildConfig(row: {
  id: string;
  chatwoot_account_id?: string | null;
  chatwoot_token?: string | null;
  chatwoot_inbox_id?: string | null;
}): ChatwootConfig {
  const accountId = row.chatwoot_account_id?.trim();
  const token = row.chatwoot_token?.trim();
  if (!accountId || !token) {
    throw new Error("Chatwoot não configurado para este cartório.");
  }
  return {
    cartorioId: row.id,
    baseUrl: DEFAULT_CHATWOOT_URL.replace(/\/+$/, ""),
    accountId,
    token,
    inboxId: row.chatwoot_inbox_id?.trim() || null,
  };
}

/** Lê as credenciais Chatwoot do cartório via service role. */
export async function getChatwootConfig(
  cartorioId: string
): Promise<ChatwootConfig> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("cartorios")
    .select("id, chatwoot_account_id, chatwoot_token, chatwoot_inbox_id")
    .eq("id", cartorioId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Cartório não encontrado.");
  }
  return buildConfig(data);
}

/** Resolve o cartório a partir do account.id presente no payload do webhook. */
export async function getConfigByAccountId(
  accountId: string | number
): Promise<ChatwootConfig | null> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("cartorios")
    .select("id, chatwoot_account_id, chatwoot_token, chatwoot_inbox_id")
    .eq("chatwoot_account_id", String(accountId))
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  try {
    return buildConfig(data);
  } catch {
    return null;
  }
}

async function chatwootFetch<T>(
  config: ChatwootConfig,
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${config.baseUrl}/api/v1/accounts/${config.accountId}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      api_access_token: config.token,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Chatwoot API ${res.status}: ${text || res.statusText}`
    );
  }
  return (await res.json()) as T;
}

/** Lista conversas do cartório (opcionalmente filtradas pela inbox configurada). */
export async function listConversations(
  config: ChatwootConfig,
  opts?: { status?: string; page?: number }
): Promise<ConversationsPage> {
  const params = new URLSearchParams();
  // Sem status, o Chatwoot retorna só conversas "open" — usamos "all" para
  // incluir também pendentes, snoozed e resolvidas.
  params.set("status", opts?.status || "all");
  if (opts?.page) params.set("page", String(opts.page));
  if (config.inboxId) params.set("inbox_id", config.inboxId);

  const qs = params.toString();
  const data = await chatwootFetch<{
    data?: { payload?: ChatwootConversation[]; meta?: Record<string, unknown> };
  }>(config, `/conversations${qs ? `?${qs}` : ""}`);

  return {
    payload: data?.data?.payload ?? [],
    meta: data?.data?.meta ?? {},
  };
}

/** Altera o status da conversa: open | resolved | pending | snoozed. */
export async function setConversationStatus(
  config: ChatwootConfig,
  conversationId: number | string,
  status: "open" | "resolved" | "pending" | "snoozed",
  snoozedUntil?: number | null
): Promise<void> {
  const body: Record<string, unknown> = { status };
  if (status === "snoozed" && snoozedUntil) {
    body.snoozed_until = snoozedUntil;
  }
  await chatwootFetch(
    config,
    `/conversations/${conversationId}/toggle_status`,
    { method: "POST", body: JSON.stringify(body) }
  );
}

/** Silencia / reativa uma conversa. */
export async function setConversationMute(
  config: ChatwootConfig,
  conversationId: number | string,
  mute: boolean
): Promise<void> {
  await chatwootFetch(
    config,
    `/conversations/${conversationId}/${mute ? "mute" : "unmute"}`,
    { method: "POST" }
  );
}

/** Lista as etiquetas (labels) da conta. */
export async function listLabels(
  config: ChatwootConfig
): Promise<ChatwootLabel[]> {
  const data = await chatwootFetch<{ payload?: ChatwootLabel[] }>(
    config,
    `/labels`
  );
  return data?.payload ?? [];
}

/** Etiquetas aplicadas a uma conversa. */
export async function getConversationLabels(
  config: ChatwootConfig,
  conversationId: number | string
): Promise<string[]> {
  const data = await chatwootFetch<{ payload?: string[] }>(
    config,
    `/conversations/${conversationId}/labels`
  );
  return data?.payload ?? [];
}

/** Define (substitui) as etiquetas de uma conversa. */
export async function setConversationLabels(
  config: ChatwootConfig,
  conversationId: number | string,
  labels: string[]
): Promise<string[]> {
  const data = await chatwootFetch<{ payload?: string[] }>(
    config,
    `/conversations/${conversationId}/labels`,
    { method: "POST", body: JSON.stringify({ labels }) }
  );
  return data?.payload ?? labels;
}

/** Detalhes de um contato. */
export async function getContact(
  config: ChatwootConfig,
  contactId: number | string
): Promise<ChatwootContact> {
  const data = await chatwootFetch<{ payload?: ChatwootContact }>(
    config,
    `/contacts/${contactId}`
  );
  if (!data?.payload) throw new Error("Contato não encontrado.");
  return data.payload;
}

/** Atualiza os dados de um contato. */
export async function updateContact(
  config: ChatwootConfig,
  contactId: number | string,
  payload: {
    name?: string;
    email?: string | null;
    phone_number?: string | null;
  }
): Promise<ChatwootContact> {
  const data = await chatwootFetch<{ payload?: ChatwootContact }>(
    config,
    `/contacts/${contactId}`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
  return (data?.payload ?? {}) as ChatwootContact;
}

/** Histórico de mensagens de uma conversa (ordem cronológica). */
export async function getMessages(
  config: ChatwootConfig,
  conversationId: number | string
): Promise<ChatwootMessage[]> {
  const data = await chatwootFetch<{ payload?: ChatwootMessage[] }>(
    config,
    `/conversations/${conversationId}/messages`
  );
  return data?.payload ?? [];
}

/**
 * Grava (upsert) uma mensagem do Chatwoot na tabela chatwoot_messages.
 * Serve como barramento de realtime: dedupe por id evita duplicar entre
 * webhook e envio. Falhas aqui não devem quebrar o fluxo principal.
 */
export async function upsertMessageCache(
  cartorioId: string,
  conversationId: number | string,
  msg: ChatwootMessage
): Promise<void> {
  if (!msg?.id) return;
  const admin = getAdminClient();
  const { error } = await admin.from("chatwoot_messages").upsert(
    {
      id: msg.id,
      cartorio_id: cartorioId,
      conversation_id: Number(conversationId),
      content: msg.content ?? null,
      message_type: typeof msg.message_type === "number" ? msg.message_type : 0,
      sender_name: msg.sender?.name ?? null,
      attachments: msg.attachments ?? null,
      created_at: msg.created_at
        ? new Date(msg.created_at * 1000).toISOString()
        : new Date().toISOString(),
      raw: msg as unknown as Record<string, unknown>,
    },
    { onConflict: "id" }
  );
  if (error) {
    console.error("[chatwoot] Erro ao gravar mensagem no cache:", error.message);
  }
}

/**
 * Marca a conversa como lida (zera o unread_count no Chatwoot).
 * Falhas aqui não devem quebrar o fluxo da UI.
 */
export async function markConversationRead(
  config: ChatwootConfig,
  conversationId: number | string
): Promise<void> {
  try {
    await chatwootFetch(
      config,
      `/conversations/${conversationId}/update_last_seen`,
      {
        method: "POST",
        body: JSON.stringify({
          agent_last_seen_at: Math.floor(Date.now() / 1000),
        }),
      }
    );
  } catch (e) {
    console.error(
      "[chatwoot] Erro ao marcar conversa como lida:",
      e instanceof Error ? e.message : e
    );
  }
}

/** Envia uma mensagem (outgoing) numa conversa. Opcionalmente como nota privada. */
export async function sendMessage(
  config: ChatwootConfig,
  conversationId: number | string,
  content: string,
  opts?: { isPrivate?: boolean }
): Promise<ChatwootMessage> {
  return chatwootFetch<ChatwootMessage>(
    config,
    `/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        content,
        message_type: "outgoing",
        private: opts?.isPrivate === true,
      }),
    }
  );
}

/**
 * Envia uma mensagem com anexos (multipart). O FormData já deve conter os
 * campos esperados pelo Chatwoot: content?, message_type, private?, attachments[].
 */
export async function sendMessageMultipart(
  config: ChatwootConfig,
  conversationId: number | string,
  form: FormData
): Promise<ChatwootMessage> {
  const url = `${config.baseUrl}/api/v1/accounts/${config.accountId}/conversations/${conversationId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      // NÃO definir Content-Type: o fetch adiciona o boundary do multipart.
      api_access_token: config.token,
    },
    body: form,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Chatwoot API ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as ChatwootMessage;
}
