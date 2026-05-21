"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPhone } from "@/lib/formatters";
import {
  buildNotificarClientePayload,
  dispararNotificarClienteWebhook,
  type ProtocoloNotificarClienteInput,
} from "@/lib/protocolo-notificar-cliente";
import { toast } from "sonner";
import { Loader2, MessageCircle } from "lucide-react";

interface NotificarClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolo: ProtocoloNotificarClienteInput | null;
}

export function NotificarClienteDialog({
  open,
  onOpenChange,
  protocolo,
}: NotificarClienteDialogProps) {
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (open && protocolo) {
      setTelefone(protocolo.telefone ? formatPhone(protocolo.telefone) : "");
      setMensagem("");
    }
  }, [open, protocolo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!protocolo) return;

    const telefoneLimpo = telefone.replace(/\D/g, "");
    if (telefoneLimpo.length < 10) {
      toast.error("Informe um número de telefone válido.");
      return;
    }
    if (!mensagem.trim()) {
      toast.error("Informe a mensagem a ser enviada.");
      return;
    }

    setEnviando(true);
    try {
      const payload = await buildNotificarClientePayload(
        protocolo,
        telefone,
        mensagem
      );
      const result = await dispararNotificarClienteWebhook(payload);
      if (!result.ok) {
        toast.error(result.error || "Erro ao enviar notificação.");
        return;
      }
      toast.success("Notificação enviada com sucesso.");
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao enviar notificação.";
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Notificar cliente
          </DialogTitle>
          <DialogDescription>
            {protocolo?.protocolo
              ? `Protocolo ${protocolo.protocolo}`
              : "Envie uma mensagem ao cliente vinculada a este protocolo."}
            {protocolo?.solicitante
              ? ` — ${protocolo.solicitante}`
              : null}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notificar-telefone">Telefone do cliente</Label>
            <Input
              id="notificar-telefone"
              type="tel"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(formatPhone(e.target.value))}
              disabled={enviando}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notificar-mensagem">Mensagem</Label>
            <Textarea
              id="notificar-mensagem"
              placeholder="Digite a mensagem que será enviada ao cliente..."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              disabled={enviando}
              rows={5}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
