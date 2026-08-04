import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { descreverAlteracoes, registrarLog } from "@/lib/system-log";

export interface StatusPersonalizado {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  /** Quando true, protocolos com este status são tratados como concluídos */
  is_conclusao?: boolean;
  /** Quando true, a contagem do prazo do protocolo começa neste status */
  is_inicio_prazo?: boolean;
  cartorio_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Erros do Supabase são objetos simples (PostgrestError), não instâncias de
 * Error — por isso `err instanceof Error` engolia a causa real e sobrava só a
 * mensagem genérica. Aqui a causa é registrada no console e devolvida ao toast.
 */
const descreverErroStatus = (err: any, fallback: string): string => {
  console.error(fallback, {
    message: err?.message,
    details: err?.details,
    hint: err?.hint,
    code: err?.code,
  });

  // 42703 = coluna inexistente (migração pendente)
  if (err?.code === "42703" && String(err?.message).includes("is_conclusao")) {
    return (
      "A coluna 'is_conclusao' não existe no banco. Execute a migração " +
      "src/lib/add-status-conclusao.sql no SQL Editor do Supabase."
    );
  }

  if (err?.code === "42703" && String(err?.message).includes("is_inicio_prazo")) {
    return (
      "A coluna 'is_inicio_prazo' não existe no banco. Execute a migração " +
      "src/lib/add-status-inicio-prazo.sql no SQL Editor do Supabase."
    );
  }

  if (err?.message) return `${fallback}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return fallback;
};

export const useStatusPersonalizados = () => {
  const [statusPersonalizados, setStatusPersonalizados] = useState<
    StatusPersonalizado[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  const fetchStatusPersonalizados = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        setStatusPersonalizados([]);
        return;
      }

      // Buscar cartório do usuário na tabela users
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("cartorio_id")
        .eq("id", user.id)
        .single();

      if (userError) {
        console.error("Erro ao buscar cartório do usuário:", userError);
        setStatusPersonalizados([]);
        return;
      }

      if (!userData?.cartorio_id) {
        console.warn("Usuário não possui cartório associado");
        setStatusPersonalizados([]);
        return;
      }

      const { data, error } = await supabase
        .from("status_personalizados")
        .select("*")
        .eq("cartorio_id", userData.cartorio_id)
        .order("ordem");

      if (error) throw error;

      setStatusPersonalizados(data || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erro ao carregar status personalizados";
      setError(errorMessage);
      console.error("Erro ao carregar status personalizados:", err);
    } finally {
      setLoading(false);
    }
  };

  const createStatusPersonalizado = async (statusData: {
    nome: string;
    cor: string;
    ordem: number;
    is_conclusao?: boolean;
    is_inicio_prazo?: boolean;
  }) => {
    try {
      if (!user?.id) {
        throw new Error("Usuário não autenticado");
      }

      // Buscar cartório do usuário na tabela users
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("cartorio_id")
        .eq("id", user.id)
        .single();

      if (userError) {
        throw new Error("Erro ao buscar cartório do usuário");
      }

      if (!userData?.cartorio_id) {
        throw new Error("Usuário não possui cartório associado");
      }

      const { data, error } = await supabase
        .from("status_personalizados")
        .insert([
          {
            ...statusData,
            cartorio_id: userData.cartorio_id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      registrarLog({
        acao: "configuracao.status_criado",
        categoria: "configuracao",
        descricao: `Status personalizado "${statusData.nome}" criado`,
        entidade: "status_personalizados",
        entidadeId: (data as any)?.id ?? null,
        cartorioId: (userData as any).cartorio_id,
        metadata: {
          is_conclusao: statusData.is_conclusao ?? false,
          is_inicio_prazo: statusData.is_inicio_prazo ?? false,
        },
      });
      toast.success("Status personalizado criado com sucesso!");
      await fetchStatusPersonalizados();
      return data;
    } catch (err) {
      toast.error(
        descreverErroStatus(err, "Erro ao criar status personalizado")
      );
      throw err;
    }
  };

  const updateStatusPersonalizado = async (
    id: string,
    updates: Partial<StatusPersonalizado>
  ) => {
    try {
      // Preparar dados para update
      const updateData: any = {};

      if (updates.nome !== undefined) updateData.nome = updates.nome;
      if (updates.cor !== undefined) updateData.cor = updates.cor;
      if (updates.ordem !== undefined) updateData.ordem = updates.ordem;
      if (updates.is_conclusao !== undefined)
        updateData.is_conclusao = updates.is_conclusao;
      if (updates.is_inicio_prazo !== undefined)
        updateData.is_inicio_prazo = updates.is_inicio_prazo;

      // Usar método direto após remover triggers problemáticos
      const { data, error } = await supabase
        .from("status_personalizados")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      const anterior = statusPersonalizados.find((s) => s.id === id);
      registrarLog({
        acao: "configuracao.status_atualizado",
        categoria: "configuracao",
        descricao: `Status personalizado "${
          anterior?.nome ?? updates.nome ?? id
        }" atualizado`,
        entidade: "status_personalizados",
        entidadeId: id,
        cartorioId: anterior?.cartorio_id ?? null,
        metadata: {
          alteracoes: descreverAlteracoes(anterior, updateData, {
            nome: "Nome",
            cor: "Cor",
            ordem: "Ordem",
            is_conclusao: "Status de conclusão",
            is_inicio_prazo: "Status de início de prazo",
          }),
        },
      });
      toast.success("Status personalizado atualizado com sucesso!");
      await fetchStatusPersonalizados();
      return data;
    } catch (err) {
      toast.error(
        descreverErroStatus(err, "Erro ao atualizar status personalizado")
      );
      throw err;
    }
  };

  const deleteStatusPersonalizado = async (id: string) => {
    try {
      const { error } = await supabase
        .from("status_personalizados")
        .delete()
        .eq("id", id);

      if (error) throw error;

      const removido = statusPersonalizados.find((s) => s.id === id);
      registrarLog({
        acao: "configuracao.status_excluido",
        categoria: "configuracao",
        descricao: `Status personalizado "${removido?.nome ?? id}" excluído`,
        entidade: "status_personalizados",
        entidadeId: id,
        cartorioId: removido?.cartorio_id ?? null,
      });
      toast.success("Status personalizado excluído com sucesso!");
      await fetchStatusPersonalizados();
    } catch (err) {
      toast.error(
        descreverErroStatus(err, "Erro ao excluir status personalizado")
      );
      throw err;
    }
  };

  useEffect(() => {
    if (authLoading) return;
    const safetyTimer = setTimeout(() => setLoading(false), 8000);
    fetchStatusPersonalizados().finally(() => clearTimeout(safetyTimer));
    return () => clearTimeout(safetyTimer);
  // user?.id — evita re-fetch por mudança de referência em TOKEN_REFRESHED
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  return {
    statusPersonalizados,
    loading,
    error,
    fetchStatusPersonalizados,
    createStatusPersonalizado,
    updateStatusPersonalizado,
    deleteStatusPersonalizado,
  };
};
