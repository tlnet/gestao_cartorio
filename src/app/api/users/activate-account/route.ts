import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Rate limiting simples (em produção, usar Redis ou similar)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetAt) {
    // Resetar contador a cada 10 minutos
    rateLimitMap.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }

  if (limit.count >= 5) {
    return false; // Limite excedido
  }

  limit.count++;
  return true;
}

function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Senha deve ter pelo menos 8 caracteres");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra maiúscula");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra minúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Senha deve conter pelo menos um número");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting baseado em IP
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      console.warn(`[ATIVAÇÃO] Rate limit excedido para IP: ${ip}`);
      return NextResponse.json(
        {
          success: false,
          error: "Muitas tentativas. Tente novamente em 10 minutos",
        },
        { status: 429 }
      );
    }

    // Parsear body da requisição
    const body = await request.json();
    const { token, password } = body;

    // Validar campos obrigatórios
    if (!token || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Token e senha são obrigatórios",
        },
        { status: 400 }
      );
    }

    // Validar força da senha
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Senha não atende aos requisitos",
          details: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    // Buscar usuário pelo token
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(
        "id, email, invite_token, invite_status, invite_expires_at, account_status"
      )
      .eq("invite_token", token)
      .single();

    if (userError || !user) {
      console.error(`[ATIVAÇÃO] Token inválido: ${token}`);
      return NextResponse.json(
        {
          success: false,
          error: "Token de convite inválido",
        },
        { status: 404 }
      );
    }

    // Verificar se token já foi usado
    if (user.invite_status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: "Este convite já foi utilizado",
        },
        { status: 400 }
      );
    }

    // Verificar se token expirou
    const now = new Date();
    const expiresAt = new Date(user.invite_expires_at);

    if (expiresAt < now) {
      await supabase
        .from("users")
        .update({ invite_status: "expired" })
        .eq("id", user.id);

      return NextResponse.json(
        {
          success: false,
          error: "Este convite expirou",
        },
        { status: 400 }
      );
    }

    // Atualizar senha no Supabase Auth usando Admin API
    const { error: authError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: password,
        email_confirm: true, // Confirmar email automaticamente
      }
    );

    if (authError) {
      console.error(
        `[ATIVAÇÃO] Erro ao atualizar senha no Auth para ${user.email}:`,
        authError
      );
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao ativar conta. Tente novamente",
          details: authError.message,
        },
        { status: 500 }
      );
    }

    // Atualizar registro do usuário no banco
    const { error: updateError } = await supabase
      .from("users")
      .update({
        invite_status: "accepted",
        invite_accepted_at: now.toISOString(),
        account_status: "active",
        ativo: true,
        // Opcional: limpar token após uso
        // invite_token: null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error(
        `[ATIVAÇÃO] Erro ao atualizar status do usuário ${user.email}:`,
        updateError
      );
      // Senha já foi definida, mas status não foi atualizado
      // Não retornar erro, pois usuário pode fazer login
      console.warn(
        "[ATIVAÇÃO] Senha definida, mas erro ao atualizar status. Usuário pode fazer login."
      );
    }

    // Log de sucesso
    console.log(`[ATIVAÇÃO] Conta ativada com sucesso: ${user.email}`);

    // Retornar sucesso
    return NextResponse.json(
      {
        success: true,
        message: "Conta ativada com sucesso! Você já pode fazer login",
        user: {
          email: user.email,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro ao ativar conta:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
