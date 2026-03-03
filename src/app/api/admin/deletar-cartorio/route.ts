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

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const cartorioId = searchParams.get("id");

    if (!cartorioId) {
      return NextResponse.json(
        { error: "ID do cartório é obrigatório." },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    // Verifica se o cartório existe
    const { data: cartorio, error: fetchError } = await admin
      .from("cartorios")
      .select("id, nome")
      .eq("id", cartorioId)
      .single();

    if (fetchError || !cartorio) {
      return NextResponse.json(
        { error: "Cartório não encontrado." },
        { status: 404 }
      );
    }

    // Busca todos os usuários vinculados ao cartório
    const { data: usuariosVinculados } = await admin
      .from("users")
      .select("id")
      .eq("cartorio_id", cartorioId);

    // Remove cada usuário do Auth antes de deletar do banco
    if (usuariosVinculados && usuariosVinculados.length > 0) {
      for (const u of usuariosVinculados) {
        await admin.auth.admin.deleteUser(u.id);
      }

      // Remove todos os usuários do banco
      await admin.from("users").delete().eq("cartorio_id", cartorioId);
    }

    // Remove o cartório
    const { error: deleteError } = await admin
      .from("cartorios")
      .delete()
      .eq("id", cartorioId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Erro ao remover cartório.", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        usuariosRemovidos: usuariosVinculados?.length ?? 0,
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
