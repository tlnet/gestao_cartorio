"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import type { LogSistema } from "@/lib/system-log";

export interface FiltrosLogs {
  categoria: string;
  acao: string;
  usuarioId: string;
  cartorioId: string;
  dataInicio: string;
  dataFim: string;
  busca: string;
  pagina: number;
  porPagina: number;
}

export const FILTROS_LOGS_PADRAO: FiltrosLogs = {
  categoria: "todas",
  acao: "todas",
  usuarioId: "todos",
  cartorioId: "todos",
  dataInicio: "",
  dataFim: "",
  busca: "",
  pagina: 1,
  porPagina: 50,
};

function montarQuery(filtros: FiltrosLogs): string {
  const params = new URLSearchParams();
  params.set("pagina", String(filtros.pagina));
  params.set("porPagina", String(filtros.porPagina));
  if (filtros.categoria !== "todas") params.set("categoria", filtros.categoria);
  if (filtros.acao !== "todas") params.set("acao", filtros.acao);
  if (filtros.usuarioId !== "todos") params.set("usuarioId", filtros.usuarioId);
  if (filtros.cartorioId !== "todos") params.set("cartorioId", filtros.cartorioId);
  if (filtros.dataInicio) params.set("dataInicio", filtros.dataInicio);
  if (filtros.dataFim) params.set("dataFim", filtros.dataFim);
  if (filtros.busca.trim()) params.set("busca", filtros.busca.trim());
  return params.toString();
}

/** Consulta paginada dos logs (somente super admin — a API valida o perfil). */
export function useSystemLogs(filtros: FiltrosLogs) {
  const { session } = useAuth();
  const [logs, setLogs] = useState<LogSistema[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migracaoPendente, setMigracaoPendente] = useState(false);

  const queryString = montarQuery(filtros);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let accessToken = session?.access_token;
      if (!accessToken) {
        const { data } = await supabase.auth.getSession();
        accessToken = data.session?.access_token;
      }
      if (!accessToken) {
        setLogs([]);
        setTotal(0);
        return;
      }

      const res = await fetch(`/api/logs?${queryString}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMigracaoPendente(Boolean(payload?.migracaoPendente));
        throw new Error(payload?.error || "Erro ao carregar logs.");
      }

      setMigracaoPendente(false);
      setLogs(payload.logs || []);
      setTotal(payload.total || 0);
    } catch (err) {
      const mensagem =
        err instanceof Error ? err.message : "Erro ao carregar logs.";
      setError(mensagem);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [queryString, session?.access_token]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, total, loading, error, migracaoPendente, refetch: fetchLogs };
}
