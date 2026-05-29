"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import {
  ensureNotificationPermission,
  playNotificationSound,
  showChatNotification,
} from "@/lib/chat-notify";

interface ChatNotificationsValue {
  /** Quantidade de conversas com mensagens não lidas. */
  unreadConversations: number;
  /** Recarrega a contagem de não lidas. */
  refreshUnread: () => void;
}

const ChatNotificationsContext = createContext<ChatNotificationsValue>({
  unreadConversations: 0,
  refreshUnread: () => {},
});

export function useChatNotifications() {
  return useContext(ChatNotificationsContext);
}

/**
 * Provedor global de notificações de chat. Roda em todas as páginas
 * autenticadas (montado no MainLayout): escuta novas mensagens via Realtime,
 * toca som / mostra notificação do navegador, e mantém a contagem de conversas
 * não lidas para o badge da sidebar.
 */
export function ChatNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, user } = useAuth();
  const accessToken = session?.access_token;
  const [cartorioId, setCartorioId] = useState<string | null>(null);
  const [unreadConversations, setUnreadConversations] = useState(0);

  // Cartório do usuário (para o filtro do Realtime).
  useEffect(() => {
    if (!user?.id) {
      setCartorioId(null);
      return;
    }
    supabase
      .from("users")
      .select("cartorio_id")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setCartorioId(data?.cartorio_id ?? null));
  }, [user?.id]);

  const refreshUnread = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch("/api/chatwoot/conversations", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.conversations ?? []) as Array<{
        unread_count?: number;
      }>;
      setUnreadConversations(
        list.filter((c) => (c.unread_count ?? 0) > 0).length
      );
    } catch {
      // silencioso
    }
  }, [accessToken]);

  // Pede permissão de notificação quando o usuário estiver autenticado.
  useEffect(() => {
    if (accessToken) ensureNotificationPermission();
  }, [accessToken]);

  // Carrega a contagem quando houver token.
  useEffect(() => {
    if (accessToken) refreshUnread();
  }, [accessToken, refreshUnread]);

  // Recarrega ao receber sinal (ex.: depois de marcar uma conversa como lida).
  useEffect(() => {
    const handler = () => refreshUnread();
    window.addEventListener("chatwoot:unread-refresh", handler);
    return () => window.removeEventListener("chatwoot:unread-refresh", handler);
  }, [refreshUnread]);

  // Realtime: novas mensagens do cartório (em qualquer página).
  useEffect(() => {
    if (!cartorioId) return;
    const channel = supabase
      .channel(`chatwoot_notify_${cartorioId}`)
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
            content: string | null;
            message_type: number;
            sender_name: string | null;
          };
          // Mensagem recebida (incoming): som sempre; notificação se a aba
          // não estiver em foco.
          if (row.message_type === 0) {
            playNotificationSound();
            if (typeof document !== "undefined" && document.hidden) {
              const who = row.sender_name?.trim() || "Nova mensagem";
              showChatNotification(who, row.content || "Enviou uma mensagem");
            }
          }
          refreshUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cartorioId, refreshUnread]);

  return (
    <ChatNotificationsContext.Provider
      value={{ unreadConversations, refreshUnread }}
    >
      {children}
    </ChatNotificationsContext.Provider>
  );
}
