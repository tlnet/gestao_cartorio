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
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { error: "ID do usuário é obrigatório." },
        { status: 400 }
      );
    }

    // Não permite deletar o próprio usuário que está fazendo a requisição
    if (authResult.id === userId) {
      return NextResponse.json(
        { error: "Você não pode excluir sua própria conta." },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    // Verifica se o usuário existe e não é admin_geral
    const { data: usuario, error: fetchError } = await admin
      .from("users")
      .select("id, name, email, role, roles")
      .eq("id", userId)
      .single();

    if (fetchError || !usuario) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const roles: string[] = Array.isArray(usuario.roles)
      ? usuario.roles
      : [usuario.role];

    if (roles.includes("admin_geral")) {
      return NextResponse.json(
        { error: "Não é possível excluir um Super Administrador." },
        { status: 403 }
      );
    }

    // 1) Remove de public.users
    const { error: dbError } = await admin
      .from("users")
      .delete()
      .eq("id", userId);

    if (dbError) {
      return NextResponse.json(
        { error: "Erro ao remover usuário do banco.", details: dbError.message },
        { status: 500 }
      );
    }

    // 2) Remove do Supabase Auth
    const { error: authError } = await admin.auth.admin.deleteUser(userId);

    if (authError) {
      // Não reverte o delete do banco — auth pode já não ter o registro
      console.error("[DELETAR-USUARIO] Erro ao remover do Auth:", authError.message);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro interno do servidor.", details: error?.message },
      { status: 500 }
    );
  }
}
