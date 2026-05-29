"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

const PAGE_SIZE = 25;

export type ConversationStatus = "open" | "pending" | "resolved" | "snoozed";

export interface ChatAttachment {
  data_url?: string;
  file_type?: string;
}

export interface ChatConversation {
  id: number;
  contactId: number | null;
  name: string;
  phone: string | null;
  email: string | null;
  thumbnail: string | null;
  lastMessage: string;
  unreadCount: number;
  status: string;
  muted: boolean;
  priority: string | null;
  labels: string[];
}

export interface ChatMessage {
  id: number;
  content: string | null;
  outgoing: boolean;
  private: boolean;
  status: string | null; // sent | delivered | read | failed
  senderName: string | null;
  createdAt: number; // epoch ms
  attachments: ChatAttachment[] | null;
}

export interface ChatLabel {
  id: number;
  title: string;
  color?: string | null;
}

interface RawConversation {
  id: number;
  status: string;
  unread_count?: number;
  muted?: boolean;
  priority?: string | null;
  labels?: string[];
  meta?: {
    sender?: {
      id?: number;
      name?: string | null;
      phone_number?: string | null;
      email?: string | null;
      thumbnail?: string | null;
    } | null;
  } | null;
  last_non_activity_message?: { content?: string | null } | null;
  messages?: Array<{ content?: string | null }>;
}

interface RawMessage {
  id: number;
  content: string | null;
  message_type: number;
  created_at: number; // epoch seconds
  private?: boolean;
  status?: string | null;
  sender?: { name?: string | null } | null;
  attachments?: ChatAttachment[] | null;
}

function normalizeConversation(c: RawConversation): ChatConversation {
  const last =
    c.last_non_activity_message?.content ??
    c.messages?.[c.messages.length - 1]?.content ??
    "";
  return {
    id: c.id,
    contactId: c.meta?.sender?.id ?? null,
    name: c.meta?.sender?.name?.trim() || `Conversa #${c.id}`,
    phone: c.meta?.sender?.phone_number ?? null,
    email: c.meta?.sender?.email ?? null,
    thumbnail: c.meta?.sender?.thumbnail ?? null,
    lastMessage: last ?? "",
    unreadCount: c.unread_count ?? 0,
    status: c.status,
    muted: Boolean(c.muted),
    priority: c.priority ?? null,
    labels: Array.isArray(c.labels) ? c.labels : [],
  };
}

function normalizeApiMessage(m: RawMessage): ChatMessage {
  return {
    id: m.id,
    content: m.content,
    outgoing: m.message_type === 1,
    private: Boolean(m.private),
    status: m.status ?? null,
    senderName: m.sender?.name ?? null,
    createdAt: (m.created_at || 0) * 1000,
    attachments: m.attachments ?? null,
  };
}

