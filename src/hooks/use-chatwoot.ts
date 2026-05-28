"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

export interface ChatConversation {
  id: number;
  name: string;
  phone: string | null;
  thumbnail: string | null;
  lastMessage: string;
  unreadCount: number;
  status: string;
}

export interface ChatMessage {
  id: number;
  content: string | null;
  outgoing: boolean;
  senderName: string | null;
  createdAt: number; // epoch ms
  attachments: Array<{ data_url?: string; file_type?: string }> | null;
}

interface RawConversation {
  id: number;
  status: string;
  unread_count?: number;
  meta?: {
    sender?: {
      name?: string | null;
      phone_number?: string | null;
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
  sender?: { name?: string | null } | null;
  attachments?: Array<{ data_url?: string; file_type?: string }> | null;
}

function normalizeConversation(c: RawConversation): ChatConversation {
  const last =
    c.last_non_activity_message?.content ??
    c.messages?.[c.messages.length - 1]?.content ??
    "";
  return {
    id: c.id,
    name: c.meta?.sender?.name?.trim() || `Conversa #${c.id}`,
    phone: c.meta?.sender?.phone_number ?? null,
    thumbnail: c.meta?.sender?.thumbnail ?? null,
    lastMessage: last ?? "",
    unreadCount: c.unread_count ?? 0,
    status: c.status,
  };
}

function normalizeApiMessage(m: RawMessage): ChatMessage {
  return {
    id: m.id,
    content: m.content,
    outgoing: m.message_type === 1,
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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedIdRef = useRef<number | null>(null);
  selectedIdRef.current = selectedId;

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

  const loadConversations = useCallback(async () => {
    if (!accessToken) return;
    setLoadingConversations(true);
    setError(null);
    try {
      const res = await fetch("/api/chatwoot/conversations", {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao listar conversas.");
      setConversations(
        (data.conversations as RawConversation[]).map(normalizeConversation)
      );
    } catch (e: any) {
      setError(e?.message || "Erro ao listar conversas.");
    } finally {
      setLoadingConversations(false);
    }
  }, [accessToken, authHeaders]);

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

      // Marca como lida no Chatwoot (não bloqueia a UI) e avisa o provedor
      // global para atualizar o badge da sidebar.
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
    async (content: string) => {
      const text = content.trim();
      const conversationId = selectedIdRef.current;
      if (!text || !conversationId || !accessToken) return;
      setSending(true);
      try {
        const res = await fetch(
          `/api/chatwoot/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ content: text }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erro ao enviar mensagem.");
        const msg = normalizeApiMessage(data.message as RawMessage);
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
      } catch (e: any) {
        setError(e?.message || "Erro ao enviar mensagem.");
      } finally {
        setSending(false);
      }
    },
    [accessToken, authHeaders]
  );

  // Carrega conversas ao ter token.
  useEffect(() => {
    if (accessToken) loadConversations();
  }, [accessToken, loadConversations]);

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
            attachments: ChatMessage["attachments"];
            created_at: string;
          };

          if (row.conversation_id === selectedIdRef.current) {
            const msg: ChatMessage = {
              id: row.id,
              content: row.content,
              outgoing: row.message_type === 1,
              senderName: row.sender_name,
              createdAt: new Date(row.created_at).getTime(),
              attachments: row.attachments,
            };
            setMessages((prev) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
            );
          }

          // Atualiza a lista (última mensagem / ordem / não lidas).
          loadConversations();
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
    selectedId,
    selectConversation,
    messages,
    loadingMessages,
    sendMessage,
    sending,
    error,
    reloadConversations: loadConversations,
  };
}
