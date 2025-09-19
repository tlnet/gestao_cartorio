import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

export interface StatusPersonalizado {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  cartorio_id: string;
  created_at: string;
  updated_at: string;
}

export const useStatusPersonalizados = () => {
  const [statusPersonalizados, setStatusPersonalizados] = useState<
    StatusPersonalizado[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

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

      toast.success("Status personalizado criado com sucesso!");
      await fetchStatusPersonalizados();
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erro ao criar status personalizado";
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateStatusPersonalizado = async (
    id: string,
    updates: Partial<StatusPersonalizado>
  ) => {
    try {
      const { data, error } = await supabase
        .from("status_personalizados")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Status personalizado atualizado com sucesso!");
      await fetchStatusPersonalizados();
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erro ao atualizar status personalizado";
      toast.error(errorMessage);
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

      toast.success("Status personalizado excluído com sucesso!");
      await fetchStatusPersonalizados();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erro ao excluir status personalizado";
      toast.error(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    fetchStatusPersonalizados();
  }, [user]);

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
