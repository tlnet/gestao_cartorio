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

const ROLES_VALIDOS = ["admin", "financeiro", "atendente"];

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { cartorio_id, name, email, telefone, role, senha } = body as {
      cartorio_id: string;
      name: string;
      email: string;
      telefone: string;
      role: string;
      senha: string;
    };

    if (!cartorio_id || !name || !email || !telefone || !role || !senha) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios." },
        { status: 400 }
      );
    }

    if (!ROLES_VALIDOS.includes(role)) {
      return NextResponse.json(
        { error: `Perfil inválido. Use: ${ROLES_VALIDOS.join(", ")}.` },
        { status: 400 }
      );
    }

    if (senha.length < 8) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 8 caracteres." },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    // Verifica se o cartório existe
    const { data: cartorio, error: cartorioError } = await admin
      .from("cartorios")
      .select("id, nome")
      .eq("id", cartorio_id)
      .single();

    if (cartorioError || !cartorio) {
      return NextResponse.json(
        { error: "Cartório não encontrado." },
        { status: 404 }
      );
    }

    // Cria usuário no Supabase Auth
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { name },
      });

    if (authError || !authData?.user) {
      return NextResponse.json(
        {
          error: authError?.message?.includes("already registered")
            ? "Este email já está em uso no sistema de autenticação."
            : "Erro ao criar usuário.",
          details: authError?.message,
        },
        { status: 500 }
      );
    }

    const authUser = authData.user;

    // Insere perfil em public.users
    const { error: profileError } = await admin.from("users").insert({
      id: authUser.id,
      name,
      email,
      telefone,
      role,
      roles: [role],
      cartorio_id,
      ativo: true,
      account_status: "active",
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.id);
      return NextResponse.json(
        {
          error: "Erro ao vincular usuário ao cartório.",
          details: profileError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        usuario: {
          id: authUser.id,
          name,
          email,
          role,
          cartorio_id,
          cartorioNome: cartorio.nome,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro interno do servidor.", details: error?.message },
      { status: 500 }
    );
  }
}
