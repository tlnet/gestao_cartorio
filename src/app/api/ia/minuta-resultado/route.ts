import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** Cliente com Service Role para ler/atualizar relatorios_ia sem RLS (callback do N8N não envia JWT). */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurado. Necessário para o callback de minuta.");
  }
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Endpoint unificado para resultado da minuta de documento.
 * Recebe tanto minuta completa quanto incompleta; o recebimento é o mesmo nos dois casos.
 *
 * POST /api/ia/minuta-resultado
 *
 * Aceita:
 * 1) multipart/form-data: campo "payload" (JSON string) + opcional "file" (PDF binário) + opcional "doc_file" (DOC binário)
 * 2) application/json: body com o mesmo formato (sem arquivos)
 *
 * Os binários podem ser enviados em ambos os cenários (completo ou incompleto).
 * Quando enviados:
 *   - "file"     → armazenado em relatorio_pdf
 *   - "doc_file" → armazenado em relatorio_doc
 *
 * Formato do payload (JSON):
 * - relatorio_id: string (obrigatório)
 * - status: "concluido" | "ERROR" | "error" | "incompleto"
 *
 * Quando status === "concluido": resumo?: object
 * Quando status === "ERROR" | "error" | "incompleto": campos_pendentes: string[], mensagens_erro?: string[], mensagens_alerta?: string[]
 */

interface ParsedPayload {
  relatorio_id: string;
  status: string;
  dados_minuta?: Record<string, unknown>;
  resumo?: object;
  campos_pendentes?: string[];
  mensagens_erro?: string[];
  mensagens_alerta?: string[];
  // URLs de arquivo passadas diretamente como string no JSON (alternativa ao upload binário)
  relatorio_pdf_url?: string;
  relatorio_doc_url?: string;
}

