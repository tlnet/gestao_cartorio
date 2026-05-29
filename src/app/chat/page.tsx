"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EmojiPicker } from "@/components/chat/emoji-picker";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Send,
  Search,
  Paperclip,
  MoreVertical,
  CheckCircle2,
  Clock,
  RotateCcw,
  BellOff,
  Bell,
  Check,
  CheckCheck,
  AlertCircle,
  X,
  StickyNote,
  Info,
  Tag,
  Pencil,
  AlarmClock,
} from "lucide-react";
import {
  useChatwoot,
  type ChatMessage,
  type ChatConversation,
  type ConversationStatus,
} from "@/hooks/use-chatwoot";

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

function MessageStatusIcon({ status }: { status: string | null }) {
  if (status === "read")
    return <CheckCheck className="h-3 w-3 text-blue-200" />;
  if (status === "delivered")
    return <CheckCheck className="h-3 w-3 text-blue-100/70" />;
  if (status === "failed")
    return <AlertCircle className="h-3 w-3 text-red-300" />;
  return <Check className="h-3 w-3 text-blue-100/70" />;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isNote = message.private;
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
          isNote
            ? "border border-yellow-300 bg-yellow-50 text-yellow-900 rounded-br-sm"
            : message.outgoing
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
        )}
      >
        {isNote && (
          <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-yellow-700">
            <StickyNote className="h-3 w-3" /> Nota interna
          </span>
        )}
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
                message.outgoing && !isNote ? "text-blue-100" : "text-blue-600"
              )}
            >
              <Paperclip className="h-3 w-3" />
              {a.file_type || "anexo"}
            </a>
          ) : null
        )}
        <span
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px]",
            isNote
              ? "text-yellow-600"
              : message.outgoing
              ? "text-blue-100"
              : "text-gray-400"
          )}
        >
          {formatTime(message.createdAt)}
          {message.outgoing && !isNote && (
            <MessageStatusIcon status={message.status} />
          )}
        </span>
      </div>
    </div>
  );
}

const STATUS_TABS: { value: ConversationStatus; label: string }[] = [
  { value: "open", label: "Abertas" },
  { value: "pending", label: "Pendentes" },
  { value: "resolved", label: "Resolvidas" },
];

