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

export async function POST(request: NextRequest) {
  try {
    // Apenas admin_geral pode usar este endpoint
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { cartorio, adminUser } = body as {
      cartorio: {
        nome: string;
        cnpj?: string;
        email: string;
        telefone?: string;
        endereco?: string;
        ativo?: boolean;
      };
      adminUser: {
        name: string;
        email: string;
        telefone: string;
        senha: string;
      };
    };

    if (!cartorio?.nome || !cartorio?.email) {
      return NextResponse.json(
        { error: "Nome e email do cartório são obrigatórios." },
        { status: 400 }
      );
    }

    if (
      !adminUser?.name ||
      !adminUser?.email ||
      !adminUser?.senha ||
      !adminUser?.telefone
    ) {
      return NextResponse.json(
        {
          error:
            "Nome, email, telefone e senha do administrador são obrigatórios.",
        },
        { status: 400 }
      );
    }

    if (adminUser.senha.length < 8) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 8 caracteres." },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    // 1) Criar cartório
    const { data: novoCartorio, error: cartorioError } = await admin
      .from("cartorios")
      .insert({
        nome: cartorio.nome,
        cnpj: cartorio.cnpj || "",
        email: cartorio.email,
        telefone: cartorio.telefone || "",
        endereco: cartorio.endereco || "",
        ativo: cartorio.ativo !== false,
      })
      .select()
      .single();

    if (cartorioError || !novoCartorio) {
      return NextResponse.json(
        {
          error: "Erro ao criar cartório.",
          details: cartorioError?.message,
        },
        { status: 500 }
      );
    }

    // 2) Criar usuário no Supabase Auth com email/senha já confirmados
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: adminUser.email,
        password: adminUser.senha,
        email_confirm: true,
        user_metadata: { name: adminUser.name },
      });

    if (authError || !authData?.user) {
      // Desfaz cartório criado
      await admin.from("cartorios").delete().eq("id", novoCartorio.id);
      return NextResponse.json(
        {
          error:
            authError?.message?.includes("already registered")
              ? "Este email já está em uso no sistema de autenticação."
              : "Erro ao criar usuário administrador.",
          details: authError?.message,
        },
        { status: 500 }
      );
    }

    const authUser = authData.user;

    // 3) Inserir perfil em public.users vinculado ao cartório
    const { error: profileError } = await admin.from("users").insert({
      id: authUser.id,
      name: adminUser.name,
      email: adminUser.email,
      telefone: adminUser.telefone,
      role: "admin",
      roles: ["admin"],
      cartorio_id: novoCartorio.id,
      ativo: true,
      account_status: "active",
    });

    if (profileError) {
      // Desfaz usuário e cartório
      await admin.auth.admin.deleteUser(authUser.id);
      await admin.from("cartorios").delete().eq("id", novoCartorio.id);
      return NextResponse.json(
        {
          error: "Erro ao vincular administrador ao cartório.",
          details: profileError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        cartorio: novoCartorio,
        usuario: {
          id: authUser.id,
          name: adminUser.name,
          email: adminUser.email,
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
