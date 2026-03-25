import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth-helpers";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function normalizeIds(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((v) => String(v)).filter(Boolean);
  return [];
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const idQuery = searchParams.get("id");

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      // Body opcional (muito cliente não envia body em DELETE)
      body = null;
    }

    const ids = Array.from(
      new Set([
        ...(idQuery ? [idQuery] : []),
        ...normalizeIds(body?.ids),
      ])
    );

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "É necessário informar 'id' (query) ou 'ids' (body)." },
        { status: 400 }
      );
    }

    // Limite para evitar payloads absurdos
    const safeIds = ids.slice(0, 500);

    const admin = getAdminClient();

    // Validar quais relatórios existem e seus status
    const { data: found, error: findError } = await admin
      .from("relatorios_ia")
      .select("id, status")
      .in("id", safeIds);

    if (findError) {
      return NextResponse.json(
        { error: "Erro ao consultar relatorios_ia.", details: findError.message },
        { status: 500 }
      );
    }

    const existingIds = (found || []).map((r: any) => String(r.id));
    const processandoIds = (found || [])
      .filter((r: any) => r.status === "processando")
      .map((r: any) => String(r.id));

    const deletableIds = existingIds.filter((id) => !processandoIds.includes(id));

    // Se quiser garantir que o Admin só apague "já realizadas", bloqueamos processando.
    if (deletableIds.length === 0) {
      return NextResponse.json(
        {
          deletedCount: 0,
          skippedCount: ids.length,
          skippedIds: processandoIds,
          message: "Nenhum relatório deletável (apenas status diferente de 'processando').",
        },
        { status: 200 }
      );
    }

    const { error: deleteError } = await admin
      .from("relatorios_ia")
      .delete()
      .in("id", deletableIds);

    if (deleteError) {
      return NextResponse.json(
        { error: "Erro ao excluir relatorios_ia.", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        deletedCount: deletableIds.length,
        deletedIds: deletableIds,
        skippedCount: Math.max(0, ids.length - deletableIds.length),
        skippedIds: processandoIds,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro interno do servidor.", details: error?.message },
      { status: 500 }
    );
  }
}

