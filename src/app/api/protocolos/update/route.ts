import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth-helpers";
import { canAlterarStatusProtocolo } from "@/lib/protocolo-permissoes";

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

/**
 * Atualiza protocolo via service role para contornar falha de RLS
 * no trigger de notificações (INSERT em notificacoes para outro usuário).
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { id, updates } = body as {
      id?: string;
      updates?: Record<string, unknown>;
    };

    if (!id) {
      return NextResponse.json(
        { error: "ID do protocolo é obrigatório." },
        { status: 400 }
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Nenhum dado para atualizar." },
        { status: 400 }
      );
    }

    const adminSupabase = getAdminClient();

    const { data: protocoloAtual, error: fetchError } = await adminSupabase
      .from("protocolos")
      .select("id, cartorio_id, status, responsavel_servico_id")
      .eq("id", id)
      .single();

    if (fetchError || !protocoloAtual) {
      return NextResponse.json(
        { error: "Protocolo não encontrado." },
        { status: 404 }
      );
    }

    const isSuperAdmin = authResult.userType === "admin_geral";
    const callerCartorio = authResult.profile?.cartorio_id as string | null;

    if (!isSuperAdmin) {
      if (!callerCartorio || callerCartorio !== protocoloAtual.cartorio_id) {
        return NextResponse.json(
          { error: "Você não tem permissão para atualizar este protocolo." },
          { status: 403 }
        );
      }
    }

    // Admin: qualquer protocolo. Atendente: só se for o responsável.
    if (
      updates.status !== undefined &&
      updates.status !== protocoloAtual.status
    ) {
      const permitido = canAlterarStatusProtocolo({
        userId: authResult.id,
        userType: authResult.userType,
        userRoles: authResult.userRoles,
        responsavelServicoId: protocoloAtual.responsavel_servico_id,
      });
      if (!permitido) {
        return NextResponse.json(
          {
            error:
              "Você só pode alterar o status de protocolos em que é o responsável.",
          },
          { status: 403 }
        );
      }
    }

    const allowedKeys = new Set([
      "status",
      "observacao",
      "data_conclusao",
      "demanda",
      "solicitante",
      "cpf_cnpj",
      "telefone",
      "email",
      "apresentante",
      "servicos",
      "prazo_execucao",
      "prazo_iniciado_em",
      "responsavel_servico_id",
      "entidade_id",
      "created_at",
    ]);

    const safeUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedKeys.has(key)) {
        safeUpdates[key] = value;
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo válido para atualizar." },
        { status: 400 }
      );
    }

    const { data, error } = await adminSupabase
      .from("protocolos")
      .update(safeUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[protocolos/update] Erro ao atualizar:", error);
      return NextResponse.json(
        {
          error: error.message || "Erro ao atualizar protocolo.",
          code: error.code,
          details: error.details,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ protocolo: data }, { status: 200 });
  } catch (err: any) {
    console.error("[protocolos/update] Erro inesperado:", err);
    return NextResponse.json(
      { error: err?.message || "Erro inesperado." },
      { status: 500 }
    );
  }
}
