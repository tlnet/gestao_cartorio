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
    id: string;
    name: string;
    email: string;
  };
  cartorio?: {
    id: string;
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

      // Primeiro, consulta simples para verificar se a tabela existe
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

      // Se há dados, carregar informações dos usuários separadamente
      if (data && data.length > 0) {
        const relatoriosComUsuarios = await Promise.all(
          data.map(async (relatorio) => {
            try {
              // Buscar dados do usuário
              const { data: usuarioData } = await supabase
                .from("users")
                .select("id, name, email")
                .eq("id", relatorio.usuario_id)
                .single();

              // Buscar dados do cartório
              const { data: cartorioData } = await supabase
                .from("cartorios")
                .select("id, nome")
                .eq("id", relatorio.cartorio_id)
                .single();

              return {
                ...relatorio,
                usuario: usuarioData,
                cartorio: cartorioData,
              };
            } catch (err) {
              console.warn(
                `Erro ao carregar dados do usuário ${relatorio.usuario_id}:`,
                err
              );
              return {
                ...relatorio,
                usuario: null,
                cartorio: null,
              };
            }
          })
        );

        setRelatorios(relatoriosComUsuarios);
      } else {
        setRelatorios(data || []);
      }
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

      // Preparar dados apenas com campos que existem na tabela
      const dadosParaInserir = {
        tipo: relatorioData.tipo,
        nome_arquivo: relatorioData.nome_arquivo,
        usuario_id: relatorioData.usuario_id,
        cartorio_id: relatorioData.cartorio_id,
        status: "processando" as const,
        dados_processamento: relatorioData.dados_processamento || null,
        arquivo_resultado: relatorioData.arquivo_resultado || null,
      };

      console.log("Dados preparados para inserção:", dadosParaInserir);

      const { data, error } = await supabase
        .from("relatorios_ia")
        .insert([dadosParaInserir])
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

  const limparRelatoriosProcessando = async () => {
    try {
      const { error } = await supabase
        .from("relatorios_ia")
        .delete()
        .eq("status", "processando");

      if (error) throw error;

      toast.success("Todos os relatórios em processamento foram limpos!");
      await fetchRelatorios(); // Recarregar lista
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao limpar relatórios";
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

      console.log("🌐 callN8NWebhook: Tentando envio direto para:", webhookUrl);

      let response;
      try {
        // Tentar envio direto primeiro
        response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "GestaoCartorio/1.0",
          },
          body: JSON.stringify(payload),
        });
        console.log("✅ callN8NWebhook: Envio direto funcionou!");
        console.log("📊 callN8NWebhook: Status da resposta:", response.status);
      } catch (corsError) {
        console.log("⚠️ callN8NWebhook: CORS bloqueado, tentando via proxy...");

        // Se CORS falhar, tentar via proxy
        const proxyUrl = `${window.location.origin}/api/webhook-proxy`;
        console.log("🔗 callN8NWebhook: URL do proxy:", proxyUrl);

        response = await fetch(proxyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            webhookUrl: webhookUrl,
            payload: payload,
          }),
        });
        console.log("✅ callN8NWebhook: Envio via proxy funcionou!");
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(
          `Erro na chamada do webhook: ${response.status} - ${
            errorData.error || errorData.details || "Erro desconhecido"
          }`
        );
      }

      // Verificar o tipo de conteúdo da resposta
      const contentType = response.headers.get("content-type");
      console.log("📋 callN8NWebhook: Content-Type da resposta:", contentType);

      let result;

      // Se for um arquivo binário (PDF, DOC, etc.), processar o arquivo
      if (
        contentType?.includes("application/pdf") ||
        contentType?.includes("application/msword") ||
        contentType?.includes(
          "application/vnd.openxmlformats-officedocument"
        ) ||
        contentType?.includes("application/octet-stream")
      ) {
        console.log(
          "📁 callN8NWebhook: Arquivo binário recebido, processando..."
        );

        try {
          // Extrair o arquivo binário da resposta
          const arrayBuffer = await response.arrayBuffer();
          const blob = new Blob([arrayBuffer], { type: contentType });

          // Fazer upload para Supabase Storage
          const timestamp = Date.now();
          const fileExtension = contentType.includes("pdf")
            ? "pdf"
            : contentType.includes("msword")
            ? "doc"
            : "docx";
          const fileName = `relatorio-${Date.now()}-${timestamp}.${fileExtension}`;

          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from("documentos-ia")
              .upload(fileName, blob, {
                contentType: contentType,
                upsert: false,
              });

          if (uploadError) {
            console.error("❌ Erro no upload do arquivo:", uploadError);
            throw new Error(`Erro no upload: ${uploadError.message}`);
          }

          // Obter URL pública
          const {
            data: { publicUrl },
          } = supabase.storage.from("documentos-ia").getPublicUrl(fileName);

          console.log("✅ Arquivo enviado para Supabase:", publicUrl);

          result = {
            success: true,
            message: "Arquivo processado e enviado com sucesso",
            contentType: contentType,
            isBinaryFile: true,
            fileUrl: publicUrl,
            fileName: fileName,
          };
        } catch (uploadError) {
          console.error("❌ Erro ao processar arquivo binário:", uploadError);
          result = {
            success: false,
            message: "Erro ao processar arquivo binário",
            error:
              uploadError instanceof Error
                ? uploadError.message
                : "Erro desconhecido",
          };
        }
      } else {
        // Tentar parsear JSON para outros tipos de conteúdo
        try {
          const responseText = await response.text();
          console.log(
            "📄 callN8NWebhook: Resposta bruta do webhook:",
            responseText
          );

          if (responseText.trim() === "") {
            console.log("⚠️ callN8NWebhook: Resposta vazia do webhook");
            result = {
              success: true,
              message: "Webhook processado com sucesso (resposta vazia)",
            };
          } else {
            result = JSON.parse(responseText);
            console.log(
              "✅ callN8NWebhook: JSON parseado com sucesso:",
              result
            );
          }
        } catch (jsonError) {
          console.log(
            "⚠️ callN8NWebhook: Resposta não é JSON válido, tratando como sucesso"
          );
          result = {
            success: true,
            message: "Webhook processado com sucesso",
            rawResponse: "Resposta não-JSON recebida",
          };
        }
      }

      console.log("📊 callN8NWebhook: Resultado final:", result);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao chamar webhook N8N";
      toast.error(errorMessage);
      throw err;
    }
  };

  // Função genérica para processar qualquer tipo de análise
  const processarAnalise = async (
    tipo: "resumo_matricula" | "analise_malote" | "minuta_documento",
    arquivos: File | File[],
    usuarioId: string,
    cartorioId: string,
    dadosAdicionais?: any,
    webhookUrl?: string
  ) => {
    try {
      console.log(`Iniciando processamento de ${tipo}...`);
      console.log("Parâmetros recebidos:", {
        tipo,
        usuarioId,
        cartorioId,
        webhookUrl,
        n8nConfig: !!n8nConfig,
        n8nConfigData: n8nConfig,
      });

      // 1. Upload dos arquivos
      const arquivosUrls: string[] = [];
      const arquivosArray = Array.isArray(arquivos) ? arquivos : [arquivos];

      for (const arquivo of arquivosArray) {
        const arquivoUrl = await uploadFile(arquivo);
        arquivosUrls.push(arquivoUrl);
        console.log(`Arquivo ${arquivo.name} enviado para:`, arquivoUrl);
      }

      // 2. Criar relatório no banco
      const relatorio = await createRelatorio({
        tipo,
        nome_arquivo: Array.isArray(arquivos)
          ? `analise_${tipo}_${Date.now()}.pdf`
          : arquivos.name,
        usuario_id: usuarioId,
        cartorio_id: cartorioId,
        dados_processamento: {
          arquivos_originais: arquivosArray.map((f) => f.name),
          arquivos_urls: arquivosUrls,
          tipo_processamento: tipo,
          timestamp_inicio: new Date().toISOString(),
          ...dadosAdicionais,
        },
        arquivo_resultado: arquivosUrls.join(","),
      });

      console.log("Relatório criado:", relatorio);

      // 3. Obter webhook específico para o tipo
      const finalWebhookUrl =
        webhookUrl ||
        (n8nConfig
          ? tipo === "resumo_matricula"
            ? n8nConfig.webhook_resumo_matricula || n8nConfig.webhook_url
            : tipo === "analise_malote"
            ? n8nConfig.webhook_analise_malote || n8nConfig.webhook_url
            : tipo === "minuta_documento"
            ? n8nConfig.webhook_minuta_documento || n8nConfig.webhook_url
            : n8nConfig.webhook_url
          : null);

      if (!finalWebhookUrl) {
        console.error("Webhook não configurado:", {
          tipo,
          n8nConfig,
          webhookUrl,
        });
        throw new Error(
          `Webhook para ${tipo} não configurado. Execute o script SQL para configurar os webhooks.`
        );
      }

      console.log("Webhook configurado:", {
        tipo,
        finalWebhookUrl,
        n8nConfig: !!n8nConfig,
        n8nConfigData: n8nConfig,
      });

      // Verificar se a URL é válida
      if (!finalWebhookUrl.startsWith("http")) {
        throw new Error(`URL do webhook inválida: ${finalWebhookUrl}`);
      }

      // 4. Preparar payload específico por tipo
      const payload = {
        relatorio_id: relatorio.id,
        tipo,
        arquivos_urls: arquivosUrls,
        webhook_callback: `${window.location.origin}/api/ia/webhook`,
        dados_processamento: {
          arquivos_originais: arquivosArray.map((f) => f.name),
          tipo_documento: tipo,
          timestamp: new Date().toISOString(),
          ...dadosAdicionais,
        },
        metadata: {
          usuario_id: usuarioId,
          cartorio_id: cartorioId,
          origem: "gestao_cartorio_app",
        },
      };

      console.log("🌐 Enviando para webhook via proxy:", finalWebhookUrl);
      console.log("📋 Payload:", payload);

      // 5. Enviar para webhook (tentando contornar CORS)
      console.log("🌐 Tentando enviar diretamente para webhook...");

      let response;
      try {
        // Tentar envio direto primeiro (POST)
        response = await fetch(finalWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "GestaoCartorio/1.0",
          },
          body: JSON.stringify(payload),
        });
        console.log("✅ Envio direto funcionou!");
        console.log("📊 Status da resposta:", response.status);
        console.log(
          "📋 Headers da resposta:",
          Object.fromEntries(response.headers.entries())
        );
      } catch (corsError) {
        console.log("⚠️ CORS bloqueado, tentando via proxy...");
        console.log("🔍 Erro CORS:", corsError);

        // Se CORS falhar, tentar via proxy
        const proxyUrl = `${window.location.origin}/api/webhook-proxy`;
        console.log("🔗 URL do proxy:", proxyUrl);

        try {
          response = await fetch(proxyUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              webhookUrl: finalWebhookUrl,
              payload: payload,
            }),
          });
          console.log("✅ Envio via proxy funcionou! Status:", response.status);
        } catch (proxyError) {
          console.error("❌ Erro no proxy:", proxyError);
          throw new Error(
            `Erro no proxy: ${
              proxyError instanceof Error
                ? proxyError.message
                : "Erro desconhecido"
            }`
          );
        }
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Erro desconhecido" }));
        console.error("Erro do webhook via proxy:", {
          status: response.status,
          error: errorData,
        });
        throw new Error(
          `Erro do webhook: ${response.status} - ${
            errorData.error || errorData.details || "Erro desconhecido"
          }`
        );
      }

      // Verificar o tipo de conteúdo da resposta
      const contentType = response.headers.get("content-type");
      console.log("📋 Content-Type da resposta:", contentType);

      let result;

      // Se for um arquivo binário (PDF, DOC, etc.), processar o arquivo
      if (
        contentType?.includes("application/pdf") ||
        contentType?.includes("application/msword") ||
        contentType?.includes(
          "application/vnd.openxmlformats-officedocument"
        ) ||
        contentType?.includes("application/octet-stream")
      ) {
        console.log("📁 Arquivo binário recebido, processando...");

        try {
          // Extrair o arquivo binário da resposta
          const arrayBuffer = await response.arrayBuffer();
          const blob = new Blob([arrayBuffer], { type: contentType });

          // Fazer upload para Supabase Storage
          const timestamp = Date.now();
          const fileExtension = contentType.includes("pdf")
            ? "pdf"
            : contentType.includes("msword")
            ? "doc"
            : "docx";
          const fileName = `relatorio-${relatorio.id}-${timestamp}.${fileExtension}`;

          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from("documentos-ia")
              .upload(fileName, blob, {
                contentType: contentType,
                upsert: false,
              });

          if (uploadError) {
            console.error("❌ Erro no upload do arquivo:", uploadError);
            throw new Error(`Erro no upload: ${uploadError.message}`);
          }

          // Obter URL pública
          const {
            data: { publicUrl },
          } = supabase.storage.from("documentos-ia").getPublicUrl(fileName);

          console.log("✅ Arquivo enviado para Supabase:", publicUrl);

          // Atualizar o relatório no banco de dados
          const updates: any = {
            status: "concluido",
            updated_at: new Date().toISOString(),
          };

          // Definir campo baseado no tipo de arquivo
          if (contentType.includes("application/pdf")) {
            updates.relatorio_pdf = publicUrl;
          } else if (
            contentType.includes("application/msword") ||
            contentType.includes(
              "application/vnd.openxmlformats-officedocument"
            )
          ) {
            updates.relatorio_doc = publicUrl;
          } else {
            updates.arquivo_resultado = publicUrl;
          }

          // Atualizar no banco
          const { error: updateError } = await supabase
            .from("relatorios_ia")
            .update(updates)
            .eq("id", relatorio.id);

          if (updateError) {
            console.error("❌ Erro ao atualizar relatório:", updateError);
            throw new Error(
              `Erro ao atualizar relatório: ${updateError.message}`
            );
          }

          console.log("✅ Relatório atualizado para 'concluído'");

          result = {
            success: true,
            message: "Arquivo processado e relatório atualizado com sucesso",
            contentType: contentType,
            isBinaryFile: true,
            fileUrl: publicUrl,
            fileName: fileName,
          };
        } catch (uploadError) {
          console.error("❌ Erro ao processar arquivo binário:", uploadError);
          result = {
            success: false,
            message: "Erro ao processar arquivo binário",
            error:
              uploadError instanceof Error
                ? uploadError.message
                : "Erro desconhecido",
          };
        }
      } else {
        // Tentar parsear JSON para outros tipos de conteúdo
        try {
          const responseText = await response.text();
          console.log("📄 Resposta bruta do webhook:", responseText);

          if (responseText.trim() === "") {
            console.log("⚠️ Resposta vazia do webhook");
            result = {
              success: true,
              message: "Webhook processado com sucesso (resposta vazia)",
            };
          } else {
            result = JSON.parse(responseText);
            console.log("✅ JSON parseado com sucesso:", result);
          }
        } catch (jsonError) {
          console.log("⚠️ Resposta não é JSON válido, tratando como sucesso");
          result = {
            success: true,
            message: "Webhook processado com sucesso",
            rawResponse: "Resposta não-JSON recebida",
          };
        }
      }

      console.log("📊 Resultado final:", result);

      const tipoLabel = {
        resumo_matricula: "resumo de matrícula",
        analise_malote: "análise de malote",
        minuta_documento: "minuta de documento",
      }[tipo];

      toast.success(`Documento enviado para ${tipoLabel}!`);
      return relatorio;
    } catch (err) {
      console.error(`Erro ao processar ${tipo}:`, err);
      const errorMessage =
        err instanceof Error ? err.message : `Erro ao processar ${tipo}`;
      toast.error(errorMessage);
      throw err;
    }
  };

  // Função específica para resumo de matrícula
  const processarResumoMatricula = async (
    file: File,
    usuarioId: string,
    cartorioId: string,
    webhookUrl?: string
  ) => {
    return processarAnalise(
      "resumo_matricula",
      file,
      usuarioId,
      cartorioId,
      {
        tipo_documento: "matricula_imobiliaria",
      },
      webhookUrl
    );
  };

  // Função específica para análise de malote
  const processarAnaliseMalote = async (
    file: File,
    usuarioId: string,
    cartorioId: string,
    webhookUrl?: string
  ) => {
    return processarAnalise(
      "analise_malote",
      file,
      usuarioId,
      cartorioId,
      {
        tipo_documento: "malote_eletronico",
      },
      webhookUrl
    );
  };

  // Função específica para minuta de documento
  const processarMinutaDocumento = async (
    files: File[],
    usuarioId: string,
    cartorioId: string,
    documentos: {
      compradores: string[];
      vendedores: string[];
      matricula: string[];
      outros: string[];
    },
    webhookUrl?: string
  ) => {
    return processarAnalise(
      "minuta_documento",
      files,
      usuarioId,
      cartorioId,
      {
        tipo_documento: "escritura_compra_venda",
        documentos,
        total_documentos: files.length,
      },
      webhookUrl
    );
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
    limparRelatoriosProcessando,
    uploadFile,
    callN8NWebhook,
    processarResumoMatricula,
    processarAnaliseMalote,
    processarMinutaDocumento,
    processarAnalise,
  };
};
