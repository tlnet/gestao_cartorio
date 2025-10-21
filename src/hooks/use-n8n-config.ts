import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface N8NConfig {
  id: string;
  cartorio_id: string;
  webhook_url: string; // Webhook genérico (fallback)
  webhook_resumo_matricula?: string;
  webhook_analise_malote?: string;
  webhook_minuta_documento?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const useN8NConfig = () => {
  const [config, setConfig] = useState<N8NConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableExists, setTableExists] = useState<boolean | null>(null);

  const fetchConfig = async (cartorioId?: string) => {
    try {
      console.log(
        "useN8NConfig: Iniciando fetchConfig com cartorioId:",
        cartorioId
      );
      setLoading(true);
      setError(null);

      // Se já sabemos que a tabela não existe, não fazer nenhuma consulta
      if (tableExists === false) {
        console.log("useN8NConfig: Tabela não existe, retornando null");
        setConfig(null);
        return;
      }

      // Se não tiver cartorioId, pegar do usuário logado
      if (!cartorioId) {
        console.log("useN8NConfig: Buscando cartorioId do usuário logado");
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        // Buscar cartório do usuário
        const { data: userData } = await supabase
          .from("users")
          .select("cartorio_id")
          .eq("id", user.id)
          .single();

        console.log("useN8NConfig: Dados do usuário:", userData);
        cartorioId = userData?.cartorio_id;
      }

      if (!cartorioId) {
        console.log("useN8NConfig: Nenhum cartorioId encontrado");
        setConfig(null);
        return;
      }

      // Verificar se a tabela existe apenas uma vez
      if (tableExists === null) {
        const { error: tableCheckError } = await supabase
          .from("n8n_config")
          .select("id")
          .limit(1);

        if (
          tableCheckError &&
          (tableCheckError.code === "42P01" ||
            tableCheckError.message.includes("does not exist"))
        ) {
          setTableExists(false);
          setConfig(null);
          return;
        }
        setTableExists(true);
      }

      console.log(
        "useN8NConfig: Buscando configuração para cartorioId:",
        cartorioId
      );
      const { data, error } = await supabase
        .from("n8n_config")
        .select("*")
        .eq("cartorio_id", cartorioId)
        .eq("ativo", true)
        .single();

      console.log("useN8NConfig: Resultado da busca:", { data, error });

      if (error) {
        // Se for erro de nenhuma linha retornada, também retorna null
        if (error.code === "PGRST116") {
          console.log(
            "useN8NConfig: Nenhuma configuração encontrada (PGRST116)"
          );
          setConfig(null);
          return;
        }
        console.error("useN8NConfig: Erro na busca:", error);
        throw error;
      }

      console.log("useN8NConfig: Configuração encontrada:", data);
      setConfig(data || null);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erro ao carregar configuração N8N";
      setError(errorMessage);
      console.error("Erro ao buscar configuração N8N:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (webhookUrl: string, cartorioId?: string) => {
    try {
      // Se a tabela não existe, mostrar erro informativo
      if (tableExists === false) {
        toast.error(
          "Tabela n8n_config não existe. Execute o script SQL primeiro para criar a tabela."
        );
        throw new Error("Tabela n8n_config não encontrada");
      }

      // Se não tiver cartorioId, pegar do usuário logado
      if (!cartorioId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const { data: userData } = await supabase
          .from("users")
          .select("cartorio_id")
          .eq("id", user.id)
          .single();

        cartorioId = userData?.cartorio_id;
      }

      if (!cartorioId) {
        throw new Error("Cartório não encontrado");
      }

      // Verificar se a tabela existe se ainda não foi verificado
      if (tableExists === null) {
        const { error: tableCheckError } = await supabase
          .from("n8n_config")
          .select("id")
          .limit(1);

        if (
          tableCheckError &&
          (tableCheckError.code === "42P01" ||
            tableCheckError.message.includes("does not exist"))
        ) {
          setTableExists(false);
          toast.error(
            "Tabela n8n_config não existe. Execute o script SQL primeiro para criar a tabela."
          );
          throw new Error("Tabela n8n_config não encontrada");
        }
        setTableExists(true);
      }

      // Verificar se já existe configuração
      const { data: existingConfig } = await supabase
        .from("n8n_config")
        .select("id")
        .eq("cartorio_id", cartorioId)
        .single();

      let result;
      if (existingConfig) {
        // Atualizar configuração existente
        result = await supabase
          .from("n8n_config")
          .update({
            webhook_url: webhookUrl,
            ativo: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingConfig.id)
          .select()
          .single();
      } else {
        // Criar nova configuração
        result = await supabase
          .from("n8n_config")
          .insert([
            {
              cartorio_id: cartorioId,
              webhook_url: webhookUrl,
              ativo: true,
            },
          ])
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setConfig(result.data);
      toast.success("Configuração N8N salva com sucesso!");
      return result.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao salvar configuração N8N";
      toast.error(errorMessage);
      throw err;
    }
  };

  const testWebhook = async (webhookUrl?: string) => {
    try {
      const url = webhookUrl || config?.webhook_url;
      if (!url) {
        throw new Error("URL do webhook não configurada");
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast.success("Webhook N8N funcionando corretamente!");
        return true;
      } else {
        throw new Error(`Erro na resposta: ${response.status}`);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao testar webhook";
      toast.error(`Falha no teste: ${errorMessage}`);
      return false;
    }
  };

  const disableConfig = async () => {
    try {
      if (!config) return;

      // Se a tabela não existe, apenas limpar o estado local
      if (tableExists === false) {
        setConfig(null);
        return;
      }

      const { error } = await supabase
        .from("n8n_config")
        .update({ ativo: false })
        .eq("id", config.id);

      if (error) {
        // Se a tabela não existir, apenas limpar o estado local
        if (
          error.code === "42P01" ||
          error.message.includes("does not exist")
        ) {
          setTableExists(false);
          setConfig(null);
          return;
        }
        throw error;
      }

      setConfig(null);
      toast.success("Configuração N8N desabilitada");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao desabilitar configuração";
      toast.error(errorMessage);
      throw err;
    }
  };

  // Função para obter webhook específico por tipo de análise
  const getWebhookUrl = (
    tipo: "resumo_matricula" | "analise_malote" | "minuta_documento"
  ): string | null => {
    if (!config) return null;

    switch (tipo) {
      case "resumo_matricula":
        return config.webhook_resumo_matricula || config.webhook_url || null;
      case "analise_malote":
        return config.webhook_analise_malote || config.webhook_url || null;
      case "minuta_documento":
        return config.webhook_minuta_documento || config.webhook_url || null;
      default:
        return config.webhook_url || null;
    }
  };

  // Função para verificar se webhook específico está configurado
  const isWebhookConfigured = (
    tipo: "resumo_matricula" | "analise_malote" | "minuta_documento"
  ): boolean => {
    const webhookUrl = getWebhookUrl(tipo);
    return webhookUrl !== null && webhookUrl.trim() !== "";
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return {
    config,
    loading,
    error,
    fetchConfig,
    saveConfig,
    testWebhook,
    disableConfig,
    getWebhookUrl,
    isWebhookConfigured,
  };
};
