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

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) return authResult;

    // Apenas admin_geral pode criar outros super admins
    if (authResult.userType !== "admin_geral") {
      return NextResponse.json(
        { error: "Apenas um Super Administrador pode criar outros Super Administradores." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, telefone, senha } = body as {
      name: string;
      email: string;
      telefone: string;
      senha: string;
    };

    if (!name || !email || !telefone || !senha) {
      return NextResponse.json(
        { error: "Nome, email, telefone e senha são obrigatórios." },
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

    // Cria no Supabase Auth
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
            ? "Este email já está em uso."
            : "Erro ao criar usuário.",
          details: authError?.message,
        },
        { status: 500 }
      );
    }

    const authUser = authData.user;

    // Insere perfil em public.users sem cartorio_id
    const { error: profileError } = await admin.from("users").insert({
      id: authUser.id,
      name,
      email,
      telefone,
      role: "admin_geral",
      roles: ["admin_geral"],
      cartorio_id: null,
      ativo: true,
      account_status: "active",
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.id);
      return NextResponse.json(
        {
          error: "Erro ao salvar perfil do Super Administrador.",
          details: profileError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        usuario: { id: authUser.id, name, email },
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
