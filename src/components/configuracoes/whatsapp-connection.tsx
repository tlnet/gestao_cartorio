"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  Loader2,
  RefreshCw,
  Link2,
  QrCode,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useWhatsappConnection } from "@/hooks/use-whatsapp-connection";

function normalizeQr(qr: string | null): string | null {
  if (!qr) return null;
  return qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;
}

export function WhatsappConnection() {
  const {
    status,
    qrcode,
    numero,
    name,
    chatwootLinked,
    busy,
    error,
    connect,
    disconnect,
    rename,
    relinkChatwoot,
    refresh,
  } = useWhatsappConnection();

  const [nameInput, setNameInput] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Mantém o input de renomear sincronizado com o nome atual.
  useEffect(() => {
    if (name) setRenameValue(name);
  }, [name]);

  const qrSrc = normalizeQr(qrcode);

  const handleRename = async () => {
    await rename(renameValue);
    setEditingName(false);
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-green-600" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              WhatsApp (Uazapi)
            </h3>
            <p className="text-xs text-gray-500">
              Conecte seu WhatsApp por QR Code para enviar e receber pelo Chat.
            </p>
          </div>
        </div>

        {status === "connected" ? (
          <Badge className="bg-green-500 text-white">Conectado</Badge>
        ) : status === "connecting" ? (
          <Badge className="bg-amber-500 text-white">Aguardando leitura</Badge>
        ) : status === "loading" ? (
          <Badge variant="secondary">Carregando…</Badge>
        ) : (
          <Badge variant="secondary">Desconectado</Badge>
        )}
      </div>

      {/* Nome do canal/instância (quando já existe) */}
      {name && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Canal:</span>
          {editingName ? (
            <>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="h-8 max-w-[220px]"
                placeholder="Nome do canal"
              />
              <Button
                size="icon"
                className="h-8 w-8 bg-green-600 hover:bg-green-700"
                onClick={handleRename}
                disabled={busy || !renameValue.trim()}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => {
                  setEditingName(false);
                  setRenameValue(name);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <span className="font-medium text-gray-800">{name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-gray-500"
                onClick={() => setEditingName(true)}
                title="Renomear canal"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Conectado */}
      {status === "connected" && (
        <div className="space-y-3">
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
            WhatsApp conectado{numero ? ` — número ${numero}` : ""}.
            {chatwootLinked
              ? " Integração com o Chat ativa."
              : " Atenção: ainda não vinculado ao Chat."}
          </div>
          <div className="flex flex-wrap gap-2">
            {!chatwootLinked && (
              <Button
                size="sm"
                onClick={relinkChatwoot}
                disabled={busy}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Link2 className="mr-2 h-4 w-4" />
                Vincular ao Chat
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={relinkChatwoot}
              disabled={busy}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-sincronizar Chat
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={disconnect}
              disabled={busy}
            >
              Desconectar
            </Button>
          </div>
        </div>
      )}

      {/* Conectando: QR */}
      {status === "connecting" && (
        <div className="flex flex-col items-center gap-3">
          {qrSrc ? (
            <Image
              src={qrSrc}
              alt="QR Code do WhatsApp"
              width={240}
              height={240}
              unoptimized
              className="rounded-lg border border-gray-200"
            />
          ) : (
            <div className="flex h-[240px] w-[240px] items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          <p className="text-center text-xs text-gray-500">
            Abra o WhatsApp no celular → <b>Aparelhos conectados</b> →{" "}
            <b>Conectar aparelho</b> e escaneie o código. Ele atualiza
            automaticamente.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={refresh} disabled={busy}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={disconnect}
              disabled={busy}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Desconectado */}
      {(status === "disconnected" || status === "loading") && (
        <div className="space-y-3">
          {!name && (
            <div className="max-w-sm">
              <Label htmlFor="wa-name">Nome do canal/instância (opcional)</Label>
              <Input
                id="wa-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Ex: WhatsApp Atendimento"
                disabled={busy || status === "loading"}
              />
              <p className="mt-1 text-xs text-gray-500">
                Esse nome identifica a instância na Uazapi e o canal no Chat. Se
                deixar vazio, geramos um nome automático.
              </p>
            </div>
          )}
          <Button
            onClick={() => connect(nameInput)}
            disabled={busy || status === "loading"}
            className="bg-green-600 hover:bg-green-700"
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <QrCode className="mr-2 h-4 w-4" />
            )}
            Conectar WhatsApp
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
