import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth-helpers";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados."
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { id, updates } = body as {
      id: string;
      updates: {
        nome?: string;
        cnpj?: string;
        email?: string;
        telefone?: string;
        endereco?: string;
        ativo?: boolean;
      };
    };

    if (!id) {
      return NextResponse.json({ error: "ID do cartório é obrigatório." }, { status: 400 });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nenhum dado para atualizar." }, { status: 400 });
    }

    const adminSupabase = getAdminClient();

    const { data: cartorio, error } = await adminSupabase
      .from("cartorios")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[editar-cartorio] Erro ao atualizar cartório:", error);
      return NextResponse.json(
        { error: error.message || "Erro ao atualizar cartório." },
        { status: 500 }
      );
    }

    return NextResponse.json({ cartorio }, { status: 200 });
  } catch (err: any) {
    console.error("[editar-cartorio] Erro inesperado:", err);
    return NextResponse.json(
      { error: err?.message || "Erro inesperado." },
      { status: 500 }
    );
  }
}
