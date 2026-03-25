import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Retorna credenciais CNIB do cartório (client id/secret + CPF usuário CNIB).
 * Usado pelo n8n como "etapa 1" (consultar DB).
 *
 * GET /api/cnib/credentials?cartorio_id=<uuid>
 *
 * Resposta: cnib_client_id, cnib_client_secret, cnib_cpf_usuario (11 dígitos ou null)
 *
 * Proteção recomendada:
 *   Authorization: Bearer <CNIB_CREDENTIALS_API_KEY>
 */
export async function GET(request: NextRequest) {
  try {
    const cartorioId = request.nextUrl.searchParams.get("cartorio_id");
    if (!cartorioId) {
      return NextResponse.json(
        { error: "Parâmetro obrigatório: cartorio_id" },
        { status: 400 }
      );
    }

    // Proteção simples por header (evita expor client_secret publicamente)
    const expected = process.env.CNIB_CREDENTIALS_API_KEY;
    if (expected) {
      const auth = request.headers.get("authorization") || "";
      if (auth !== `Bearer ${expected}`) {
        return NextResponse.json(
          { error: "Não autorizado" },
          { status: 401 }
        );
      }
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json(
        { error: "Supabase não configurado (env faltando)" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let { data, error } = await supabaseAdmin
      .from("cartorios")
      .select("cnib_client_id, cnib_client_secret, cnib_cpf_usuario")
      .eq("id", cartorioId)
      .single();

    const errMsg = String(error?.message || "");
    if (
      error &&
      (errMsg.includes("cnib_cpf_usuario") || errMsg.includes("does not exist"))
    ) {
      const retry = await supabaseAdmin
        .from("cartorios")
        .select("cnib_client_id, cnib_client_secret")
        .eq("id", cartorioId)
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao buscar credenciais no banco" },
        { status: 500 }
      );
    }

    const row = data as {
      cnib_client_id?: string | null;
      cnib_client_secret?: string | null;
      cnib_cpf_usuario?: string | null;
    } | null;

    const cpfRaw = row?.cnib_cpf_usuario?.trim() || null;
    const cnib_cpf_usuario = cpfRaw
      ? cpfRaw.replace(/\D/g, "") || null
      : null;

    return NextResponse.json({
      cnib_client_id: row?.cnib_client_id ?? null,
      cnib_client_secret: row?.cnib_client_secret ?? null,
      cnib_cpf_usuario,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro inesperado" },
      { status: 500 }
    );
  }
}

