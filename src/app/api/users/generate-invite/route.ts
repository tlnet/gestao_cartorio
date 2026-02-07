import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth-helpers";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    // Verificar se usuário é administrador
    const adminCheck = await requireAdmin(request);
    if (adminCheck) {
      return adminCheck; // Retorna erro 401 ou 403
    }

    // Parsear body da requisição
    const body = await request.json();
    const { userId } = body;

    // Validar userId
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "userId é obrigatório e deve ser uma string",
        },
        { status: 400 }
      );
    }

    // Verificar se usuário existe
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      console.error("Erro ao buscar usuário:", userError);
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não encontrado",
        },
        { status: 404 }
      );
    }

    // Gerar token UUID único
    const inviteToken = randomUUID();

    // Definir data de expiração (7 dias a partir de agora)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias em milissegundos

    // Atualizar usuário com dados do convite
    const { error: updateError } = await supabase
      .from("users")
      .update({
        invite_token: inviteToken,
        invite_created_at: now.toISOString(),
        invite_expires_at: expiresAt.toISOString(),
        invite_status: "pending",
        account_status: "pending_activation",
        ativo: false, // Usuário fica inativo até ativar o convite
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Erro ao atualizar usuário com token:", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao gerar convite. Tente novamente.",
        },
        { status: 500 }
      );
    }

    // Construir URL completa do convite
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/ativar-conta?token=${inviteToken}`;

    // Log para auditoria
    console.log(`[CONVITE] Token gerado para usuário ${user.email} (${userId})`);
    console.log(
      `[CONVITE] Expira em: ${expiresAt.toISOString()} (7 dias)`
    );

    // Retornar sucesso com URL e dados do convite
    return NextResponse.json(
      {
        success: true,
        inviteUrl,
        expiresAt: expiresAt.toISOString(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro ao gerar convite:", error);
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
