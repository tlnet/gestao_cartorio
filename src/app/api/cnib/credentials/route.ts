import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Retorna apenas as credenciais CNIB do cartório.
 * Usado pelo n8n como "etapa 1" (consultar DB).
 *
 * GET /api/cnib/credentials?cartorio_id=<uuid>
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

    const { data, error } = await supabaseAdmin
      .from("cartorios")
      .select("cnib_client_id, cnib_client_secret")
      .eq("id", cartorioId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao buscar credenciais no banco" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      cnib_client_id: data?.cnib_client_id ?? null,
      cnib_client_secret: data?.cnib_client_secret ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro inesperado" },
      { status: 500 }
    );
  }
}

