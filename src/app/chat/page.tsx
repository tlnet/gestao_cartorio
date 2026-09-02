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
import { Textarea } from "@/components/ui/textarea";
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
  Settings,
  Tag,
  Pencil,
  AlarmClock,
  Plus,
  Mail,
  Trash2,
  UserPlus,
  ArrowLeft,
} from "lucide-react";
import {
  useChatwoot,
  type ChatMessage,
  type ChatConversation,
  type ChatLabel,
  type ConversationStatus,
} from "@/hooks/use-chatwoot";
import { useIsChatStacked } from "@/hooks/use-mobile";

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (name.substring(0, 2) || "?").toUpperCase();
}

function resolveLabelColor(
  title: string,
  labels: ChatLabel[],
  fallback = "#9ca3af"
): string {
  const found = labels.find(
    (l) => l.title.toLowerCase() === title.toLowerCase()
  );
  return found?.color?.trim() || fallback;
}

/** Texto legível sobre o fundo da etiqueta (claro → escuro, escuro → branco). */
function contrastTextColor(hex: string): string {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return "#111827";
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#111827" : "#ffffff";
}

function LabelChip({
  title,
  color,
  className,
}: {
  title: string;
  color: string;
  className?: string;
}) {
  const bg = color || "#9ca3af";
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium",
        className
      )}
      style={{ backgroundColor: bg, color: contrastTextColor(bg) }}
      title={title}
    >
      {title}
    </span>
  );
}

