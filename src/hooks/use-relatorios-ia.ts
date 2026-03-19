import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useN8NConfig } from "./use-n8n-config";
import { getWebhookUrl as getDefaultWebhookUrl } from "@/lib/webhooks-config";

export interface RelatorioIA {
  id: string;
  tipo: "resumo_matricula" | "analise_malote" | "minuta_documento";
  nome_arquivo: string;
  status: "processando" | "concluido" | "erro" | "analise_incompleta";
  usuario_id: string;
  cartorio_id: string;
  dados_processamento?: any;
  resultado_final?: any;
  arquivo_resultado?: string;
  relatorio_pdf?: string;
  relatorio_doc?: string;
  resumo?: any; // JSONB - pode conter campos_pendentes, mensagens_erro, etc.
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

  const inFlightFetchRef = useRef<Promise<void> | null>(null);
  const fetchSeqRef = useRef(0);

  // Hook para configuração N8N (com tratamento de erro)
  const { config: n8nConfig } = useN8NConfig();

  const withTimeout = async <T,>(
    promise: Promise<T>,
    ms: number,
    message: string
  ): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error(message)), ms);
      promise
        .then((v) => {
          clearTimeout(timeoutId);
          resolve(v);
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
    });
  };

  const fetchRelatorios = async (options?: { silent?: boolean; force?: boolean }) => {
    const silent = options?.silent ?? false;
    const force = options?.force ?? false;
    const fetchSeq = ++fetchSeqRef.current;

    // Se já está buscando, compartilha a mesma Promise (evita "empilhar" polling)
    if (inFlightFetchRef.current && !force) return inFlightFetchRef.current;

    const task = (async () => {
    try {
        if (!silent) setLoading(true);
        setError(null);

        console.log("Iniciando busca de relatórios...", { silent });

        const FETCH_TIMEOUT_MS = silent ? 25_000 : 30_000;

        const core = async (): Promise<RelatorioIA[]> => {
          // Consulta simples (versão estável): evita erros por join/relacionamentos
          const { data, error } = await supabase
            .from("relatorios_ia")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);

          console.log("Resultado da consulta:", { data, error });

          if (error) {
            console.error("Erro do Supabase:", {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint,
            });

            // Se for erro de tabela não encontrada, apenas retorna array vazio
            if (error.code === "42P01" || error.message.includes("does not exist")) {
              console.warn(
                "Tabela relatorios_ia não encontrada. Execute o script SQL primeiro."
              );
              return [];
            }

            // Se for erro de permissão, retorna array vazio
            if (
              error.code === "42501" ||
              error.message.includes("permission denied")
            ) {
              console.warn("Erro de permissão RLS. Verifique as políticas.");
              return [];
            }

            throw error;
          }

          console.log("Relatórios carregados com sucesso:", data);

          if (data && data.length > 0) {
            // Enriquecimento com usuário/cartório (mantém a compatibilidade com a UI)
            const relatoriosComUsuarios = await Promise.all(
              data.map(async (relatorio: any) => {
                try {
                  const { data: usuarioData } = await supabase
                    .from("users")
                    .select("id, name, email")
                    .eq("id", relatorio.usuario_id)
                    .single();

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

            return relatoriosComUsuarios as RelatorioIA[];
          }

          return (data || []) as RelatorioIA[];
        };

        const result = await withTimeout(
          core(),
          FETCH_TIMEOUT_MS,
          "Timeout ao buscar relatórios."
        );

        // Evita sobrescrever estado caso uma nova chamada tenha iniciado
        if (fetchSeq !== fetchSeqRef.current) return;

        setRelatorios(result);
      } catch (err) {
        console.error("Erro detalhado ao carregar relatórios:", {
          error: err,
          message: err instanceof Error ? err.message : "Erro desconhecido",
          stack: err instanceof Error ? err.stack : undefined,
          type: typeof err,
        });

        const errorMessage =
          err instanceof Error ? err.message : "Erro ao carregar relatórios";
        if (!silent) setError(errorMessage);

        // Não mostrar toast de erro para evitar spam
      } finally {
        inFlightFetchRef.current = null;
        if (!silent) setLoading(false);
      }
    })();

    inFlightFetchRef.current = task;
    return task;
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
      await fetchRelatorios({ force: true }); // Recarregar lista (evita estado stale)
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

  const updateRelatorio = async (
    id: string,
    updates: Partial<RelatorioIA>,
    options?: { silent?: boolean }
  ) => {
    try {
      const { data, error } = await supabase
        .from("relatorios_ia")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Só mostrar toast de sucesso se não for uma atualização silenciosa
      if (!options?.silent) {
        toast.success("Relatório atualizado com sucesso!");
      }

      // Recarregar lista (forçar evita stale quando polling está em andamento)
      await fetchRelatorios({ silent: options?.silent ?? false, force: true });
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao atualizar relatório";
      
      // Só mostrar toast de erro se não for uma atualização silenciosa
      if (!options?.silent) {
        toast.error(errorMessage);
      }
      
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
      await fetchRelatorios({ force: true }); // Recarregar lista (evita stale)
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
      await fetchRelatorios({ silent: true, force: true }); // Recarregar lista para refletir já
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
          message: error.message,
          ...(error && typeof error === "object" && "code" in error ? { code: (error as any).code } : {}),
          ...(error && typeof error === "object" && "details" in error ? { details: (error as any).details } : {}),
          ...(error && typeof error === "object" && "hint" in error ? { hint: (error as any).hint } : {}),
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
      // Array para armazenar arquivos com nome e URL juntos
      const arquivosCompletos: Array<{ nome: string; url: string }> = [];

      for (const arquivo of arquivosArray) {
        const arquivoUrl = await uploadFile(arquivo);
        arquivosUrls.push(arquivoUrl);
        arquivosCompletos.push({
          nome: arquivo.name,
          url: arquivoUrl,
        });
        console.log(`Arquivo ${arquivo.name} enviado para:`, arquivoUrl);
      }

      // 2. Próximo número sequencial para nome do arquivo (01, 02, 03...)
      const { count } = await supabase
        .from("relatorios_ia")
        .select("*", { count: "exact", head: true });
      const seq = String((count ?? 0) + 1).padStart(2, "0");
      const nomeArquivo =
        Array.isArray(arquivos) ? `analise_${tipo}_${seq}.pdf` : arquivos.name;

      // 3. Criar relatório no banco
      const relatorio = await createRelatorio({
        tipo,
        nome_arquivo: nomeArquivo,
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
      if (tipo === "resumo_matricula") {
        console.log("[IA][RESUMO_MATRICULA] relatorio criado (processando):", {
          id: relatorio?.id,
          usuario_id: relatorio?.usuario_id,
          cartorio_id: relatorio?.cartorio_id,
          nome_arquivo: relatorio?.nome_arquivo,
          status: relatorio?.status,
        });
      }

      if (tipo === "analise_malote") {
        console.log("[IA][ANALISE_MALOTE] relatorio criado (processando):", {
          id: relatorio?.id,
          usuario_id: relatorio?.usuario_id,
          cartorio_id: relatorio?.cartorio_id,
          nome_arquivo: relatorio?.nome_arquivo,
          status: relatorio?.status,
        });
      }

      // 4. Obter webhook específico para o tipo
      // Prioridade: webhookUrl passado > configuração do banco > webhook padrão interno
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
          : null) ||
        getDefaultWebhookUrl(tipo); // Fallback para webhook padrão interno

      if (!finalWebhookUrl) {
        console.error("Webhook não configurado:", {
          tipo,
          n8nConfig,
          webhookUrl,
        });
        throw new Error(
          `Webhook para ${tipo} não configurado.`
        );
      }

      console.log("🔍 Webhook configurado para análise:", {
        tipo,
        finalWebhookUrl,
        webhookUrlPassado: webhookUrl || "não informado",
        n8nConfig: !!n8nConfig,
        webhookResumoMatricula: n8nConfig?.webhook_resumo_matricula,
        webhookAnaliseMalote: n8nConfig?.webhook_analise_malote,
        webhookMinutaDocumento: n8nConfig?.webhook_minuta_documento,
        webhookGenerico: n8nConfig?.webhook_url,
      });

      // Verificar se a URL é válida
      if (!finalWebhookUrl.startsWith("http")) {
        throw new Error(`URL do webhook inválida: ${finalWebhookUrl}`);
      }

      // Validar formato da URL
      try {
        const url = new URL(finalWebhookUrl);
        console.log("✅ URL do webhook válida:", {
          protocolo: url.protocol,
          host: url.host,
          pathname: url.pathname,
        });
      } catch (urlError) {
        throw new Error(`URL do webhook inválida: ${finalWebhookUrl}`);
      }

      // 5. Preparar payload específico por tipo
      let payload: any;

      if (tipo === "minuta_documento" && dadosAdicionais?.dadosFormulario) {
        // Nova estrutura para minuta_documento
        const dadosFormulario = dadosAdicionais.dadosFormulario;
        
        // Criar mapa de arquivos para URLs
        const arquivoUrlMap = new Map<string, string>();
        arquivosArray.forEach((arquivo, index) => {
          arquivoUrlMap.set(arquivo.name, arquivosUrls[index]);
        });

        // Função auxiliar para obter URL do arquivo
        const getFileUrl = (file: File | null): string | null => {
          if (!file) return null;
          return arquivoUrlMap.get(file.name) || null;
        };

        // Construir estrutura de compradores
        const compradores = dadosFormulario.compradores ? [{
          nome_referencia: "Comprador Principal", // Valor padrão, pode ser ajustado se necessário
          email: dadosFormulario.compradores.comprador.email,
          qualificacao_profissional: dadosFormulario.compradores.comprador.qualificacaoProfissional,
          estado_civil_casado: dadosFormulario.compradores.comprador.casado,
          documentos: {
            url_rg_cpf: getFileUrl(dadosFormulario.compradores.comprador.rg) || getFileUrl(dadosFormulario.compradores.comprador.cpf) || null,
            url_comprovante_endereco: getFileUrl(dadosFormulario.compradores.comprador.comprovanteEndereco),
          },
          conjuge: dadosFormulario.compradores.comprador.casado && dadosFormulario.compradores.comprador.conjuge ? {
            email: dadosFormulario.compradores.comprador.conjuge.email,
            qualificacao_profissional: dadosFormulario.compradores.comprador.conjuge.qualificacaoProfissional,
            documentos: {
              url_rg: getFileUrl(dadosFormulario.compradores.comprador.conjuge.rg),
              url_cpf: getFileUrl(dadosFormulario.compradores.comprador.conjuge.cpf),
              url_certidao_casamento: getFileUrl(dadosFormulario.compradores.comprador.conjuge.certidaoCasamento),
            },
          } : null,
        }] : [];

        // Construir estrutura de vendedores
        const vendedores = dadosFormulario.vendedores?.vendedores.map((vendedor, index) => ({
          id: index + 1,
          email: vendedor.email,
          qualificacao_profissional: vendedor.qualificacaoProfissional,
          estado_civil_casado: vendedor.casado,
          documentos: {
            url_rg_cpf: getFileUrl(vendedor.rg) || getFileUrl(vendedor.cpf) || null,
            url_comprovante_endereco: getFileUrl(vendedor.comprovanteEndereco),
          },
          conjuge: vendedor.casado && vendedor.conjuge ? {
            email: vendedor.conjuge.email,
            qualificacao_profissional: vendedor.conjuge.qualificacaoProfissional,
            documentos: {
              url_rg: getFileUrl(vendedor.conjuge.rg),
              url_cpf: getFileUrl(vendedor.conjuge.cpf),
              url_certidao_casamento: getFileUrl(vendedor.conjuge.certidaoCasamento),
            },
          } : null,
        })) || [];

        // Construir estrutura de certidões fiscais
        const certidoes_fiscais = dadosFormulario.certidoes ? {
          estado_civil_casado: dadosFormulario.certidoes.casado,
          documentos: {
            url_cndt: getFileUrl(dadosFormulario.certidoes.cndt),
            url_cnd_federal: getFileUrl(dadosFormulario.certidoes.cndFederal),
          },
          conjuge: dadosFormulario.certidoes.casado && dadosFormulario.certidoes.conjuge ? {
            documentos: {
              url_cndt: getFileUrl(dadosFormulario.certidoes.conjuge.cndt),
              url_cnd_federal: getFileUrl(dadosFormulario.certidoes.conjuge.cndFederal),
            },
          } : null,
        } : null;

        // Construir estrutura de imóvel
        const imovel = dadosFormulario.documentosImovel ? {
          documentos: {
            url_matricula: getFileUrl(dadosFormulario.documentosImovel.matricula),
            url_guia_itbi: getFileUrl(dadosFormulario.documentosImovel.guiaITBI),
            url_certidao_onus: getFileUrl(dadosFormulario.documentosImovel.certidaoOnus),
            url_certidao_negativa_imovel: getFileUrl(
              dadosFormulario.documentosImovel.certidaoNegativaImovel
            ),
          },
        } : null;

        // Buscar dados do cartório para incluir no payload
        let cartorioData = {
          cidade: "",
          estado: "",
          endereco_completo: "",
          numero_oficio: "",
          tabeliao_responsavel: "",
        };

        try {
          const { data: cartorioInfo, error: cartorioError } = await supabase
            .from("cartorios")
            .select("cidade, estado, endereco, numero_oficio, tabeliao_responsavel")
            .eq("id", cartorioId)
            .single();

          if (!cartorioError && cartorioInfo) {
            cartorioData = {
              cidade: cartorioInfo.cidade || "",
              estado: cartorioInfo.estado || "",
              endereco_completo: cartorioInfo.endereco || "",
              numero_oficio: cartorioInfo.numero_oficio || "",
              tabeliao_responsavel: cartorioInfo.tabeliao_responsavel || "",
            };
          }
        } catch (error) {
          console.error("Erro ao buscar dados do cartório:", error);
        }

        // Construir payload na nova estrutura
        payload = {
          relatorio_id: relatorio.id,
          tipo_solicitacao: "minuta_compra_e_venda",
          data_envio: new Date().toISOString(),
          dados: {
            compradores,
            vendedores,
            certidoes_fiscais,
            imovel,
          },
          cartorio: cartorioData,
        };
      } else {
        // Estrutura padrão para outros tipos
        const webhookCallback =
          tipo === "resumo_matricula"
            ? `${window.location.origin}/api/ia/resumo-matricula-resultado`
            : tipo === "analise_malote"
              ? `${window.location.origin}/api/ia/analise-malote-resultado`
              : `${window.location.origin}/api/ia/webhook`;

        payload = {
          relatorio_id: relatorio.id,
          tipo,
          // Enviar arquivos com nome e URL juntos para facilitar identificação
          arquivos: arquivosCompletos,
          // Manter arquivos_urls e arquivos_originais para compatibilidade com outros tipos
          arquivos_urls: arquivosUrls,
          webhook_callback: webhookCallback,
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
      }

      // 6. Enviar para webhook (tentando contornar CORS)
      console.log("🌐 Tentando enviar para webhook:", finalWebhookUrl);
      console.log("📦 Payload a ser enviado:", {
        relatorio_id: payload.relatorio_id,
        tipo: payload.tipo,
        arquivos_count: payload.arquivos?.length || payload.arquivos_urls?.length || 0,
        arquivos_com_nome: payload.arquivos?.map((a: any) => a.nome) || [],
        webhook_callback: payload.webhook_callback,
      });

      const WEBHOOK_TIMEOUT_MS = 60_000; // 60 segundos

      if (tipo === "resumo_matricula") {
        console.log("[IA][RESUMO_MATRICULA] chamando webhook", {
          relatorio_id: payload.relatorio_id,
          webhookUrl: finalWebhookUrl,
          tipo_processamento: payload?.dados_processamento?.tipo_processamento,
        });
      }

      if (tipo === "analise_malote") {
        console.log("[IA][ANALISE_MALOTE] chamando webhook", {
          relatorio_id: payload.relatorio_id,
          webhookUrl: finalWebhookUrl,
          tipo_processamento: payload?.dados_processamento?.tipo_processamento,
        });
      }

      let response;
      try {
        // Tentar envio direto primeiro (POST)
        console.log("🔄 Tentativa 1: Envio direto...");
        const directAbort = new AbortController();
        const directTimer = setTimeout(() => directAbort.abort(), WEBHOOK_TIMEOUT_MS);
        try {
          response = await fetch(finalWebhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: directAbort.signal,
          });
        } finally {
          clearTimeout(directTimer);
        }
        console.log("✅ Envio direto funcionou!");
        console.log("📊 Status da resposta:", response.status, response.statusText);
      } catch (directError) {
        if ((directError as any)?.name === "AbortError") {
          console.error("⏱️ Timeout no envio direto (60s), tentando via proxy...");
        } else {
          console.log("⚠️ Envio direto falhou (possível CORS), tentando via proxy...");
          console.log("🔍 Erro:", directError);
        }

        // Se direto falhar (CORS ou timeout), tentar via proxy
        const proxyUrl = `${window.location.origin}/api/webhook-proxy`;
        console.log("🔄 Tentativa 2: Envio via proxy...");
        console.log("🔗 URL do proxy:", proxyUrl);

        const proxyAbort = new AbortController();
        const proxyTimer = setTimeout(() => proxyAbort.abort(), WEBHOOK_TIMEOUT_MS);
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
            signal: proxyAbort.signal,
          });
          console.log("✅ Envio via proxy funcionou! Status:", response.status, response.statusText);
        } catch (proxyError) {
          clearTimeout(proxyTimer);
          if ((proxyError as any)?.name === "AbortError") {
            throw new Error(
              "Tempo limite excedido (60s) ao enviar para o webhook. Verifique se o N8N está acessível e o workflow está ativo."
            );
          }
          console.error("❌ Erro no proxy:", proxyError);
          throw new Error(
            `Erro no proxy: ${
              proxyError instanceof Error
                ? proxyError.message
                : "Erro desconhecido"
            }`
          );
        } finally {
          clearTimeout(proxyTimer);
        }
      }

      if (!response.ok) {
        let errorData: any = { error: "Erro desconhecido" };
        let errorMessage = "Erro desconhecido";
        
        try {
          const contentType = response.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorData.message || "Erro desconhecido";
          } else {
            // Tentar obter texto da resposta
            const textResponse = await response.text();
            if (textResponse) {
              errorMessage = textResponse;
            }
          }
        } catch (parseError) {
          console.error("Erro ao parsear resposta de erro:", parseError);
          // Se não conseguir parsear, usar mensagem baseada no status
          if (response.status === 404) {
            errorMessage = "Webhook não encontrado (404). Verifique se a URL está correta e se o webhook está ativo no N8N.";
          } else if (response.status === 500) {
            errorMessage = "Erro interno no servidor do webhook (500)";
          } else {
            errorMessage = `Erro HTTP ${response.status}`;
          }
        }
        
        console.error("Erro do webhook:", {
          status: response.status,
          statusText: response.statusText,
          url: finalWebhookUrl,
          error: errorData,
          message: errorMessage,
        });
        
        // Mensagem de erro mais específica baseada no status
        if (response.status === 404) {
          throw new Error(
            `Webhook não encontrado (404): A URL "${finalWebhookUrl}" não está disponível. Verifique se o webhook está configurado corretamente no N8N e se está ativo.`
          );
        } else if (response.status === 500) {
          // Erro 500 geralmente indica problema no workflow do N8N
          let errorDetails = errorMessage;
          if (errorMessage.includes("Workflow could not be started") || 
              errorMessage.includes("Workflow Webhook Error")) {
            errorDetails = "O workflow no N8N não pode ser iniciado. Verifique a configuração do webhook no N8N: o parâmetro 'Respond' deve estar configurado como 'Using Respond to Webhook Node' ou o workflow deve conter um nó 'Respond to Webhook'.";
          }
          throw new Error(
            `Erro interno no webhook N8N (500): ${errorDetails}`
          );
        } else {
          throw new Error(
            `Erro do webhook (${response.status}): ${errorMessage}`
          );
        }
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
          // Atualiza a lista do histórico rapidamente (sem skeleton)
          void fetchRelatorios({ silent: true });

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

            // Se o N8N terminou mas não enviou binário no HTTP response (malote comum),
            // ele pode retornar JSON com URLs/fields do arquivo.
            const r: any = result;

            const normalizeStatus = (raw: any): "concluido" | "erro" | null => {
              const s = String(raw ?? "")
                .trim()
                .toLowerCase();
              if (!s) return null;
              if (
                ["concluido", "completed", "complete", "success", "sucesso", "done", "ok", "finalizado"].includes(
                  s
                )
              ) {
                return "concluido";
              }
              if (["erro", "error", "failed", "failure", "falha"].includes(s)) {
                return "erro";
              }
              return null;
            };

            const statusNormalized =
              normalizeStatus(r?.status) ||
              normalizeStatus(r?.result?.status) ||
              null;

            const resolvedRelatorioPdf =
              r?.relatorio_pdf ||
              r?.relatorio_pdf_url ||
              r?.relatorioPdf ||
              r?.pdf_url ||
              r?.fileUrl ||
              r?.file_url ||
              null;
            const resolvedRelatorioDoc =
              r?.relatorio_doc || r?.relatorio_doc_url || r?.doc_url || null;
            const resolvedRelatorioDocx =
              r?.relatorio_docx || r?.relatorio_docx_url || null;
            const resolvedArquivoResultado =
              r?.arquivo_resultado || r?.resultado_url || null;

            const hasAnyFinalOutput =
              !!resolvedRelatorioPdf ||
              !!resolvedRelatorioDoc ||
              !!resolvedRelatorioDocx ||
              !!resolvedArquivoResultado;

            if (statusNormalized === "concluido" || (r?.success === true && hasAnyFinalOutput)) {
              const updates: any = {
                status: "concluido",
                updated_at: new Date().toISOString(),
              };

              if (resolvedRelatorioPdf) updates.relatorio_pdf = resolvedRelatorioPdf;
              if (resolvedRelatorioDoc) updates.relatorio_doc = resolvedRelatorioDoc;
              if (resolvedRelatorioDocx && !updates.relatorio_doc) updates.relatorio_doc = resolvedRelatorioDocx;
              if (resolvedArquivoResultado && !updates.relatorio_pdf && !updates.relatorio_doc) {
                updates.arquivo_resultado = resolvedArquivoResultado;
              }

              // resumo/dados_extraidos (se vier)
              if (r?.resumo) updates.resumo = r.resumo;
              if (r?.dados_extraidos) {
                updates.resultado_final = {
                  ...(updates.resultado_final || {}),
                  datos_extraidos: r.dados_extraidos,
                };
              }

              const { error: updateError } = await supabase
                .from("relatorios_ia")
                .update(updates)
                .eq("id", relatorio.id);

              if (updateError) {
                console.error(
                  "❌ Erro ao atualizar relatório a partir do JSON do N8N:",
                  updateError
                );
              } else {
                void fetchRelatorios({ silent: true });
                console.log("✅ Status atualizado para 'concluido' via JSON do N8N");
              }
            }
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
    dadosFormulario: {
      compradores?: {
        comprador: {
          rg: File | null;
          cpf: File | null;
          comprovanteEndereco: File | null;
          email: string;
          qualificacaoProfissional: string;
          casado: boolean;
          conjuge: {
            rg: File | null;
            cpf: File | null;
            certidaoCasamento: File | null;
            email: string;
            qualificacaoProfissional: string;
          } | null;
        };
      } | null;
      vendedores?: {
        vendedores: Array<{
          id: string;
          rg: File | null;
          cpf: File | null;
          comprovanteEndereco: File | null;
          email: string;
          qualificacaoProfissional: string;
          casado: boolean;
          conjuge: {
            rg: File | null;
            cpf: File | null;
            certidaoCasamento: File | null;
            email: string;
            qualificacaoProfissional: string;
          } | null;
        }>;
        multiplosVendedores: boolean;
      } | null;
      certidoes?: {
        cndt: File | null;
        cndFederal: File | null;
      } | null;
      documentosImovel?: {
        matricula: File | null;
        guiaITBI: File | null;
        certidaoOnus: File | null;
        certidaoNegativaImovel?: File | null;
      } | null;
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
        dadosFormulario,
        total_documentos: files.length,
      },
      webhookUrl
    );
  };

  useEffect(() => {
    fetchRelatorios({ force: true });
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
