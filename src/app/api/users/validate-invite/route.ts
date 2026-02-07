import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    // Extrair token da query string
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    // Validar se token foi fornecido
    if (!token) {
      return NextResponse.json(
        {
          valid: false,
          reason: "missing_token",
          message: "Token não fornecido",
        },
        { status: 400 }
      );
    }

    // Buscar usuário pelo token
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(
        "id, name, email, telefone, invite_token, invite_status, invite_expires_at, account_status"
      )
      .eq("invite_token", token)
      .single();

    if (userError || !user) {
      console.log(`[VALIDAÇÃO] Token inválido: ${token}`);
      return NextResponse.json(
        {
          valid: false,
          reason: "invalid_token",
          message: "Token de convite inválido ou não encontrado",
        },
        { status: 404 }
      );
    }

    // Verificar se token já foi usado
    if (user.invite_status !== "pending") {
      console.log(
        `[VALIDAÇÃO] Token já utilizado: ${token} (status: ${user.invite_status})`
      );
      return NextResponse.json(
        {
          valid: false,
          reason: "already_used",
          message: "Este convite já foi utilizado",
          accountStatus: user.account_status,
        },
        { status: 400 }
      );
    }

    // Verificar se token expirou
    const now = new Date();
    const expiresAt = new Date(user.invite_expires_at);

    if (expiresAt < now) {
      console.log(
        `[VALIDAÇÃO] Token expirado: ${token} (expirou em ${expiresAt.toISOString()})`
      );

      // Atualizar status para expired
      await supabase
        .from("users")
        .update({ invite_status: "expired" })
        .eq("id", user.id);

      return NextResponse.json(
        {
          valid: false,
          reason: "expired",
          message: "Este convite expirou. Entre em contato com o administrador",
          expiredAt: expiresAt.toISOString(),
        },
        { status: 400 }
      );
    }

    // Token válido - retornar dados do usuário
    console.log(`[VALIDAÇÃO] Token válido para usuário: ${user.email}`);
    return NextResponse.json(
      {
        valid: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          telefone: user.telefone,
        },
        expiresAt: expiresAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro ao validar token:", error);
    return NextResponse.json(
      {
        valid: false,
        reason: "server_error",
        message: "Erro interno do servidor",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
