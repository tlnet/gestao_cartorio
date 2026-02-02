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

      // Tentar buscar com hash_consulta primeiro
      let { data, error: fetchError } = await supabase
        .from("consultas_cnib")
        .select("id, documento, tipo_documento, nome_razao_social, hash_consulta, indisponivel, quantidade_ordens, dados_consulta, status, mensagem_erro, usuario_id, cartorio_id, created_at")
        .order("created_at", { ascending: false });

      // Se der erro de coluna não existir (42703 = undefined_column), tentar sem hash_consulta
      if (fetchError && (fetchError.code === "42703" || fetchError.message?.includes("hash_consulta") || fetchError.message?.includes("does not exist"))) {
        console.warn("Coluna hash_consulta não encontrada. Buscando sem essa coluna...");
        
        const { data: dataFallback, error: fetchErrorFallback } = await supabase
          .from("consultas_cnib")
          .select("id, documento, tipo_documento, nome_razao_social, indisponivel, quantidade_ordens, dados_consulta, status, mensagem_erro, usuario_id, cartorio_id, created_at")
          .order("created_at", { ascending: false });
        
        data = dataFallback;
        fetchError = fetchErrorFallback;
      }

      if (fetchError) {
        // Logar erro de forma segura, evitando problemas de serialização
        console.error("Erro do Supabase:");
        console.error("  Código:", fetchError.code || "N/A");
        console.error("  Mensagem:", fetchError.message || "N/A");
        if (fetchError.details) {
          console.error("  Detalhes:", fetchError.details);
        }
        if (fetchError.hint) {
          console.error("  Dica:", fetchError.hint);
        }

        // Se for erro de tabela não encontrada, apenas retorna array vazio
        if (
          fetchError.code === "42P01" ||
          fetchError.message?.includes("does not exist")
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
          fetchError.message?.includes("permission denied")
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
          data.map(async (consulta: any) => {
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
                // Garantir que hash_consulta seja undefined se não existir
                hash_consulta: consulta.hash_consulta || undefined,
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
                // Garantir que hash_consulta seja undefined se não existir
                hash_consulta: consulta.hash_consulta || undefined,
                usuario: null,
                cartorio: null,
              };
            }
          })
        );

        setConsultas(consultasComUsuarios);
      } else {
        // Garantir que hash_consulta seja undefined se não existir
        const consultasFormatadas = (data || []).map((consulta: any) => ({
          ...consulta,
          hash_consulta: consulta.hash_consulta || undefined,
        }));
        setConsultas(consultasFormatadas);
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
