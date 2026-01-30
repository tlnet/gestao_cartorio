import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface ConsultaCNIB {
  id: string;
  documento: string;
  tipo_documento: "CPF" | "CNPJ";
  nome_razao_social?: string;
  hash_consulta?: string;
  indisponivel: boolean;
  quantidade_ordens: number;
  dados_consulta?: any;
  status: "sucesso" | "erro";
  mensagem_erro?: string;
  usuario_id: string;
  cartorio_id: string;
  created_at: string;
  // Campos relacionados
  usuario?: {
    id: string;
    name: string;
    email: string;
  };
  cartorio?: {
    id: string;
    nome: string;
  };
}

export const useConsultasCNIB = () => {
  const [consultas, setConsultas] = useState<ConsultaCNIB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConsultas = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Iniciando busca de consultas CNIB...");

      const { data, error: fetchError } = await supabase
        .from("consultas_cnib")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Erro do Supabase:", {
          code: fetchError.code,
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
        });

        // Se for erro de tabela não encontrada, apenas retorna array vazio
        if (
          fetchError.code === "42P01" ||
          fetchError.message.includes("does not exist")
        ) {
          console.warn(
            "Tabela consultas_cnib não encontrada. Execute o script SQL primeiro."
          );
          setConsultas([]);
          return;
        }

        // Se for erro de RLS, também retorna array vazio
        if (
          fetchError.code === "42501" ||
          fetchError.message.includes("permission denied")
        ) {
          console.warn("Erro de permissão RLS. Verifique as políticas.");
          setConsultas([]);
          return;
        }

        throw fetchError;
      }

      console.log("Consultas CNIB carregadas com sucesso:", data);

      // Se há dados, carregar informações dos usuários separadamente
      if (data && data.length > 0) {
        const consultasComUsuarios = await Promise.all(
          data.map(async (consulta) => {
            try {
              // Buscar dados do usuário
              const { data: usuarioData } = await supabase
                .from("users")
                .select("id, name, email")
                .eq("id", consulta.usuario_id)
                .single();

              // Buscar dados do cartório
              const { data: cartorioData } = await supabase
                .from("cartorios")
                .select("id, nome")
                .eq("id", consulta.cartorio_id)
                .single();

              return {
                ...consulta,
                usuario: usuarioData,
                cartorio: cartorioData,
              };
            } catch (err) {
              console.warn(
                `Erro ao carregar dados do usuário ${consulta.usuario_id}:`,
                err
              );
              return {
                ...consulta,
                usuario: null,
                cartorio: null,
              };
            }
          })
        );

        setConsultas(consultasComUsuarios);
      } else {
        setConsultas(data || []);
      }
    } catch (err) {
      console.error("Erro detalhado ao carregar consultas CNIB:", {
        error: err,
        message: err instanceof Error ? err.message : "Erro desconhecido",
        stack: err instanceof Error ? err.stack : undefined,
        type: typeof err,
      });

      const errorMessage =
        err instanceof Error ? err.message : "Erro ao carregar consultas CNIB";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createConsulta = async (consultaData: {
    documento: string;
    tipo_documento: "CPF" | "CNPJ";
    nome_razao_social?: string;
    indisponivel?: boolean;
    quantidade_ordens?: number;
    dados_consulta?: any;
    status?: "sucesso" | "erro";
    mensagem_erro?: string;
    usuario_id: string;
    cartorio_id: string;
  }) => {
    try {
      console.log("Criando consulta CNIB:", consultaData);

      const { data, error: insertError } = await supabase
        .from("consultas_cnib")
        .insert([consultaData])
        .select()
        .single();

      if (insertError) {
        console.error("Erro ao criar consulta CNIB:", insertError);
        throw insertError;
      }

      console.log("Consulta CNIB criada com sucesso:", data);

      // Recarregar consultas após criar
      await fetchConsultas();

      return data;
    } catch (err) {
      console.error("Erro ao criar consulta CNIB:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao criar consulta CNIB";
      throw new Error(errorMessage);
    }
  };

  // Carregar consultas ao montar o componente
  useEffect(() => {
    fetchConsultas();
  }, []);

  return {
    consultas,
    loading,
    error,
    fetchConsultas,
    createConsulta,
  };
};
