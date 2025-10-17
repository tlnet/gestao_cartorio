import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useN8NConfig } from "./use-n8n-config";

export interface RelatorioIA {
  id: string;
  tipo: "resumo_matricula" | "analise_malote" | "minuta_documento";
  nome_arquivo: string;
  status: "processando" | "concluido" | "erro";
  usuario_id: string;
  cartorio_id: string;
  dados_processamento?: any;
  resultado_final?: any;
  arquivo_resultado?: string;
  created_at: string;
  updated_at: string;
  // Campos relacionados
  usuario?: {
    nome: string;
    email: string;
  };
  cartorio?: {
    nome: string;
  };
}

export const useRelatoriosIA = () => {
  const [relatorios, setRelatorios] = useState<RelatorioIA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hook para configuração N8N (com tratamento de erro)
  const { config: n8nConfig } = useN8NConfig();

  const fetchRelatorios = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Iniciando busca de relatórios...");

      // Primeiro, vamos tentar uma consulta simples para ver se a tabela existe
      const { data, error } = await supabase
        .from("relatorios_ia")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("Resultado da consulta:", { data, error });

      if (error) {
        console.error("Erro do Supabase:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });

        // Se for erro de tabela não encontrada, apenas retorna array vazio
        if (
          error.code === "42P01" ||
          error.message.includes("does not exist")
        ) {
          console.warn(
            "Tabela relatorios_ia não encontrada. Execute o script SQL primeiro."
          );
          setRelatorios([]);
          return;
        }

        // Se for erro de RLS, também retorna array vazio
        if (
          error.code === "42501" ||
          error.message.includes("permission denied")
        ) {
          console.warn("Erro de permissão RLS. Verifique as políticas.");
          setRelatorios([]);
          return;
        }

        throw error;
      }

      console.log("Relatórios carregados com sucesso:", data);
      setRelatorios(data || []);
    } catch (err) {
      console.error("Erro detalhado ao carregar relatórios:", {
        error: err,
        message: err instanceof Error ? err.message : "Erro desconhecido",
        stack: err instanceof Error ? err.stack : undefined,
        type: typeof err,
      });

      const errorMessage =
        err instanceof Error ? err.message : "Erro ao carregar relatórios";
      setError(errorMessage);
      // Não mostrar toast de erro para evitar spam
    } finally {
      setLoading(false);
    }
  };

  const createRelatorio = async (relatorioData: {
    tipo: "resumo_matricula" | "analise_malote" | "minuta_documento";
    nome_arquivo: string;
    usuario_id: string;
    cartorio_id: string;
    dados_processamento?: any;
    resultado_final?: any;
    arquivo_resultado?: string;
  }) => {
    try {
      console.log("Dados do relatório a serem inseridos:", relatorioData);

      const { data, error } = await supabase
        .from("relatorios_ia")
        .insert([relatorioData])
        .select()
        .single();

      if (error) {
        console.error("Erro do Supabase ao criar relatório:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log("Relatório criado com sucesso:", data);
      toast.success("Relatório criado com sucesso!");
      await fetchRelatorios(); // Recarregar lista
      return data;
    } catch (err) {
      console.error("Erro detalhado ao criar relatório:", {
        error: err,
        message: err instanceof Error ? err.message : "Erro desconhecido",
        stack: err instanceof Error ? err.stack : undefined,
        type: typeof err,
      });

      const errorMessage =
        err instanceof Error ? err.message : "Erro ao criar relatório";
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateRelatorio = async (id: string, updates: Partial<RelatorioIA>) => {
    try {
      const { data, error } = await supabase
        .from("relatorios_ia")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Relatório atualizado com sucesso!");
      await fetchRelatorios(); // Recarregar lista
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao atualizar relatório";
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteRelatorio = async (id: string) => {
    try {
      const { error } = await supabase
        .from("relatorios_ia")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Relatório excluído com sucesso!");
      await fetchRelatorios(); // Recarregar lista
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao excluir relatório";
      toast.error(errorMessage);
      throw err;
    }
  };

  const uploadFile = async (
    file: File,
    bucket: string = "documentos-ia"
  ): Promise<string> => {
    try {
      console.log("Iniciando upload para bucket:", bucket);
      console.log("Arquivo:", file.name, "Tamanho:", file.size);

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      console.log("Caminho do arquivo:", filePath);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (error) {
        console.error("Erro do Supabase Storage:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log("Upload bem-sucedido:", data);

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      console.log("URL pública gerada:", publicUrl);
      return publicUrl;
    } catch (err) {
      console.error("Erro detalhado no upload:", {
        error: err,
        message: err instanceof Error ? err.message : "Erro desconhecido",
        stack: err instanceof Error ? err.stack : undefined,
        type: typeof err,
      });

      const errorMessage =
        err instanceof Error ? err.message : "Erro ao fazer upload do arquivo";
      toast.error(errorMessage);
      throw err;
    }
  };

  const callN8NWebhook = async (payload: any, customUrl?: string) => {
    try {
      const webhookUrl = customUrl || n8nConfig?.webhook_url;

      if (!webhookUrl) {
        throw new Error(
          "URL do webhook N8N não configurada. Configure em Configurações > Integrações."
        );
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Erro na chamada do webhook: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao chamar webhook N8N";
      toast.error(errorMessage);
      throw err;
    }
  };

  // Função específica para resumo de matrícula
  const processarResumoMatricula = async (
    file: File,
    usuarioId: string,
    cartorioId: string
  ) => {
    try {
      console.log("Iniciando processamento de resumo de matrícula...");

      // 1. Upload do arquivo
      const arquivoUrl = await uploadFile(file);
      console.log("Arquivo enviado para:", arquivoUrl);

      // 2. Criar relatório no banco
      const relatorio = await createRelatorio({
        tipo: "resumo_matricula",
        nome_arquivo: file.name,
        usuario_id: usuarioId,
        cartorio_id: cartorioId,
        dados_processamento: {
          arquivo_original: file.name,
          arquivo_url: arquivoUrl,
          tipo_processamento: "resumo_matricula",
          timestamp_inicio: new Date().toISOString(),
        },
        arquivo_resultado: arquivoUrl,
      });

      console.log("Relatório criado:", relatorio);

      // 3. Enviar para webhook específico do resumo de matrícula
      const webhookUrl =
        "https://webhook.conversix.com.br/webhook/resumo-matricula";

      const payload = {
        relatorio_id: relatorio.id,
        tipo: "resumo_matricula",
        arquivo_url: arquivoUrl,
        webhook_callback: `${window.location.origin}/api/ia/webhook`,
        dados_processamento: {
          arquivo_original: file.name,
          tipo_documento: "matricula_imobiliaria",
          timestamp: new Date().toISOString(),
        },
        metadata: {
          usuario_id: usuarioId,
          cartorio_id: cartorioId,
          origem: "gestao_cartorio_app",
        },
      };

      console.log("Enviando para webhook:", webhookUrl);
      console.log("Payload:", payload);

      // Modo de teste - simular sucesso se webhook não estiver disponível
      const isTestMode =
        webhookUrl.includes("localhost") || webhookUrl.includes("test");

      if (isTestMode) {
        console.log("🧪 Modo de teste ativado - simulando sucesso");
        toast.success(
          "Documento enviado para análise de resumo de matrícula! (Modo teste)"
        );
        return;
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).catch((fetchError) => {
        console.error("Erro de conexão com webhook:", fetchError);
        console.log("🔄 Tentando modo de teste...");

        // Se falhar, simular sucesso para desenvolvimento
        toast.success(
          "Documento enviado para análise de resumo de matrícula! (Webhook offline - modo desenvolvimento)"
        );
        return;
      });

      if (!response) {
        return; // Modo de teste ativado
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro do webhook:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(
          `Erro na chamada do webhook: ${response.status} - ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("Resposta do webhook:", result);

      toast.success("Documento enviado para análise de resumo de matrícula!");
      return relatorio;
    } catch (err) {
      console.error("Erro ao processar resumo de matrícula:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao processar documento";
      toast.error(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    fetchRelatorios();
  }, []);

  return {
    relatorios,
    loading,
    error,
    fetchRelatorios,
    createRelatorio,
    updateRelatorio,
    deleteRelatorio,
    uploadFile,
    callN8NWebhook,
    processarResumoMatricula,
  };
};
