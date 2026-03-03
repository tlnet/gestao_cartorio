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
 * 1) multipart/form-data: campo "payload" (JSON string) + opcional "file" (PDF binário)
 * 2) application/json: body com o mesmo formato (sem arquivo)
 *
 * O binário do PDF pode ser enviado em ambos os cenários (completo ou incompleto).
 * Quando enviado, é sempre armazenado e disponibilizado ao usuário em relatorio_pdf.
 *
 * Formato do payload (JSON):
 * - relatorio_id: string (obrigatório)
 * - status: "concluido" | "ERROR" | "error" | "incompleto"
 *
 * Quando status === "concluido": resumo?: object
 * Quando status === "ERROR" | "error" | "incompleto": campos_pendentes: string[], mensagens_erro?: string[], mensagens_alerta?: string[]
 *
 * Em ambos: envio do arquivo PDF pelo campo "file" (multipart) para exibir ao cliente.
 */

function parsePayload(payload: unknown): {
  relatorio_id: string;
  status: string;
  resumo?: object;
  campos_pendentes?: string[];
  mensagens_erro?: string[];
  mensagens_alerta?: string[];
} {
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
  const status = (p.status as string).toLowerCase();
  if (status === "concluido") {
    return {
      relatorio_id: (p.relatorio_id as string).trim(),
      status: "concluido",
      resumo: p.resumo as object | undefined,
    };
  }
  if (status === "error" || status === "incompleto") {
    const campos = p.campos_pendentes;
    if (!Array.isArray(campos) || campos.length === 0) {
      throw new Error("campos_pendentes é obrigatório e deve ser um array não vazio quando status é incompleto/error");
    }
    return {
      relatorio_id: (p.relatorio_id as string).trim(),
      status: p.status as string,
      campos_pendentes: campos as string[],
      mensagens_erro: Array.isArray(p.mensagens_erro) ? (p.mensagens_erro as string[]) : undefined,
      mensagens_alerta: Array.isArray(p.mensagens_alerta) ? (p.mensagens_alerta as string[]) : undefined,
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
      const filePart = formData.get("file");
      if (filePart instanceof File && filePart.size > 0) {
        file = filePart;
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
        campos_pendentes: payload.campos_pendentes,
        ...(payload.mensagens_erro?.length && { mensagens_erro: payload.mensagens_erro }),
        ...(payload.mensagens_alerta?.length && { mensagens_alerta: payload.mensagens_alerta }),
      };
    }

    // PDF binário: mesmo tratamento para completo ou incompleto — sempre disponibilizado ao usuário
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
          error_upload: "Falha no upload do PDF; o restante foi registrado.",
        };
      }
    }

    // Atualização resiliente para ambientes com schema legado
    let updatePayload: Record<string, unknown> = { ...updates };
    let updated: any = null;
    let updateError: any = null;

    for (let attempt = 1; attempt <= 4; attempt++) {
      const result = await supabase
        .from("relatorios_ia")
        .update(updatePayload)
        .eq("id", relatorio_id)
        .select()
        .single();

      updated = result.data;
      updateError = result.error;
      if (!updateError) break;

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

    console.log("✅ Minuta resultado processado:", {
      relatorio_id,
      status: updates.status,
      com_arquivo: !!file,
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

/** GET para documentação e saúde do endpoint */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Endpoint de resultado de minuta de documento (unificado)",
    endpoint: "/api/ia/minuta-resultado",
    method: "POST",
    content_types: ["application/json", "multipart/form-data"],
    payload_format: {
      relatorio_id: "string (obrigatório)",
      status: '"concluido" | "ERROR" | "error" | "incompleto"',
      concluido: { resumo: "object (opcional)" },
      incompleto: {
        campos_pendentes: "string[] (obrigatório)",
        mensagens_erro: "string[] (opcional)",
        mensagens_alerta: "string[] (opcional)",
      },
      file: "multipart: campo 'file' (PDF, opcional); campo 'payload' = JSON string",
    },
    timestamp: new Date().toISOString(),
  });
}
