"use client";

import React, { useEffect, useRef, useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { RequirePermission } from "@/components/auth/require-permission";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MessageSquare, Send, Search, Paperclip } from "lucide-react";
import { useChatwoot, type ChatMessage } from "@/hooks/use-chatwoot";

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (name.substring(0, 2) || "?").toUpperCase();
}

function formatTime(ms: number) {
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div
      className={cn(
        "flex w-full",
        message.outgoing ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
          message.outgoing
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
        )}
      >
        {message.content && (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
        {message.attachments?.map((a, i) =>
          a.data_url ? (
            <a
              key={i}
              href={a.data_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "mt-1 flex items-center gap-1 text-xs underline",
                message.outgoing ? "text-blue-100" : "text-blue-600"
              )}
            >
              <Paperclip className="h-3 w-3" />
              {a.file_type || "anexo"}
            </a>
          ) : null
        )}
        <span
          className={cn(
            "mt-1 block text-[10px]",
            message.outgoing ? "text-blue-100" : "text-gray-400"
          )}
        >
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

const ChatPage = () => {
  const {
    conversations,
    loadingConversations,
    selectedId,
    selectConversation,
    messages,
    loadingMessages,
    sendMessage,
    sending,
    error,
  } = useChatwoot();

  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSend = async () => {
    if (!draft.trim() || sending) return;
    const text = draft;
    setDraft("");
    await sendMessage(text);
  };

  return (
    <ProtectedRoute>
      <RequirePermission requiredPage="/chat">
        <MainLayout
          title="Chat"
          subtitle="Atendimento integrado ao Chatwoot"
        >
          <Card className="flex h-[calc(100vh-12rem)] overflow-hidden p-0">
            {/* Lista de conversas */}
            <div className="flex w-80 flex-shrink-0 flex-col border-r border-gray-200">
              <div className="border-b border-gray-200 p-3">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar conversa..."
                    className="pl-8"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                {loadingConversations ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500">
                    Nenhuma conversa encontrada.
                  </div>
                ) : (
                  filtered.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectConversation(c.id)}
                      className={cn(
                        "flex w-full items-center gap-3 border-b border-gray-100 p-3 text-left transition-colors hover:bg-gray-50",
                        selectedId === c.id && "bg-blue-50 hover:bg-blue-50"
                      )}
                    >
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={c.thumbnail || undefined} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {getInitials(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {c.name}
                          </p>
                          {c.unreadCount > 0 && (
                            <Badge className="bg-green-500 text-white">
                              {c.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-gray-500">
                          {c.lastMessage || "Sem mensagens"}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </ScrollArea>
            </div>

            {/* Painel da conversa */}
            <div className="flex flex-1 flex-col bg-gray-50">
              {!selectedId ? (
                <div className="flex flex-1 flex-col items-center justify-center text-gray-400">
                  <MessageSquare className="mb-3 h-12 w-12" />
                  <p className="text-sm">Selecione uma conversa para começar</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 border-b border-gray-200 bg-white p-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={selectedConversation?.thumbnail || undefined}
                      />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getInitials(selectedConversation?.name || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedConversation?.name}
                      </p>
                      {selectedConversation?.phone && (
                        <p className="text-xs text-gray-500">
                          {selectedConversation.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    {loadingMessages ? (
                      <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Skeleton
                            key={i}
                            className={cn(
                              "h-12",
                              i % 2 === 0 ? "w-1/2" : "ml-auto w-2/3"
                            )}
                          />
                        ))}
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-gray-400">
                        Nenhuma mensagem nesta conversa.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {messages.map((m) => (
                          <MessageBubble key={m.id} message={m} />
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  <div className="flex items-center gap-2 border-t border-gray-200 bg-white p-3">
                    <Input
                      placeholder="Digite uma mensagem..."
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      disabled={sending}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={sending || !draft.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {error && (
                <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
                  {error}
                </div>
              )}
            </div>
          </Card>
        </MainLayout>
      </RequirePermission>
    </ProtectedRoute>
  );
};

export default ChatPage;
