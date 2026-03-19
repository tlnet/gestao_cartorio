import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** Cliente com Service Role para ler/atualizar relatorios_ia sem RLS (N8N não envia JWT). */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurado. Necessário para o callback do webhook."
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    console.log("🔔 Webhook recebido:", {
      headers: Object.fromEntries(request.headers.entries()),
      contentType: request.headers.get("content-type"),
      timestamp: new Date().toISOString(),
    });

    const normalizeStatus = (raw: any): "processando" | "concluido" | "erro" => {
      const s = String(raw ?? "").trim().toLowerCase();

      if (!s) return "erro";

      if (
        ["concluido", "completed", "complete", "success", "sucesso", "done", "ok", "finalizado"].includes(
          s
        )
      ) {
        return "concluido";
      }

      if (
        ["erro", "error", "failed", "failure", "falha"].includes(s)
      ) {
        return "erro";
      }

      if (
        ["processando", "processing", "in_progress", "em_processamento"].includes(s)
      ) {
        return "processando";
      }

      // fallback seguro (evita gravar status inválido que quebra constraint)
      return "erro";
    };

    // Verificar se as variáveis de ambiente estão configuradas
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return NextResponse.json(
        { error: "Variáveis de ambiente do Supabase não configuradas" },
        { status: 503 }
      );
    }

    // Verificar se é um arquivo binário ou JSON
    const contentType = request.headers.get("content-type");
    let body;

    if (contentType?.includes("application/json")) {
      body = await request.json();
      console.log("📄 Dados JSON recebidos:", body);
    } else if (
      contentType?.includes("multipart/form-data") ||
      contentType?.includes("application/octet-stream")
    ) {
      // Lidar com arquivo binário
      const formData = await request.formData();
      const file = formData.get("file") as File;
      const metadata = formData.get("metadata") as string;

      if (!file) {
        return NextResponse.json(
          { error: "Arquivo não encontrado no payload" },
          { status: 400 }
        );
      }

      body = {
        relatorio_id: metadata ? JSON.parse(metadata).relatorio_id : null,
        status: "concluido",
        arquivo_binario: file,
        tipo_arquivo: file.type,
        nome_arquivo: file.name,
        tamanho_arquivo: file.size,
      };

      console.log("📁 Arquivo binário recebido:", {
        nome: file.name,
        tipo: file.type,
        tamanho: file.size,
        relatorio_id: body.relatorio_id,
      });
    } else {
      return NextResponse.json(
        { error: "Tipo de conteúdo não suportado" },
        { status: 400 }
      );
    }

    // Validar dados recebidos do N8N
    const {
      relatorio_id,
      status,
      relatorio_pdf,
      relatorio_doc,
      relatorio_docx,
      resumo,
      error_message,
      // Campos específicos para resumo de matrícula
      matricula_resumida_url,
      dados_extraidos,
      tipo_processamento,
      // Campos para arquivo binário
      arquivo_binario,
      tipo_arquivo,
      nome_arquivo,
      tamanho_arquivo,
      // Campos para erro de minuta com campos pendentes
      mensagens_erro,
      mensagens_alerta,
      campos_pendentes,
    } = body;

    // Alguns workflows do N8N mandam `metadata` como string JSON.
    const metadataMaybeString = (body as any)?.metadata;
    let metadataParsed: any = metadataMaybeString;
    if (typeof metadataMaybeString === "string") {
      try {
        metadataParsed = JSON.parse(metadataMaybeString);
      } catch {
        // ignore - segue usando o valor original
      }
    }

    const resolvedRelatorioId =
      relatorio_id ??
      (body as any)?.relatorioId ??
      (body as any)?.relatorios_id ??
      (body as any)?.relatorio?.id ??
      metadataParsed?.relatorio_id ??
      metadataParsed?.relatorioId ??
      null;

    if (!resolvedRelatorioId) {
      return NextResponse.json(
        { error: "relatorio_id é obrigatório (não encontrado no payload)" },
        { status: 400 }
      );
    }

    // Alguns workflows do N8N podem mandar URLs/arquivos com nomes diferentes no JSON.
    // Para evitar ficar eternamente em "processando", normalizamos os campos mais comuns.
    const bodyAny = body as any;
    const resolvedRelatorioPdf =
      relatorio_pdf ??
      bodyAny.relatorio_pdf_url ??
      bodyAny.relatorioPdf ??
      bodyAny.pdf_url ??
      bodyAny.fileUrl ??
      bodyAny.file_url ??
      null;
    const resolvedRelatorioDoc =
      relatorio_doc ??
      bodyAny.relatorio_doc_url ??
      bodyAny.relatorioDoc ??
      bodyAny.doc_url ??
      bodyAny.docUrl ??
      null;
    const resolvedRelatorioDocx =
      relatorio_docx ??
      bodyAny.relatorio_docx_url ??
      bodyAny.relatorioDocx ??
      null;
    const resolvedArquivoResultado =
      matricula_resumida_url ??
      bodyAny.arquivo_resultado ??
      bodyAny.resultado_url ??
      bodyAny.result_url ??
      bodyAny.file_result_url ??
      null;
    const resolvedDadosExtraidos = dados_extraidos ?? bodyAny.dadosExtraidos ?? null;

    // Atualizar o relatório no banco de dados
    const updates: any = {
      status: normalizeStatus(status),
      updated_at: new Date().toISOString(),
    };

    console.log("🔔 [WEBHOOK][IA] Status recebido/normalizado", {
      statusRaw: status ?? null,
      statusNormalized: updates.status,
      tipo_processamento: tipo_processamento ?? null,
      resolvedRelatorioId,
      temArquivos: {
        relatorio_pdf: !!resolvedRelatorioPdf,
        relatorio_doc: !!resolvedRelatorioDoc,
        relatorio_docx: !!resolvedRelatorioDocx,
        arquivo_binario: !!arquivo_binario,
        arquivo_resultado: !!resolvedArquivoResultado,
        resultado_final: !!resolvedDadosExtraidos,
      },
      resumo_matricula_fields: {
        matricula_resumida_url_type: matricula_resumida_url ? typeof matricula_resumida_url : null,
        matricula_resumida_url_present: !!matricula_resumida_url,
        dados_extraidos_present: !!resolvedDadosExtraidos,
        tipo_processamento_present: !!tipo_processamento,
      },
    });

    // Se recebeu arquivo binário, fazer upload para o Supabase Storage
    if (arquivo_binario) {
      try {
        console.log("📤 Fazendo upload do arquivo binário...");
        console.log("📊 Dados do arquivo:", {
          relatorio_id,
          nome_arquivo,
          tipo_arquivo,
          tamanho_arquivo,
          status,
        });

        // Gerar nome único para o arquivo
        const timestamp = Date.now();
        const fileExtension = nome_arquivo.split(".").pop() || "pdf";
        const fileName = `relatorio-${relatorio_id}-${timestamp}.${fileExtension}`;

        // Upload para Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from("documentos-ia")
          .upload(fileName, arquivo_binario, {
            contentType: tipo_arquivo,
            upsert: false,
          });

        if (uploadError) {
          console.error("❌ Erro no upload:", uploadError);
          throw uploadError;
        }

        // Obter URL pública
        const {
          data: { publicUrl },
        } = supabaseAdmin.storage.from("documentos-ia").getPublicUrl(fileName);

        console.log("✅ Arquivo enviado com sucesso:", publicUrl);

        // Atualizar campos do relatório baseado no tipo de arquivo
        if (tipo_arquivo === "application/pdf") {
          updates.relatorio_pdf = publicUrl;
        } else if (
          tipo_arquivo === "application/msword" ||
          tipo_arquivo ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          updates.relatorio_doc = publicUrl;
        } else {
          updates.arquivo_resultado = publicUrl;
        }

        updates.status = "concluido";
      } catch (uploadError) {
        console.error("❌ Erro no upload do arquivo:", uploadError);
        updates.status = "erro";
        updates.resumo = {
          ...(updates.resumo || {}),
          error: "Erro no upload do arquivo processado",
        };
      }
    } else {
      // Lógica original para dados JSON
      // Campos gerais (verificar se existem antes de adicionar)
      if (resolvedRelatorioPdf) updates.relatorio_pdf = resolvedRelatorioPdf;
      if (resolvedRelatorioDoc) updates.relatorio_doc = resolvedRelatorioDoc;
      if (resolvedRelatorioDocx) updates.relatorio_docx = resolvedRelatorioDocx;

      // Tratar resumo com verificação de existência da coluna
      if (resumo) {
        updates.resumo = resumo;
      }
      if (error_message) {
        updates.resumo = { ...(updates.resumo || {}), error: error_message };
      }

      // Campos específicos para resumo de matrícula
      if (resolvedArquivoResultado) {
        updates.arquivo_resultado = resolvedArquivoResultado;
      }

      if (resolvedDadosExtraidos) {
        updates.resultado_final = {
          ...(updates.resultado_final || {}),
          dados_extraidos: resolvedDadosExtraidos,
          tipo_processamento: tipo_processamento || "resumo_matricula",
          timestamp_conclusao: new Date().toISOString(),
        };
      }

      // Tratar retorno de erro com campos pendentes (minuta de documento)
      if (status === "ERROR" || status === "error") {
        updates.status = "erro";
        
        // Salvar informações de erro e campos pendentes
        const errorData: any = {};
        
        if (mensagens_erro && Array.isArray(mensagens_erro) && mensagens_erro.length > 0) {
          errorData.mensagens_erro = mensagens_erro;
        }
        
        if (mensagens_alerta && Array.isArray(mensagens_alerta) && mensagens_alerta.length > 0) {
          errorData.mensagens_alerta = mensagens_alerta;
        }
        
        if (campos_pendentes && Array.isArray(campos_pendentes) && campos_pendentes.length > 0) {
          errorData.campos_pendentes = campos_pendentes;
          errorData.requer_preenchimento = true;
        }
        
        if (Object.keys(errorData).length > 0) {
          updates.resumo = {
            ...(updates.resumo || {}),
            ...errorData,
          };
        }
      }
    }

    // Ajuste final do status para resumo_matricula e analise_malote (evita ficar em processando por status inesperado)
    if (["resumo_matricula", "matricula_imobiliaria"].includes(tipo_processamento)) {
      const hasFinalOutput =
        !!updates.arquivo_resultado ||
        !!updates.relatorio_pdf ||
        !!updates.relatorio_doc ||
        !!updates.resultado_final;
      if (hasFinalOutput) {
        updates.status = "concluido";
      }
    }

    if (["analise_malote", "malote_eletronico"].includes(tipo_processamento)) {
      const hasFinalOutput =
        !!updates.arquivo_resultado ||
        !!updates.relatorio_pdf ||
        !!updates.relatorio_doc ||
        !!updates.resultado_final;
      if (hasFinalOutput) {
        updates.status = "concluido";
      }
    }

    const { data, error } = await supabaseAdmin
      .from("relatorios_ia")
      .update(updates)
      .eq("id", resolvedRelatorioId)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar relatório:", {
        error,
        resolvedRelatorioId,
        updates,
      });
      return NextResponse.json(
        { error: "Erro ao atualizar relatório no banco de dados" },
        { status: 500 }
      );
    }

    console.log("✅ Relatório atualizado com sucesso:", {
      relatorio_id: resolvedRelatorioId,
      status: updates.status,
      timestamp: new Date().toISOString(),
      data,
    });

    return NextResponse.json({
      success: true,
      message: "Relatório atualizado com sucesso",
      data,
    });
  } catch (error) {
    console.error("Erro no webhook:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Endpoint para testar a conexão
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Webhook endpoint funcionando",
    timestamp: new Date().toISOString(),
  });
}