function formatTime(ms: number) {
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageStatusIcon({
  status,
  error,
}: {
  status: string | null;
  error?: string | null;
}) {
  if (status === "read")
    return <CheckCheck className="h-3 w-3 text-blue-200" />;
  if (status === "delivered")
    return <CheckCheck className="h-3 w-3 text-blue-100/70" />;
  if (status === "failed")
    return (
      <AlertCircle
        className="h-3 w-3 text-red-300"
        // Sem isto o ícone não diz por que a mensagem falhou.
        aria-label={error || "Falha no envio"}
      />
    );
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
            <MessageStatusIcon
              status={message.status}
              error={message.errorMessage}
            />
          )}
        </span>
        {message.status === "failed" && (
          <p className="mt-1 rounded bg-red-100 px-1.5 py-1 text-[10px] leading-snug text-red-700">
            Não entregue{message.errorMessage ? `: ${message.errorMessage}` : "."}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * O Chatwoot só aceita títulos de etiqueta em minúsculas, sem espaços nem
 * acentos. Normalizamos enquanto o usuário digita para evitar erro 422 da API.
 */
function normalizeLabelTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}

/**
 * Máscara de telefone aplicada enquanto o usuário digita.
 *
 * Até 2 dígitos ficam sem parênteses de propósito: se "(11) " fosse mantido,
 * o backspace reformataria de volta para "(11) " e travaria o apagamento.
 * Números iniciados com "+" passam sem máscara — são estrangeiros e não
 * seguem o formato brasileiro.
 */
function formatPhoneInput(value: string): string {
  const trimmed = value.trimStart();
  if (trimmed.startsWith("+")) {
    return `+${trimmed.replace(/\D/g, "").slice(0, 15)}`;
  }

  const d = trimmed.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Lista de etiquetas com checkbox + criação inline de uma nova etiqueta. */
function LabelPicker({
  labels,
  selected,
  onToggle,
  onCreate,
  onDelete,
}: {
  labels: ChatLabel[];
  selected: string[];
  onToggle: (title: string) => void;
  onCreate: (payload: {
    title: string;
    color?: string;
  }) => Promise<ChatLabel | null>;
  onDelete: (label: ChatLabel) => Promise<void>;
}) {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("#1f93ff");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const confirmDelete = async (label: ChatLabel) => {
    setDeletingId(label.id);
    setErr(null);
    try {
      await onDelete(label);
      setConfirmId(null);
    } catch (e: any) {
      setErr(e?.message || "Erro ao excluir etiqueta.");
    } finally {
      setDeletingId(null);
    }
  };

  const reset = () => {
    setCreating(false);
    setTitle("");
    setErr(null);
  };

  const submit = async () => {
    const t = normalizeLabelTitle(title);
    if (!t || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const created = await onCreate({ title: t, color });
      // Já aplica ao item atual: criar a etiqueta daqui pressupõe querer usá-la.
      if (created?.title) onToggle(created.title);
      reset();
    } catch (e: any) {
      setErr(e?.message || "Erro ao criar etiqueta.");
    } finally {
      setSaving(false);
    }
  };

  // Etiquetas ainda marcadas neste item mas que não existem mais na conta
  // (excluídas por fora do painel, ou antes da limpeza automática existir).
  // Sem isto não haveria como desmarcá-las pela interface.
  const orphans = selected.filter(
    (t) => !labels.some((l) => l.title === t)
  );

  return (
    <div className="space-y-1">
      {labels.length === 0 && orphans.length === 0 ? (
        <p className="text-xs text-gray-500">
          Nenhuma etiqueta cadastrada ainda.
        </p>
      ) : (
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {orphans.map((t) => (
            <div
              key={`orphan-${t}`}
              className="flex items-center gap-2 rounded-md bg-amber-50 p-1.5"
            >
              <input type="checkbox" checked onChange={() => onToggle(t)} />
              <span className="min-w-0 flex-1 truncate text-xs text-amber-800">
                {t}{" "}
                <span className="text-amber-600">(etiqueta excluída)</span>
              </span>
            </div>
          ))}

          {labels.map((l) =>
            confirmId === l.id ? (
              <div
                key={l.id}
                className="flex items-center gap-1 rounded-md bg-red-50 p-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-xs text-red-700">
                  Excluir <strong>{l.title}</strong>?
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 px-2 text-xs"
                  onClick={() => confirmDelete(l)}
                  disabled={deletingId === l.id}
                >
                  {deletingId === l.id ? "..." : "Excluir"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5 text-xs"
                  onClick={() => setConfirmId(null)}
                  disabled={deletingId === l.id}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div
                key={l.id}
                className="group flex items-center gap-1 rounded-md pr-1"
                style={
                  selected.includes(l.title)
                    ? {
                        backgroundColor: `${l.color || "#9ca3af"}33`,
                      }
                    : undefined
                }
              >
                {/* O <label> envolve só o checkbox e o nome: o botão de excluir
                    ficaria dentro da área clicável e alternaria a etiqueta. */}
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 p-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(l.title)}
                    onChange={() => onToggle(l.title)}
                  />
                  <span
                    className="inline-flex max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: l.color || "#9ca3af",
                      color: contrastTextColor(l.color || "#9ca3af"),
                    }}
                  >
                    {l.title}
                  </span>
                </label>
                <button
                  type="button"
                  title={`Excluir etiqueta "${l.title}"`}
                  onClick={() => {
                    setErr(null);
                    setConfirmId(l.id);
                  }}
                  className="flex-shrink-0 rounded p-1 text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          )}
        </div>
      )}

      <div className="mt-2 border-t border-gray-100 pt-2">
        {creating ? (
          <div className="space-y-2">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(normalizeLabelTitle(e.target.value))}
              placeholder="nome-da-etiqueta"
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
                if (e.key === "Escape") reset();
              }}
            />
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-8 flex-shrink-0 cursor-pointer rounded border border-gray-200 p-0"
                title="Cor da etiqueta"
              />
              <Button
                size="sm"
                className="h-8 flex-1"
                onClick={submit}
                disabled={!title.trim() || saving}
              >
                {saving ? "Criando..." : "Criar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={reset}
                disabled={saving}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full justify-start px-1 text-xs"
            onClick={() => setCreating(true)}
          >
            <Plus className="mr-1 h-3 w-3" /> Nova etiqueta
          </Button>
        )}
        {/* Fora do bloco de criação: também mostra erros de exclusão. */}
        {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
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
    clearSelection,
    messages,
    loadingMessages,
    sendMessage,
    sending,
    changeConversationStatus,
    toggleMute,
    markAsUnread,
    accountLabels,
    applyLabels,
    createLabel,
    deleteLabel,
    contactLabels,
    loadingContactLabels,
    applyContactLabels,
    startConversation,
    deleteContact,
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
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });
  const [creatingContact, setCreatingContact] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);
  const [newNotice, setNewNotice] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isStacked = useIsChatStacked();

  const showListPanel = !isStacked || !selectedId;
  const showThreadPanel = !isStacked || !!selectedId;

  useEffect(() => {
    if (!messages.length) return;
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [messages]);

  useEffect(() => {
    setShowContact(false);
  }, [selectedId]);

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  // Se a etiqueta usada no filtro for excluída, o filtro esconderia todas as
  // conversas — voltamos para "Todas".
  useEffect(() => {
    if (labelFilter && !accountLabels.some((l) => l.title === labelFilter)) {
      setLabelFilter(null);
    }
  }, [accountLabels, labelFilter]);

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

  const handleDeleteContact = async () => {
    const contactId = selectedConversation?.contactId;
    if (!contactId || deletingContact) return;
    setDeletingContact(true);
    try {
      await deleteContact(contactId);
      setDeleteOpen(false);
    } catch {
      // erro tratado no hook
    } finally {
      setDeletingContact(false);
    }
  };

  const openNewContact = () => {
    setNewForm({ name: "", phone: "", email: "", message: "" });
    setNewError(null);
    setNewNotice(null);
    setNewOpen(true);
  };

  const handleCreateContact = async () => {
    if (creatingContact) return;
    if (
      !newForm.name.trim() ||
      !newForm.phone.trim() ||
      !newForm.message.trim()
    ) {
      setNewError("Nome, telefone e primeira mensagem são obrigatórios.");
      return;
    }
    setCreatingContact(true);
    setNewError(null);
    setNewNotice(null);
    try {
      const result = await startConversation({
        name: newForm.name.trim(),
        phone: newForm.phone.trim(),
        message: newForm.message.trim(),
        email: newForm.email.trim() || undefined,
      });

      // A mensagem já foi entregue ao WhatsApp; só a conversa no Chatwoot
      // pode demorar. Manter o diálogo aberto com aviso evita a impressão
      // de que o envio falhou.
      if (result && !result.conversationId) {
        setNewNotice(
          "Mensagem enviada. A conversa deve aparecer na lista em instantes."
        );
        return;
      }
      setNewOpen(false);
    } catch (e: any) {
      setNewError(e?.message || "Erro ao iniciar conversa.");
    } finally {
      setCreatingContact(false);
    }
  };

  const toggleLabel = (conv: ChatConversation, title: string) => {
    const next = conv.labels.includes(title)
      ? conv.labels.filter((l) => l !== title)
      : [...conv.labels, title];
    applyLabels(conv.id, next);
  };

  const toggleContactLabel = (title: string) => {
    const contactId = selectedConversation?.contactId;
    if (!contactId) return;
    const next = contactLabels.includes(title)
      ? contactLabels.filter((l) => l !== title)
      : [...contactLabels, title];
    applyContactLabels(contactId, next);
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
        <MainLayout
          title="Chat"
          subtitle="Atendimento integrado ao Chatwoot"
          fullHeight
        >
          <Card className="relative flex min-h-0 flex-1 overflow-hidden p-0">
            {/* Lista de conversas */}
            <div
              className={cn(
                "flex h-full min-w-0 flex-shrink-0 flex-col overflow-hidden border-r border-gray-200",
                isStacked ? "w-full" : "w-80",
                !showListPanel && "hidden"
              )}
            >
              <div className="space-y-2 border-b border-gray-200 p-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Buscar conversa..."
                      className="pl-8"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                  </div>
                  <Button
                    size="icon"
                    className="h-9 w-9 flex-shrink-0 bg-blue-600 hover:bg-blue-700"
                    title="Novo contato"
                    onClick={openNewContact}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
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

              <ScrollArea className="min-h-0 flex-1">
                {loadingConversations && conversations.length === 0 ? (
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
                        type="button"
                        onClick={() => selectConversation(c.id)}
                        className={cn(
                          "grid w-full grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 border-b border-gray-100 px-3.5 py-3 text-left transition-colors hover:bg-gray-50",
                          selectedId === c.id && "bg-blue-50 hover:bg-blue-50",
                          c.unreadCount > 0 && "bg-green-50/60"
                        )}
                      >
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={c.thumbnail || undefined} />
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {getInitials(c.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-900",
                                c.unreadCount > 0
                                  ? "font-semibold"
                                  : "font-medium"
                              )}
                              title={c.name}
                            >
                              {c.muted && (
                                <BellOff className="mr-1 inline h-3 w-3 shrink-0 align-[-2px] text-gray-400" />
                              )}
                              {c.name}
                            </p>
                            {c.unreadCount > 0 && (
                              <Badge
                                className="shrink-0 border-transparent bg-green-500 px-2 py-0.5 text-xs text-white hover:bg-green-500"
                                title={`${c.unreadCount} mensagem(ns) não lida(s)`}
                              >
                                {c.unreadCount > 99 ? "99+" : c.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p
                            className={cn(
                              "mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-xs",
                              c.unreadCount > 0
                                ? "font-medium text-gray-700"
                                : "text-gray-500"
                            )}
                            title={c.lastMessage || undefined}
                          >
                            {c.lastMessage || "Sem mensagens"}
                          </p>
                          {c.labels.length > 0 && (
                            <div className="mt-1 flex min-w-0 flex-wrap gap-1 overflow-hidden">
                              {c.labels.slice(0, 3).map((l) => (
                                <LabelChip
                                  key={l}
                                  title={l}
                                  color={resolveLabelColor(l, accountLabels)}
                                  className="max-w-[9rem]"
                                />
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
            <div
              className={cn(
                "flex h-full min-w-0 flex-1 flex-col bg-gray-50",
                !showThreadPanel && "hidden"
              )}
            >
              {!selectedId ? (
                <div className="flex flex-1 flex-col items-center justify-center text-gray-400">
                  <MessageSquare className="mb-3 h-12 w-12" />
                  <p className="text-sm">Selecione uma conversa para começar</p>
                </div>
              ) : (
                <>
                  {/* Cabeçalho */}
                  <div className="flex items-center gap-3 border-b border-gray-200 bg-white p-3">
                    {isStacked && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={clearSelection}
                        title="Voltar para conversas"
                        className="flex-shrink-0"
                      >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                      </Button>
                    )}
                    <Avatar className="h-9 w-9 flex-shrink-0">
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
                      <Settings className="h-5 w-5 text-gray-500" />
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
                        <DropdownMenuItem
                          onClick={() =>
                            selectedId && markAsUnread(selectedId)
                          }
                        >
                          <Mail className="mr-2 h-4 w-4 text-green-600" />
                          Marcar como não lida
                        </DropdownMenuItem>
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

                  <div className="relative flex min-w-0 flex-1 overflow-hidden">
                    {/* Thread */}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <ScrollArea className="min-h-0 flex-1 p-4">
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
                      <div
                        className={cn(
                          "flex-shrink-0 border-l border-gray-200 bg-white",
                          isStacked
                            ? "absolute inset-y-0 right-0 z-10 w-full max-w-sm shadow-xl"
                            : "w-72"
                        )}
                      >
                        <ScrollArea className="h-full p-4">
                          {isStacked && (
                            <div className="mb-3 flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowContact(false)}
                                title="Fechar detalhes"
                              >
                                <X className="h-5 w-5 text-gray-500" />
                              </Button>
                            </div>
                          )}
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

                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setDeleteOpen(true)}
                            disabled={!selectedConversation.contactId}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Excluir contato
                          </Button>

                          {/* Etiquetas da conversa */}
                          <div className="mt-5">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase text-gray-400">
                                Etiquetas da conversa
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
                                <PopoverContent className="w-64" align="end">
                                  <LabelPicker
                                    labels={accountLabels}
                                    selected={selectedConversation.labels}
                                    onToggle={(t) =>
                                      toggleLabel(selectedConversation, t)
                                    }
                                    onCreate={createLabel}
                                    onDelete={deleteLabel}
                                  />
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
                                  <LabelChip
                                    key={l}
                                    title={l}
                                    color={resolveLabelColor(l, accountLabels)}
                                    className="text-xs"
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Etiquetas do contato */}
                          <div className="mt-5">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase text-gray-400">
                                Etiquetas do contato
                              </p>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    disabled={!selectedConversation.contactId}
                                  >
                                    <Tag className="mr-1 h-3 w-3" /> Gerenciar
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64" align="end">
                                  <LabelPicker
                                    labels={accountLabels}
                                    selected={contactLabels}
                                    onToggle={toggleContactLabel}
                                    onCreate={createLabel}
                                    onDelete={deleteLabel}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            {loadingContactLabels ? (
                              <Skeleton className="h-5 w-24" />
                            ) : contactLabels.length === 0 ? (
                              <p className="text-xs text-gray-400">
                                Sem etiquetas.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {contactLabels.map((l) => (
                                  <LabelChip
                                    key={l}
                                    title={l}
                                    color={resolveLabelColor(l, accountLabels)}
                                    className="text-xs"
                                  />
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

          {/* Excluir contato: apaga também as conversas dele no Chatwoot */}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Excluir contato</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  Excluir <strong>{selectedConversation?.name}</strong>
                  {selectedConversation?.phone
                    ? ` (${selectedConversation.phone})`
                    : ""}
                  ?
                </p>
                <p className="text-xs text-gray-500">
                  O contato sai do Chatwoot junto com todo o histórico de
                  conversas e mensagens dele. Não há como desfazer.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deletingContact}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteContact}
                  disabled={deletingContact}
                >
                  {deletingContact ? "Excluindo..." : "Excluir"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Novo contato: cria o contato e já abre a conversa dele */}
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova conversa</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="n-name">Nome *</Label>
                  <Input
                    id="n-name"
                    autoFocus
                    value={newForm.name}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="n-phone">Telefone *</Label>
                  <Input
                    id="n-phone"
                    inputMode="tel"
                    value={newForm.phone}
                    onChange={(e) =>
                      setNewForm((f) => ({
                        ...f,
                        phone: formatPhoneInput(e.target.value),
                      }))
                    }
                    placeholder="(11) 98765-4321"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateContact();
                      }
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Informe com DDD. Sem o código do país, assumimos +55.
                  </p>
                </div>
                <div>
                  <Label htmlFor="n-email">E-mail</Label>
                  <Input
                    id="n-email"
                    type="email"
                    value={newForm.email}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="n-message">Primeira mensagem *</Label>
                  <Textarea
                    id="n-message"
                    rows={3}
                    value={newForm.message}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, message: e.target.value }))
                    }
                    placeholder="Olá! Aqui é do cartório..."
                  />
                </div>
                {newError && (
                  <p className="text-sm text-red-600">{newError}</p>
                )}
                {newNotice && (
                  <p className="text-sm text-green-700">{newNotice}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setNewOpen(false)}
                  disabled={creatingContact}
                >
                  {newNotice ? "Fechar" : "Cancelar"}
                </Button>
                <Button
                  onClick={handleCreateContact}
                  disabled={creatingContact || Boolean(newNotice)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {creatingContact ? "Enviando..." : "Enviar e abrir conversa"}
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
