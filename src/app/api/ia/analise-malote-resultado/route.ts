import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurado. Necessário para o callback de analise_malote."
    );
  }
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

type StatusNormalized = "concluido" | "erro";

function normalizeStatus(raw: unknown): StatusNormalized {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "erro";
  if (
    ["concluido", "completed", "complete", "success", "sucesso", "done", "ok", "finalizado"].includes(s)
  ) {
    return "concluido";
  }
  if (["erro", "error", "failed", "failure", "falha", "incomplete"].includes(s)) {
    return "erro";
  }
  return "erro";
}

interface ParsedPayload {
  relatorio_id: string;
  status: string;
  resumo?: object;
  resultado_final?: Record<string, unknown>;
  // URLs no JSON (opcional)
  relatorio_pdf_url?: string;
  relatorio_doc_url?: string;
  arquivo_resultado_url?: string;
  // Erro
  error_message?: string;
  erro?: string;
  motivo?: string;
  // Alguns fluxos mandam dados específicos no lugar de resultado_final
  dados_extraidos?: Record<string, unknown>;
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

  const relatorio_pdf_url =
    (typeof p.relatorio_pdf_url === "string" && p.relatorio_pdf_url) ||
    (typeof p.relatorio_pdf === "string" && p.relatorio_pdf) ||
    (typeof p.pdf_url === "string" && p.pdf_url) ||
    undefined;

  const relatorio_doc_url =
    (typeof p.relatorio_doc_url === "string" && p.relatorio_doc_url) ||
    (typeof p.relatorio_doc === "string" && p.relatorio_doc) ||
    (typeof p.doc_url === "string" && p.doc_url) ||
    undefined;

  const arquivo_resultado_url =
    (typeof p.arquivo_resultado_url === "string" && p.arquivo_resultado_url) ||
    (typeof p.arquivo_resultado === "string" && p.arquivo_resultado) ||
    (typeof p.resultado_url === "string" && p.resultado_url) ||
    (typeof p.result_url === "string" && p.result_url) ||
    undefined;

  const resumo = p.resumo && typeof p.resumo === "object" && !Array.isArray(p.resumo) ? (p.resumo as object) : undefined;
  const resultado_final =
    p.resultado_final && typeof p.resultado_final === "object" && !Array.isArray(p.resultado_final)
      ? (p.resultado_final as Record<string, unknown>)
      : undefined;

  const dados_extraidos =
    p.dados_extraidos && typeof p.dados_extraidos === "object" && !Array.isArray(p.dados_extraidos)
      ? (p.dados_extraidos as Record<string, unknown>)
      : undefined;

  return {
    relatorio_id: p.relatorio_id.trim(),
    status: p.status,
    resumo,
    resultado_final,
    dados_extraidos,
    relatorio_pdf_url,
    relatorio_doc_url,
    arquivo_resultado_url,
    error_message:
      typeof p.error_message === "string"
        ? p.error_message
        : typeof p.error === "string"
          ? p.error
          : undefined,
    erro: typeof p.erro === "string" ? p.erro : undefined,
    motivo: typeof p.motivo === "string" ? p.motivo : undefined,
  };
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

    let payload: ParsedPayload;
    let pdfFile: File | null = null;
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

      payload = parsePayload(JSON.parse(payloadRaw));

      const allEntries = Array.from(formData.entries());
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

        if (isPdf && !pdfFile) pdfFile = value;
        if (isDoc && !docFile) docFile = value;
      }

      // fallback: campo file convencional
      if (!pdfFile) {
        const filePart = formData.get("file");
        if (filePart instanceof File && filePart.size > 0) pdfFile = filePart;
      }
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      payload = parsePayload(body);
    } else {
      return NextResponse.json(
        { error: "Content-Type deve ser application/json ou multipart/form-data" },
        { status: 400 }
      );
    }

    const statusNormalized = normalizeStatus(payload.status);

    const updates: Record<string, unknown> = {
      status: statusNormalized,
      updated_at: new Date().toISOString(),
    };

    if (payload.resumo) updates.resumo = payload.resumo;

    if (payload.dados_extraidos && statusNormalized === "concluido") {
      updates.resultado_final = {
        ...(payload.resultado_final || {}),
        dados_extraidos: payload.dados_extraidos,
      };
    } else if (payload.resultado_final) {
      updates.resultado_final = payload.resultado_final;
    }

    if (payload.relatorio_pdf_url && statusNormalized === "concluido") {
      updates.relatorio_pdf = payload.relatorio_pdf_url;
    }
    if (payload.relatorio_doc_url && statusNormalized === "concluido") {
      updates.relatorio_doc = payload.relatorio_doc_url;
    }
    if (payload.arquivo_resultado_url && statusNormalized === "concluido") {
      updates.arquivo_resultado = payload.arquivo_resultado_url;
    }

    if (statusNormalized === "erro") {
      const errMsg = payload.error_message || payload.erro || "Erro no processamento da analise de malote";
      updates.resultado_final = {
        ...(payload.resultado_final || {}),
        erro: errMsg,
        motivo: payload.motivo,
      };
    }

    const relatorioId = payload.relatorio_id;
    if (pdfFile) {
      const timestamp = Date.now();
      const ext = pdfFile.name.split(".").pop() || "pdf";
      const fileName = `analise-malote-${relatorioId}-${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("documentos-ia")
        .upload(fileName, pdfFile, { contentType: pdfFile.type || "application/pdf", upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("documentos-ia").getPublicUrl(fileName);
      updates.relatorio_pdf = publicUrl;
    }

    if (docFile) {
      const timestamp = Date.now();
      const ext = docFile.name.split(".").pop() || "doc";
      const fileName = `analise-malote-doc-${relatorioId}-${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("documentos-ia")
        .upload(fileName, docFile, { contentType: docFile.type || "application/msword", upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("documentos-ia").getPublicUrl(fileName);
      updates.relatorio_doc = publicUrl;
    }

    const { error: updateError } = await supabase
      .from("relatorios_ia")
      .update(updates)
      .eq("id", payload.relatorio_id);

    if (updateError) {
      console.error("Erro ao atualizar relatorio analise_malote:", updateError, {
        relatorio_id: payload.relatorio_id,
      });
      return NextResponse.json(
        { error: "Erro ao atualizar relatório no banco de dados", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        statusNormalized === "concluido"
          ? "Analise de malote concluida registrada com sucesso"
          : "Analise de malote com erro registrada com sucesso",
      data: { relatorio_id: payload.relatorio_id, status: statusNormalized },
    });
  } catch (error) {
    console.error("Erro no endpoint analise-malote-resultado:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Endpoint de resultado da analise de malote funcionando",
    endpoint: "/api/ia/analise-malote-resultado",
  });
}

