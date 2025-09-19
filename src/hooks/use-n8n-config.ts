import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface N8NConfig {
  id: string;
  cartorio_id: string;
  webhook_url: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const useN8NConfig = () => {
  const [config, setConfig] = useState<N8NConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async (cartorioId?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Se não tiver cartorioId, pegar do usuário logado
      if (!cartorioId) {
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

        cartorioId = userData?.cartorio_id;
      }

      if (!cartorioId) {
        setConfig(null);
        return;
      }

      const { data, error } = await supabase
        .from("n8n_config")
        .select("*")
        .eq("cartorio_id", cartorioId)
        .eq("ativo", true)
        .single();

      if (error) {
        // Se for erro de tabela não encontrada, apenas retorna null
        if (
          error.code === "42P01" ||
          error.message.includes("does not exist")
        ) {
          console.warn(
            "Tabela n8n_config não encontrada. Execute o script SQL primeiro."
          );
          setConfig(null);
          return;
        }
        // Se for erro de nenhuma linha retornada, também retorna null
        if (error.code === "PGRST116") {
          setConfig(null);
          return;
        }
        throw error;
      }

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

      const { error } = await supabase
        .from("n8n_config")
        .update({ ativo: false })
        .eq("id", config.id);

      if (error) throw error;

      setConfig(null);
      toast.success("Configuração N8N desabilitada");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao desabilitar configuração";
      toast.error(errorMessage);
      throw err;
    }
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
  };
};