export function useChatwoot() {
  const { session, user } = useAuth();
  const accessToken = session?.access_token;

  const [cartorioId, setCartorioId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] =
    useState<ConversationStatus>("open");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [accountLabels, setAccountLabels] = useState<ChatLabel[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedIdRef = useRef<number | null>(null);
  selectedIdRef.current = selectedId;
  const statusFilterRef = useRef<ConversationStatus>(statusFilter);
  statusFilterRef.current = statusFilter;

  const authHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    }),
    [accessToken]
  );

  // Cartório do usuário (para o filtro do Realtime).
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("users")
      .select("cartorio_id")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setCartorioId(data?.cartorio_id ?? null));
  }, [user?.id]);

  const loadConversations = useCallback(
    async (opts?: {
      status?: ConversationStatus;
      page?: number;
      append?: boolean;
    }) => {
      if (!accessToken) return;
      const status = opts?.status ?? statusFilterRef.current;
      const targetPage = opts?.page ?? 1;
      const append = opts?.append ?? false;

      if (append) setLoadingMore(true);
      else setLoadingConversations(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/chatwoot/conversations?status=${status}&page=${targetPage}`,
          { headers: authHeaders() }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erro ao listar conversas.");

        const raw = (data.conversations as RawConversation[]) || [];
        const normalized = raw.map(normalizeConversation);

        setConversations((prev) => {
          if (!append) return normalized;
          const seen = new Set(prev.map((c) => c.id));
          return [...prev, ...normalized.filter((c) => !seen.has(c.id))];
        });
        setHasMore(raw.length >= PAGE_SIZE);
        setPage(targetPage);
      } catch (e: any) {
        setError(e?.message || "Erro ao listar conversas.");
      } finally {
        if (append) setLoadingMore(false);
        else setLoadingConversations(false);
      }
    },
    [accessToken, authHeaders]
  );

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    loadConversations({ page: page + 1, append: true });
  }, [loadingMore, hasMore, page, loadConversations]);

  const changeStatusFilter = useCallback(
    (status: ConversationStatus) => {
      setStatusFilter(status);
      setSelectedId(null);
      setMessages([]);
      loadConversations({ status, page: 1 });
    },
    [loadConversations]
  );

  const loadMessages = useCallback(
    async (conversationId: number) => {
      if (!accessToken) return;
      setLoadingMessages(true);
      try {
        const res = await fetch(
          `/api/chatwoot/conversations/${conversationId}/messages`,
          { headers: authHeaders() }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erro ao carregar mensagens.");
        setMessages(
          (data.messages as RawMessage[])
            .filter((m) => m.message_type === 0 || m.message_type === 1)
            .map(normalizeApiMessage)
        );
      } catch (e: any) {
        setError(e?.message || "Erro ao carregar mensagens.");
      } finally {
        setLoadingMessages(false);
      }
    },
    [accessToken, authHeaders]
  );

  const selectConversation = useCallback(
    (conversationId: number) => {
      setSelectedId(conversationId);
      setMessages([]);
      loadMessages(conversationId);

      // Zera o contador de não lidas imediatamente na UI.
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        )
      );

      // Marca como lida no Chatwoot e avisa o provedor global (badge sidebar).
      if (accessToken) {
        fetch(`/api/chatwoot/conversations/${conversationId}/read`, {
          method: "POST",
          headers: authHeaders(),
        })
          .then(() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("chatwoot:unread-refresh"));
            }
          })
          .catch(() => {});
      }
    },
    [loadMessages, accessToken, authHeaders]
  );

  const sendMessage = useCallback(
    async (
      content: string,
      opts?: { isPrivate?: boolean; files?: File[] }
    ) => {
      const text = (content || "").trim();
      const files = opts?.files ?? [];
      const isPrivate = opts?.isPrivate === true;
      const conversationId = selectedIdRef.current;
      if ((!text && files.length === 0) || !conversationId || !accessToken)
        return;

      setSending(true);
      try {
        const url = `/api/chatwoot/conversations/${conversationId}/messages`;
        let res: Response;

        if (files.length > 0) {
          const form = new FormData();
          if (text) form.append("content", text);
          if (isPrivate) form.append("private", "true");
          for (const f of files) form.append("attachments", f, f.name);
          res = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
            body: form,
          });
        } else {
          res = await fetch(url, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ content: text, private: isPrivate }),
          });
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erro ao enviar mensagem.");
        const msg = normalizeApiMessage(data.message as RawMessage);
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
      } catch (e: any) {
        setError(e?.message || "Erro ao enviar mensagem.");
        throw e;
      } finally {
        setSending(false);
      }
    },
    [accessToken, authHeaders]
  );

  // Alterar status da conversa (resolver / pendente / snooze / reabrir).
  const changeConversationStatus = useCallback(
    async (
      conversationId: number,
      status: ConversationStatus,
      snoozedUntil?: number | null
    ) => {
      if (!accessToken) return;
      try {
        const res = await fetch(
          `/api/chatwoot/conversations/${conversationId}/status`,
          {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ status, snoozed_until: snoozedUntil }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erro ao alterar status.");
        // Recarrega a lista do filtro atual (a conversa pode sair da aba).
        loadConversations({ status: statusFilterRef.current, page: 1 });
      } catch (e: any) {
        setError(e?.message || "Erro ao alterar status.");
        throw e;
      }
    },
    [accessToken, authHeaders, loadConversations]
  );

  // Silenciar / reativar conversa.
  const toggleMute = useCallback(
    async (conversationId: number, mute: boolean) => {
      if (!accessToken) return;
      try {
        const res = await fetch(
          `/api/chatwoot/conversations/${conversationId}/mute`,
          {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ mute }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erro ao silenciar.");
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, muted: mute } : c
          )
        );
      } catch (e: any) {
        setError(e?.message || "Erro ao silenciar conversa.");
        throw e;
      }
    },
    [accessToken, authHeaders]
  );

  // Aplicar etiquetas a uma conversa.
  const applyLabels = useCallback(
    async (conversationId: number, labels: string[]) => {
      if (!accessToken) return;
      try {
        const res = await fetch(
          `/api/chatwoot/conversations/${conversationId}/labels`,
          {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ labels }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erro ao salvar etiquetas.");
        const result = (data.labels as string[]) ?? labels;
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, labels: result } : c
          )
        );
      } catch (e: any) {
        setError(e?.message || "Erro ao salvar etiquetas.");
        throw e;
      }
    },
    [accessToken, authHeaders]
  );

  // Atualizar dados do contato.
  const updateContact = useCallback(
    async (
      contactId: number,
      payload: { name?: string; email?: string | null; phone_number?: string | null }
    ) => {
      if (!accessToken) return;
      try {
        const res = await fetch(`/api/chatwoot/contacts/${contactId}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erro ao atualizar contato.");
        const contact = data.contact as {
          name?: string | null;
          email?: string | null;
          phone_number?: string | null;
        };
        setConversations((prev) =>
          prev.map((c) =>
            c.contactId === contactId
              ? {
                  ...c,
                  name: contact?.name?.trim() || c.name,
                  email: contact?.email ?? c.email,
                  phone: contact?.phone_number ?? c.phone,
                }
              : c
          )
        );
        return contact;
      } catch (e: any) {
        setError(e?.message || "Erro ao atualizar contato.");
        throw e;
      }
    },
    [accessToken, authHeaders]
  );

  // Carrega conversas ao ter token / mudar filtro inicial.
  useEffect(() => {
    if (accessToken) loadConversations({ status: "open", page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Carrega as etiquetas disponíveis na conta.
  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/chatwoot/labels", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.labels)) setAccountLabels(d.labels as ChatLabel[]);
      })
      .catch(() => {});
  }, [accessToken, authHeaders]);

  // Realtime: novas mensagens do cartório.
  useEffect(() => {
    if (!cartorioId) return;
    const channel = supabase
      .channel(`chatwoot_messages_${cartorioId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chatwoot_messages",
          filter: `cartorio_id=eq.${cartorioId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: number;
            conversation_id: number;
            content: string | null;
            message_type: number;
            sender_name: string | null;
            attachments: ChatAttachment[] | null;
            created_at: string;
          };

          if (row.conversation_id === selectedIdRef.current) {
            const msg: ChatMessage = {
              id: row.id,
              content: row.content,
              outgoing: row.message_type === 1,
              private: false,
              status: null,
              senderName: row.sender_name,
              createdAt: new Date(row.created_at).getTime(),
              attachments: row.attachments,
            };
            setMessages((prev) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
            );
          }

          // Atualiza a lista do filtro atual (1ª página).
          loadConversations({ status: statusFilterRef.current, page: 1 });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cartorioId, loadConversations]);

  return {
    conversations,
    loadingConversations,
    loadingMore,
    hasMore,
    loadMore,
    statusFilter,
    changeStatusFilter,
    selectedId,
    selectConversation,
    messages,
    loadingMessages,
    sendMessage,
    sending,
    changeConversationStatus,
    toggleMute,
    accountLabels,
    applyLabels,
    updateContact,
    error,
    reloadConversations: () =>
      loadConversations({ status: statusFilterRef.current, page: 1 }),
  };
}
