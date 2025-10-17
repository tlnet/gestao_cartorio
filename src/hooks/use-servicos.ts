import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

export interface Servico {
  id: string;
  nome: string;
  descricao?: string;
  preco?: number;
  prazo_execucao?: number;
  dias_notificacao_antes_vencimento?: number;
  ativo: boolean;
  cartorio_id: string;
  created_at: string;
  updated_at: string;
}

export const useServicos = () => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchServicos = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        setServicos([]);
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
        setServicos([]);
        return;
      }

      if (!userData?.cartorio_id) {
        console.warn("Usuário não possui cartório associado");
        setServicos([]);
        return;
      }

      const { data, error } = await supabase
        .from("servicos")
        .select("*")
        .eq("cartorio_id", userData.cartorio_id)
        .order("nome");

      if (error) throw error;

      setServicos(data || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao carregar serviços";
      setError(errorMessage);
      console.error("Erro ao carregar serviços:", err);
    } finally {
      setLoading(false);
    }
  };

  const createServico = async (servicoData: {
    nome: string;
    descricao?: string;
    preco?: number;
    prazo_execucao?: number;
    dias_notificacao_antes_vencimento?: number;
    ativo?: boolean;
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
        .from("servicos")
        .insert([
          {
            ...servicoData,
            cartorio_id: userData.cartorio_id,
            ativo: servicoData.ativo ?? true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success("Serviço criado com sucesso!");
      await fetchServicos();
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao criar serviço";
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateServico = async (id: string, updates: Partial<Servico>) => {
    try {
      const { data, error } = await supabase
        .from("servicos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Serviço atualizado com sucesso!");
      await fetchServicos();
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao atualizar serviço";
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteServico = async (id: string) => {
    try {
      const { error } = await supabase.from("servicos").delete().eq("id", id);

      if (error) throw error;

      toast.success("Serviço excluído com sucesso!");
      await fetchServicos();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao excluir serviço";
      toast.error(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    fetchServicos();
  }, [user]);

  return {
    servicos,
    loading,
    error,
    fetchServicos,
    createServico,
    updateServico,
    deleteServico,
  };
};
