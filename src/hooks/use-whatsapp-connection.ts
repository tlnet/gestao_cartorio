"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";

export type WhatsappStatus =
  | "loading"
  | "disconnected"
  | "connecting"
  | "connected";

interface StatusResponse {
  configured: boolean;
  connected: boolean;
  status: string;
  qrcode: string | null;
  paircode?: string | null;
  numero: string | null;
  chatwootLinked: boolean;
  name: string | null;
}

export function useWhatsappConnection() {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [status, setStatus] = useState<WhatsappStatus>("loading");
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [numero, setNumero] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [chatwootLinked, setChatwootLinked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const authHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    }),
    [accessToken]
  );

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch("/api/uazapi/status", { headers: authHeaders() });
      const data: StatusResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao consultar status.");

      setNumero(data.numero);
      setName(data.name);
      setChatwootLinked(data.chatwootLinked);

      if (data.connected) {
        setStatus("connected");
        setQrcode(null);
        stopPolling();
      } else if (data.qrcode) {
        setStatus("connecting");
        setQrcode(data.qrcode);
      } else {
        setStatus("disconnected");
        setQrcode(null);
      }
    } catch (e: any) {
      setError(e?.message || "Erro ao consultar status.");
    }
  }, [accessToken, authHeaders, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(fetchStatus, 3000);
  }, [fetchStatus, stopPolling]);

  const connect = useCallback(
    async (instanceName?: string) => {
    if (!accessToken) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/uazapi/connect", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name: instanceName?.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao conectar.");

      if (data.connected) {
        setStatus("connected");
        setQrcode(null);
        await fetchStatus();
      } else {
        setStatus("connecting");
        setQrcode(data.qrcode || null);
        startPolling();
      }
    } catch (e: any) {
      setError(e?.message || "Erro ao conectar WhatsApp.");
    } finally {
      setBusy(false);
    }
    },
    [accessToken, authHeaders, fetchStatus, startPolling]
  );

  const disconnect = useCallback(async () => {
    if (!accessToken) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/uazapi/disconnect", {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao desconectar.");
      stopPolling();
      setStatus("disconnected");
      setQrcode(null);
      setNumero(null);
    } catch (e: any) {
      setError(e?.message || "Erro ao desconectar.");
    } finally {
      setBusy(false);
    }
  }, [accessToken, authHeaders, stopPolling]);

  const rename = useCallback(
    async (newName: string) => {
      if (!accessToken || !newName.trim()) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/uazapi/rename", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ name: newName.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erro ao renomear.");
        setName(data.name);
      } catch (e: any) {
        setError(e?.message || "Erro ao renomear instância.");
      } finally {
        setBusy(false);
      }
    },
    [accessToken, authHeaders]
  );

  const relinkChatwoot = useCallback(async () => {
    if (!accessToken) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/uazapi/chatwoot", {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao vincular Chatwoot.");
      setChatwootLinked(Boolean(data.ok));
    } catch (e: any) {
      setError(e?.message || "Erro ao vincular Chatwoot.");
    } finally {
      setBusy(false);
    }
  }, [accessToken, authHeaders]);

  // Status inicial + limpeza.
  useEffect(() => {
    if (accessToken) fetchStatus();
    return () => stopPolling();
  }, [accessToken, fetchStatus, stopPolling]);

  return {
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
    refresh: fetchStatus,
  };
}