function parsePayload(payload: unknown): ParsedPayload {
  if (payload == null || typeof payload !== "object" || !("relatorio_id" in payload)) {
    throw new Error("payload inválido: relatorio_id é obrigatório");
  }
  const p = payload as Record<string, unknown>;
  if (typeof p.relatorio_id !== "string" || !p.relatorio_id.trim()) {
    throw new Error("relatorio_id deve ser uma string não vazia");
  }
  if (typeof p.status !== "string" || !p.status.trim()) {
    throw new Error("status é obrigatório");
  }

  // dados_minuta é aceito em qualquer status — deve ser objeto se presente
  const dados_minuta =
    p.dados_minuta != null && typeof p.dados_minuta === "object" && !Array.isArray(p.dados_minuta)
      ? (p.dados_minuta as Record<string, unknown>)
      : undefined;

  // URLs de arquivo enviadas como string no JSON (N8N pode mandar URL já hospedada)
  // Aceita: relatorio_pdf, relatorio_doc, relatorio_docx, arquivo_pdf, arquivo_doc, arquivo_word
  const relatorio_pdf_url = (
    typeof p.relatorio_pdf === "string" ? p.relatorio_pdf :
    typeof p.arquivo_pdf === "string" ? p.arquivo_pdf :
    null
  ) || undefined;

  const relatorio_doc_url = (
    typeof p.relatorio_doc === "string" ? p.relatorio_doc :
    typeof p.relatorio_docx === "string" ? p.relatorio_docx :
    typeof p.arquivo_doc === "string" ? p.arquivo_doc :
    typeof p.arquivo_word === "string" ? p.arquivo_word :
    null
  ) || undefined;

  const status = (p.status as string).toLowerCase();

  if (status === "concluido") {
    return {
      relatorio_id: (p.relatorio_id as string).trim(),
      status: "concluido",
      dados_minuta,
      resumo: p.resumo as object | undefined,
      relatorio_pdf_url,
      relatorio_doc_url,
    };
  }

  if (status === "error" || status === "incompleto") {
    const campos = p.campos_pendentes;
    // campos_pendentes é opcional quando dados_minuta está presente
    return {
      relatorio_id: (p.relatorio_id as string).trim(),
      status: p.status as string,
      dados_minuta,
      campos_pendentes: Array.isArray(campos) ? (campos as string[]) : undefined,
      mensagens_erro: Array.isArray(p.mensagens_erro) ? (p.mensagens_erro as string[]) : undefined,
      mensagens_alerta: Array.isArray(p.mensagens_alerta) ? (p.mensagens_alerta as string[]) : undefined,
      relatorio_pdf_url,
      relatorio_doc_url,
    };
  }

  throw new Error('status deve ser "concluido", "ERROR", "error" ou "incompleto"');
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Supabase não configurado (NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY)." },
        { status: 503 }
      );
    }

    const supabase = getSupabaseAdmin();

    const contentType = request.headers.get("content-type") || "";
    let payload: ReturnType<typeof parsePayload>;
    let file: File | null = null;
    let docFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const payloadRaw = formData.get("payload");
      if (!payloadRaw || typeof payloadRaw !== "string") {
        return NextResponse.json(
          { error: "Campo 'payload' (JSON string) é obrigatório no multipart" },
          { status: 400 }
        );
      }
      try {
        payload = parsePayload(JSON.parse(payloadRaw));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "payload inválido";
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      // Itera todos os campos do form e classifica arquivos por MIME type automaticamente.
      // Isso garante compatibilidade independente do nome do campo usado pelo N8N.
      const allEntries = Array.from(formData.entries());
      console.log("📋 Campos recebidos no multipart:", allEntries.map(([k, v]) =>
        v instanceof File ? `${k}: File(${v.name}, ${v.type}, ${v.size}b)` : `${k}: string`
      ));

      for (const [, value] of allEntries) {
        if (!(value instanceof File) || value.size === 0) continue;

        const mime = value.type.toLowerCase();
        const nameLower = value.name.toLowerCase();

        const isPdf = mime.includes("pdf") || nameLower.endsWith(".pdf");
        const isDoc =
          mime.includes("msword") ||
          mime.includes("wordprocessingml") ||
          mime.includes("openxmlformats") ||
          nameLower.endsWith(".doc") ||
          nameLower.endsWith(".docx");

        if (isPdf && !file) {
          file = value;
        } else if (isDoc && !docFile) {
          docFile = value;
        }
      }

      // Fallback: se a classificação automática não encontrou nada, usa nomes de campo convencionais
      if (!file) {
        const filePart = formData.get("file");
        if (filePart instanceof File && filePart.size > 0) file = filePart;
      }
      if (!docFile) {
        for (const fieldName of ["doc_file", "arquivo_word", "file_doc", "word_file", "docx_file"]) {
          const part = formData.get(fieldName);
          if (part instanceof File && part.size > 0) {
            docFile = part;
            break;
          }
        }
      }

      console.log("📎 Arquivos identificados:", {
        pdf: file ? `${file.name} (${file.type}, ${file.size}b)` : "nenhum",
        doc: docFile ? `${docFile.name} (${docFile.type}, ${docFile.size}b)` : "nenhum",
      });
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      payload = parsePayload(body);
    } else {
      return NextResponse.json(
        { error: "Content-Type deve ser application/json ou multipart/form-data" },
        { status: 400 }
      );
    }

    const { relatorio_id, status } = payload;

    const { data: relatorioExistente, error: fetchError } = await supabase
      .from("relatorios_ia")
      .select("id, status, resumo")
      .eq("id", relatorio_id)
      .single();

    if (fetchError || !relatorioExistente) {
      console.warn("❌ Relatório não encontrado no callback minuta-resultado:", {
        relatorio_id,
        fetchError: fetchError?.message,
        code: fetchError?.code,
      });
      return NextResponse.json(
        {
          error: "Relatório não encontrado",
          relatorio_id_recebido: relatorio_id,
          detalhe: fetchError?.code === "PGRST116"
            ? "Nenhuma linha com esse id na tabela relatorios_ia. Confira no N8N se o relatorio_id vem de $('Webhook').first().json.body.relatorio_id (ou .json.relatorio_id conforme a estrutura do nó Webhook)."
            : fetchError?.message,
        },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const isConcluido = payload.status === "concluido";

    // dados_minuta é salvo em qualquer status quando presente
    if (payload.dados_minuta && typeof payload.dados_minuta === "object") {
      updates.dados_minuta = payload.dados_minuta;
    }

    if (isConcluido) {
      updates.status = "concluido";
      if (payload.resumo && typeof payload.resumo === "object") {
        const resumoAtual = (relatorioExistente.resumo as object) || {};
        updates.resumo = { ...resumoAtual, ...payload.resumo };
      }
    } else {
      updates.status = "analise_incompleta";
      const resumoAtual = (relatorioExistente.resumo as Record<string, unknown>) || {};
      updates.resumo = {
        ...resumoAtual,
        requer_preenchimento: true,
        ...(payload.campos_pendentes?.length && { campos_pendentes: payload.campos_pendentes }),
        ...(payload.mensagens_erro?.length && { mensagens_erro: payload.mensagens_erro }),
        ...(payload.mensagens_alerta?.length && { mensagens_alerta: payload.mensagens_alerta }),
      };
    }

    // URLs passadas diretamente no JSON (N8N pode enviar URL já hospedada em vez de binário)
    if (payload.relatorio_pdf_url) updates.relatorio_pdf = payload.relatorio_pdf_url;
    if (payload.relatorio_doc_url) updates.relatorio_doc = payload.relatorio_doc_url;

    // PDF binário: mesmo tratamento para completo ou incompleto — sempre disponibilizado ao usuário
    // Arquivo binário tem prioridade sobre URL no JSON
    if (file) {
      try {
        const timestamp = Date.now();
        const ext = file.name.split(".").pop() || "pdf";
        const fileName = `minuta-${relatorio_id}-${timestamp}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("documentos-ia")
          .upload(fileName, file, {
            contentType: file.type || "application/pdf",
            upsert: false,
          });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from("documentos-ia")
          .getPublicUrl(fileName);
        updates.relatorio_pdf = publicUrl;
      } catch (uploadError) {
        console.error("❌ Erro no upload do PDF da minuta:", uploadError);
        const resumoAtual = (updates.resumo as Record<string, unknown>) || {};
        updates.resumo = {
          ...resumoAtual,
          error_upload_pdf: "Falha no upload do PDF; o restante foi registrado.",
        };
      }
    }

    // DOC binário: disponibilizado ao usuário para edição
    if (docFile) {
      try {
        const timestamp = Date.now();
        const ext = docFile.name.split(".").pop() || "doc";
        const fileName = `minuta-doc-${relatorio_id}-${timestamp}.${ext}`;
        console.log("📤 Iniciando upload do DOC:", { fileName, size: docFile.size, type: docFile.type });
        const { error: uploadError } = await supabase.storage
          .from("documentos-ia")
          .upload(fileName, docFile, {
            contentType: docFile.type || "application/msword",
            upsert: true,
          });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from("documentos-ia")
          .getPublicUrl(fileName);
        console.log("✅ DOC enviado ao Storage:", publicUrl);
        updates.relatorio_doc = publicUrl;
      } catch (uploadError) {
        console.error("❌ Erro no upload do DOC da minuta:", uploadError);
        const resumoAtual = (updates.resumo as Record<string, unknown>) || {};
        updates.resumo = {
          ...resumoAtual,
          error_upload_doc: uploadError instanceof Error ? uploadError.message : "Falha no upload do DOC",
        };
      }
    }

    // Atualização resiliente para ambientes com schema legado
    let updatePayload: Record<string, unknown> = { ...updates };
    let updated: any = null;
    let updateError: any = null;

    console.log("📝 updatePayload antes do loop:", {
      relatorio_id,
      status: updatePayload.status,
      relatorio_pdf: updatePayload.relatorio_pdf ? "✅ preenchido" : "❌ vazio",
      relatorio_doc: updatePayload.relatorio_doc ? "✅ preenchido" : "❌ vazio",
      campos: Object.keys(updatePayload),
    });

    for (let attempt = 1; attempt <= 4; attempt++) {
      console.log(`🔄 Tentativa ${attempt} de update — campos: ${Object.keys(updatePayload).join(", ")}`);
      const result = await supabase
        .from("relatorios_ia")
        .update(updatePayload)
        .eq("id", relatorio_id)
        .select()
        .single();

      updated = result.data;
      updateError = result.error;
      if (!updateError) {
        console.log("✅ Update OK — relatorio_doc no banco:", updated?.relatorio_doc ?? "null/undefined");
        break;
      }
      console.warn(`⚠️ Erro na tentativa ${attempt}:`, updateError?.message);

      const message = String(updateError.message || "");
      const details = String(updateError.details || "");
      const combined = `${message} ${details}`.toLowerCase();

      // Tabelas antigas podem não ter updated_at
      if (combined.includes("updated_at") && "updated_at" in updatePayload) {
        const { updated_at, ...rest } = updatePayload as any;
        updatePayload = rest;
        continue;
      }

      // Tabelas antigas podem não ter resumo
      if (combined.includes("resumo") && "resumo" in updatePayload) {
        const { resumo, ...rest } = updatePayload as any;
        updatePayload = rest;
        continue;
      }

      // Schema antigo pode não ter relatorio_pdf
      if (combined.includes("relatorio_pdf") && "relatorio_pdf" in updatePayload) {
        const { relatorio_pdf, ...rest } = updatePayload as any;
        updatePayload = rest;
        continue;
      }

      // Schema antigo pode não ter relatorio_doc
      if (combined.includes("relatorio_doc") && "relatorio_doc" in updatePayload) {
        const { relatorio_doc, ...rest } = updatePayload as any;
        updatePayload = rest;
        continue;
      }

      // Schema antigo pode não ter dados_minuta
      if (combined.includes("dados_minuta") && "dados_minuta" in updatePayload) {
        const { dados_minuta, ...rest } = updatePayload as any;
        updatePayload = rest;
        continue;
      }

      // Constraint legado pode não aceitar analise_incompleta
      if (
        updatePayload.status === "analise_incompleta" &&
        (updateError.code === "23514" ||
          combined.includes("violates check constraint") ||
          combined.includes("relatorios_ia_status_check"))
      ) {
        updatePayload = { ...updatePayload, status: "erro" };
        continue;
      }

      break;
    }

    if (updateError || !updated) {
      console.error("❌ Erro ao atualizar relatório:", {
        relatorio_id,
        updatePayload,
        updateError,
      });
      return NextResponse.json(
        {
          error: "Erro ao atualizar relatório no banco de dados",
          relatorio_id_recebido: relatorio_id,
          details: updateError?.message || "Erro desconhecido",
          code: updateError?.code,
          hint:
            updateError?.code === "23514"
              ? "Constraint de status pode estar antiga. Execute add-analise-incompleta-status.sql."
              : "Se faltar coluna, execute os scripts de estrutura: add-updated-at-relatorios-ia.sql e fix-relatorios-ia-table.sql.",
        },
        { status: 500 }
      );
    }

    // Usa dados reais do banco para garantir que o que foi salvo é o que é reportado
    const pdfSalvo = updated?.relatorio_pdf ?? null;
    const docSalvo = updated?.relatorio_doc ?? null;

    // Alerta se o arquivo foi recebido mas não foi salvo
    if (file && !pdfSalvo) {
      console.error("⚠️ PDF recebido mas relatorio_pdf está null no banco após update!");
    }
    if (docFile && !docSalvo) {
      console.error("⚠️ DOC recebido mas relatorio_doc está null no banco após update! updates.relatorio_doc era:", updates.relatorio_doc);
    }

    console.log("✅ Minuta resultado processado:", {
      relatorio_id,
      status: updates.status,
      pdf_no_banco: pdfSalvo ? "✅" : "❌",
      doc_no_banco: docSalvo ? "✅" : "❌",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: isConcluido
        ? "Minuta concluída registrada com sucesso"
        : "Campos pendentes registrados com sucesso",
      data: {
        relatorio_id: updated.id,
        status: updates.status,
        requer_preenchimento: !isConcluido,
        arquivos_recebidos: {
          pdf: pdfSalvo ? (file ? `salvo: ${file.name}` : `url: ${pdfSalvo}`) : (file ? "ERRO: arquivo recebido mas NÃO salvo" : null),
          doc: docSalvo ? (docFile ? `salvo: ${docFile.name}` : `url: ${docSalvo}`) : (docFile ? "ERRO: arquivo recebido mas NÃO salvo" : null),
        },
      },
    });
  } catch (error) {
    console.error("❌ Erro no endpoint minuta-resultado:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

/** GET para documentação, saúde do endpoint e diagnóstico de relatório.
 *  ?relatorio_id=<id>  → retorna os campos de arquivo do relatório no banco.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const relatorioId = searchParams.get("relatorio_id");

  if (relatorioId) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("relatorios_ia")
        .select("id, status, relatorio_pdf, relatorio_doc, arquivo_resultado, updated_at")
        .eq("id", relatorioId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Relatório não encontrado", relatorio_id: relatorioId }, { status: 404 });
      }

      return NextResponse.json({
        relatorio_id: data.id,
        status: data.status,
        updated_at: data.updated_at,
        arquivos: {
          relatorio_pdf: data.relatorio_pdf || null,
          relatorio_doc: data.relatorio_doc || null,
          arquivo_resultado: data.arquivo_resultado || null,
        },
        popup_download_ativo: !!(data.relatorio_pdf && data.relatorio_doc),
      });
    } catch {
      return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    message: "Endpoint de resultado de minuta de documento (unificado)",
    endpoint: "/api/ia/minuta-resultado",
    diagnostico: "Passe ?relatorio_id=<id> para verificar arquivos de um relatório específico",
    method: "POST",
    content_types: ["application/json", "multipart/form-data"],
    payload_format: {
      relatorio_id: "string (obrigatório)",
      status: '"concluido" | "ERROR" | "error" | "incompleto"',
      dados_minuta: "object (opcional)",
      concluido: { resumo: "object (opcional)" },
      incompleto: {
        campos_pendentes: "string[] (opcional quando dados_minuta presente)",
        mensagens_erro: "string[] (opcional)",
        mensagens_alerta: "string[] (opcional)",
      },
      arquivos_json: "relatorio_pdf | relatorio_doc | relatorio_docx | arquivo_doc | arquivo_word (URLs como string no JSON)",
      arquivos_multipart: "campo 'file' (PDF binário) e/ou qualquer campo com arquivo .doc/.docx (detectado por MIME type automaticamente)",
    },
    timestamp: new Date().toISOString(),
  });
}
