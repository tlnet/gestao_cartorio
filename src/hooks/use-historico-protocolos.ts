import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

export interface HistoricoProtocolo {
  id: string;
  protocolo_id: string;
  status_anterior: string;
  novo_status: string;
  usuario_responsavel: string;
  observacao?: string;
  created_at: string;
}

export const useHistoricoProtocolos = (protocoloId?: string) => {
  const [historico, setHistorico] = useState<HistoricoProtocolo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchHistorico = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!protocoloId) {
        setHistorico([]);
        return;
      }

      const { data, error } = await supabase
        .from("historico_protocolos")
        .select("*")
        .eq("protocolo_id", protocoloId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setHistorico(data || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao carregar histórico";
      setError(errorMessage);
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setLoading(false);
    }
  };

  const createHistorico = async (historicoData: {
    protocolo_id: string;
    status_anterior: string;
    novo_status: string;
    usuario_responsavel: string;
    observacao?: string;
  }) => {
    try {
      // Usar o nome do usuário autenticado se disponível
      const usuarioResponsavel =
        (user?.user_metadata?.name || user?.email?.split("@")[0] || historicoData.usuario_responsavel || "Usuário") as string;

      console.log("Criando histórico com dados:", {
        ...historicoData,
        usuario_responsavel: usuarioResponsavel,
      });

      // Verificar se a tabela existe primeiro
      const { data: tableCheck, error: tableError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_name", "historico_protocolos")
        .eq("table_schema", "public");

      if (tableError) {
        console.warn("Erro ao verificar tabela:", tableError);
      }

      console.log("Tabela existe?", tableCheck && tableCheck.length > 0);

      console.log("Tentando inserir no Supabase...");
      const { data, error } = await supabase
        .from("historico_protocolos")
        .insert([
          {
            ...historicoData,
            usuario_responsavel: usuarioResponsavel,
          },
        ])
        .select()
        .single();

      console.log("Resposta do Supabase:", { data, error });

      if (error) {
        console.error("Erro detalhado do Supabase ao criar histórico:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          error: error,
        });

        // Se a tabela não existe, criar um registro local temporário
        if (
          error.code === "PGRST116" ||
          error.message?.includes(
            'relation "historico_protocolos" does not exist'
          )
        ) {
          console.warn(
            "Tabela historico_protocolos não existe. Criando registro local temporário."
          );
          const tempRecord = {
            id: `temp-${Date.now()}`,
            ...historicoData,
            usuario_responsavel: usuarioResponsavel,
            created_at: new Date().toISOString(),
          };
          setHistorico((prev) => [...prev, tempRecord]);
          return tempRecord;
        }

        // Se for erro de tipo de dados, mostrar mensagem específica
        if (
          error.message?.includes("invalid input syntax for type uuid") ||
          error.message?.includes("usuario_responsavel")
        ) {
          console.error(
            "Erro de tipo de dados: usuario_responsavel deve ser TEXT, não UUID"
          );
          console.error("Execute o script: fix-historico-table-schema.sql");
        }

        throw error;
      }

      console.log("Histórico criado com sucesso:", data);
      setHistorico((prev) => [...prev, data]);
      return data;
    } catch (err) {
      console.error("Erro ao criar histórico:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao criar histórico";
      // Não mostrar toast aqui, deixar o componente decidir
      throw err;
    }
  };

  const updateHistorico = async (
    id: string,
    updates: Partial<HistoricoProtocolo>
  ) => {
    try {
      const { data, error } = await supabase
        .from("historico_protocolos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setHistorico((prev) =>
        prev.map((item) => (item.id === id ? data : item))
      );
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao atualizar histórico";
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteHistorico = async (id: string) => {
    try {
      const { error } = await supabase
        .from("historico_protocolos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setHistorico((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao excluir histórico";
      toast.error(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    fetchHistorico();
  }, [protocoloId, user]);

  return {
    historico,
    loading,
    error,
    fetchHistorico,
    createHistorico,
    updateHistorico,
    deleteHistorico,
  };
};
