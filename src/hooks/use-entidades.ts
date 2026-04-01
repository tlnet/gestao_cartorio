"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface Entidade {
  id: string;
  cartorio_id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const useEntidades = (cartorioId?: string) => {
  const [entidades, setEntidades] = useState<Entidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntidades = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!cartorioId) {
        setEntidades([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("entidades")
        .select("*")
        .eq("cartorio_id", cartorioId)
        .order("nome", { ascending: true });

      if (error) throw error;

      setEntidades(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar entidades";
      setError(message);
      console.error("Erro ao carregar entidades:", err);
    } finally {
      setLoading(false);
    }
  }, [cartorioId]);

  const criarEntidade = async (nome: string) => {
    if (!cartorioId) throw new Error("Cartório não identificado");
    if (!nome.trim()) throw new Error("Nome da entidade é obrigatório");

    try {
      const { data, error } = await supabase
        .from("entidades")
        .insert([{ cartorio_id: cartorioId, nome: nome.trim(), ativo: true }])
        .select()
        .single();

      if (error) throw error;

      setEntidades((prev) =>
        [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome))
      );
      toast.success("Entidade criada com sucesso!");
      return data as Entidade;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar entidade";
      toast.error(message);
      throw err;
    }
  };

  const atualizarEntidade = async (
    id: string,
    updates: Partial<Pick<Entidade, "nome" | "ativo">>
  ) => {
    try {
      const { data, error } = await supabase
        .from("entidades")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setEntidades((prev) =>
        prev
          .map((e) => (e.id === id ? (data as Entidade) : e))
          .sort((a, b) => a.nome.localeCompare(b.nome))
      );
      toast.success("Entidade atualizada com sucesso!");
      return data as Entidade;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao atualizar entidade";
      toast.error(message);
      throw err;
    }
  };

  // Soft delete
  const deletarEntidade = async (id: string) => {
    try {
      const { error } = await supabase
        .from("entidades")
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      setEntidades((prev) => prev.filter((e) => e.id !== id));
      toast.success("Entidade removida com sucesso!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao remover entidade";
      toast.error(message);
      throw err;
    }
  };

  useEffect(() => {
    if (cartorioId) {
      const safetyTimer = setTimeout(() => setLoading(false), 8000);
      fetchEntidades().finally(() => clearTimeout(safetyTimer));
      return () => clearTimeout(safetyTimer);
    } else {
      setEntidades([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartorioId]);

  return {
    entidades,
    entidadesAtivas: entidades.filter((e) => e.ativo),
    loading,
    error,
    fetchEntidades,
    criarEntidade,
    atualizarEntidade,
    deletarEntidade,
  };
};