const ChatPage = () => {
  const {
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
  } = useChatwoot();

  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("");
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [showContact, setShowContact] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      const matchName = c.name.toLowerCase().includes(filter.toLowerCase());
      const matchLabel = !labelFilter || c.labels.includes(labelFilter);
      return matchName && matchLabel;
    });
  }, [conversations, filter, labelFilter]);

  const handleSend = async () => {
    if ((!draft.trim() && files.length === 0) || sending) return;
    const text = draft;
    const attached = files;
    setDraft("");
    setFiles([]);
    try {
      await sendMessage(text, { isPrivate, files: attached });
    } catch {
      // erro tratado no hook
    }
  };

  const handlePickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
    e.target.value = "";
  };

  const openEditContact = () => {
    if (!selectedConversation) return;
    setContactForm({
      name: selectedConversation.name || "",
      email: selectedConversation.email || "",
      phone: selectedConversation.phone || "",
    });
    setEditOpen(true);
  };

  const handleSaveContact = async () => {
    if (!selectedConversation?.contactId) return;
    try {
      await updateContact(selectedConversation.contactId, {
        name: contactForm.name,
        email: contactForm.email,
        phone_number: contactForm.phone,
      });
      setEditOpen(false);
    } catch {
      // erro tratado no hook
    }
  };

  const toggleLabel = (conv: ChatConversation, title: string) => {
    const next = conv.labels.includes(title)
      ? conv.labels.filter((l) => l !== title)
      : [...conv.labels, title];
    applyLabels(conv.id, next);
  };

  const snoozeOptions = [
    { label: "Adiar 1 hora", secs: () => Math.floor(Date.now() / 1000) + 3600 },
    {
      label: "Adiar até amanhã",
      secs: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return Math.floor(d.getTime() / 1000);
      },
    },
    {
      label: "Adiar 1 semana",
      secs: () => Math.floor(Date.now() / 1000) + 7 * 86400,
    },
  ];

  return (
    <ProtectedRoute>
      <RequirePermission requiredPage="/chat">
        <MainLayout title="Chat" subtitle="Atendimento integrado ao Chatwoot">
          <Card className="flex h-[calc(100vh-12rem)] overflow-hidden p-0">
            {/* Lista de conversas */}
            <div className="flex w-80 flex-shrink-0 flex-col border-r border-gray-200">
              <div className="space-y-2 border-b border-gray-200 p-3">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar conversa..."
                    className="pl-8"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>

                <Tabs
                  value={statusFilter}
                  onValueChange={(v) =>
                    changeStatusFilter(v as ConversationStatus)
                  }
                >
                  <TabsList className="grid w-full grid-cols-3">
                    {STATUS_TABS.map((t) => (
                      <TabsTrigger key={t.value} value={t.value}>
                        {t.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {accountLabels.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                      >
                        <Tag className="mr-2 h-3.5 w-3.5" />
                        {labelFilter
                          ? `Etiqueta: ${labelFilter}`
                          : "Filtrar por etiqueta"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuItem onClick={() => setLabelFilter(null)}>
                        Todas
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {accountLabels.map((l) => (
                        <DropdownMenuItem
                          key={l.id}
                          onClick={() => setLabelFilter(l.title)}
                        >
                          <span
                            className="mr-2 h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: l.color || "#999" }}
                          />
                          {l.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
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
                  <>
                    {filtered.map((c) => (
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
                            <p className="flex items-center gap-1 truncate text-sm font-medium text-gray-900">
                              {c.muted && (
                                <BellOff className="h-3 w-3 flex-shrink-0 text-gray-400" />
                              )}
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
                          {c.labels.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {c.labels.slice(0, 3).map((l) => (
                                <span
                                  key={l}
                                  className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                                >
                                  {l}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}

                    {hasMore && (
                      <div className="p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={loadMore}
                          disabled={loadingMore}
                        >
                          {loadingMore ? "Carregando..." : "Carregar mais"}
                        </Button>
                      </div>
                    )}
                  </>
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
                  {/* Cabeçalho */}
                  <div className="flex items-center gap-3 border-b border-gray-200 bg-white p-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={selectedConversation?.thumbnail || undefined}
                      />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getInitials(selectedConversation?.name || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {selectedConversation?.name}
                      </p>
                      {selectedConversation?.phone && (
                        <p className="truncate text-xs text-gray-500">
                          {selectedConversation.phone}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowContact((v) => !v)}
                      title="Detalhes do contato"
                    >
                      <Info className="h-5 w-5 text-gray-500" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-5 w-5 text-gray-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {selectedConversation?.status !== "resolved" ? (
                          <DropdownMenuItem
                            onClick={() =>
                              selectedId &&
                              changeConversationStatus(selectedId, "resolved")
                            }
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                            Resolver
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              selectedId &&
                              changeConversationStatus(selectedId, "open")
                            }
                          >
                            <RotateCcw className="mr-2 h-4 w-4 text-blue-600" />
                            Reabrir
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() =>
                            selectedId &&
                            changeConversationStatus(selectedId, "pending")
                          }
                        >
                          <Clock className="mr-2 h-4 w-4 text-amber-600" />
                          Marcar como pendente
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {snoozeOptions.map((o) => (
                          <DropdownMenuItem
                            key={o.label}
                            onClick={() =>
                              selectedId &&
                              changeConversationStatus(
                                selectedId,
                                "snoozed",
                                o.secs()
                              )
                            }
                          >
                            <AlarmClock className="mr-2 h-4 w-4 text-gray-500" />
                            {o.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        {selectedConversation?.muted ? (
                          <DropdownMenuItem
                            onClick={() =>
                              selectedId && toggleMute(selectedId, false)
                            }
                          >
                            <Bell className="mr-2 h-4 w-4" />
                            Reativar notificações
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              selectedId && toggleMute(selectedId, true)
                            }
                          >
                            <BellOff className="mr-2 h-4 w-4" />
                            Silenciar conversa
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-1 overflow-hidden">
                    {/* Thread */}
                    <div className="flex flex-1 flex-col">
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

                      {/* Anexos selecionados */}
                      {files.length > 0 && (
                        <div className="flex flex-wrap gap-2 border-t border-gray-200 bg-white px-3 pt-2">
                          {files.map((f, i) => (
                            <span
                              key={i}
                              className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
                            >
                              <Paperclip className="h-3 w-3" />
                              <span className="max-w-[140px] truncate">
                                {f.name}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setFiles((prev) =>
                                    prev.filter((_, idx) => idx !== i)
                                  )
                                }
                              >
                                <X className="h-3 w-3 text-gray-500 hover:text-red-500" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Composer */}
                      <div
                        className={cn(
                          "flex items-center gap-1 border-t border-gray-200 bg-white p-3",
                          isPrivate && "bg-yellow-50"
                        )}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "text-gray-500",
                            isPrivate && "text-yellow-600"
                          )}
                          onClick={() => setIsPrivate((v) => !v)}
                          title={
                            isPrivate
                              ? "Nota interna (só a equipe vê)"
                              : "Enviar como mensagem"
                          }
                        >
                          <StickyNote className="h-5 w-5" />
                        </Button>

                        <EmojiPicker
                          disabled={sending}
                          onSelect={(e) => setDraft((d) => d + e)}
                        />

                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handlePickFiles}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-gray-500"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={sending}
                          title="Anexar arquivo"
                        >
                          <Paperclip className="h-5 w-5" />
                        </Button>

                        <Input
                          placeholder={
                            isPrivate
                              ? "Escreva uma nota interna..."
                              : "Digite uma mensagem..."
                          }
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
                          disabled={
                            sending || (!draft.trim() && files.length === 0)
                          }
                          className={cn(
                            isPrivate
                              ? "bg-yellow-500 hover:bg-yellow-600"
                              : "bg-blue-600 hover:bg-blue-700"
                          )}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Painel de detalhes do contato */}
                    {showContact && selectedConversation && (
                      <div className="w-72 flex-shrink-0 border-l border-gray-200 bg-white">
                        <ScrollArea className="h-full p-4">
                          <div className="flex flex-col items-center text-center">
                            <Avatar className="h-16 w-16">
                              <AvatarImage
                                src={selectedConversation.thumbnail || undefined}
                              />
                              <AvatarFallback className="bg-blue-100 text-lg text-blue-600">
                                {getInitials(selectedConversation.name)}
                              </AvatarFallback>
                            </Avatar>
                            <p className="mt-2 font-medium text-gray-900">
                              {selectedConversation.name}
                            </p>
                          </div>

                          <div className="mt-4 space-y-2 text-sm">
                            <div>
                              <p className="text-xs text-gray-400">Telefone</p>
                              <p className="text-gray-800">
                                {selectedConversation.phone || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">E-mail</p>
                              <p className="break-all text-gray-800">
                                {selectedConversation.email || "—"}
                              </p>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 w-full"
                            onClick={openEditContact}
                            disabled={!selectedConversation.contactId}
                          >
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Editar contato
                          </Button>

                          {/* Etiquetas */}
                          <div className="mt-5">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase text-gray-400">
                                Etiquetas
                              </p>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                  >
                                    <Tag className="mr-1 h-3 w-3" /> Gerenciar
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56" align="end">
                                  {accountLabels.length === 0 ? (
                                    <p className="text-xs text-gray-500">
                                      Nenhuma etiqueta cadastrada no Chatwoot.
                                    </p>
                                  ) : (
                                    <div className="space-y-1">
                                      {accountLabels.map((l) => {
                                        const checked =
                                          selectedConversation.labels.includes(
                                            l.title
                                          );
                                        return (
                                          <label
                                            key={l.id}
                                            className="flex cursor-pointer items-center gap-2 rounded p-1 text-sm hover:bg-gray-50"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={checked}
                                              onChange={() =>
                                                toggleLabel(
                                                  selectedConversation,
                                                  l.title
                                                )
                                              }
                                            />
                                            <span
                                              className="h-2.5 w-2.5 rounded-full"
                                              style={{
                                                backgroundColor:
                                                  l.color || "#999",
                                              }}
                                            />
                                            {l.title}
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}
                                </PopoverContent>
                              </Popover>
                            </div>
                            {selectedConversation.labels.length === 0 ? (
                              <p className="text-xs text-gray-400">
                                Sem etiquetas.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {selectedConversation.labels.map((l) => (
                                  <Badge
                                    key={l}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {l}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
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

          {/* Dialog: editar contato */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar contato</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="c-name">Nome</Label>
                  <Input
                    id="c-name"
                    value={contactForm.name}
                    onChange={(e) =>
                      setContactForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="c-email">E-mail</Label>
                  <Input
                    id="c-email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) =>
                      setContactForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="c-phone">Telefone</Label>
                  <Input
                    id="c-phone"
                    value={contactForm.phone}
                    onChange={(e) =>
                      setContactForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="+5511999999999"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveContact}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </MainLayout>
      </RequirePermission>
    </ProtectedRoute>
  );
};

export default ChatPage;
