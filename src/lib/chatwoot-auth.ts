import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createSupabaseWithUserJwt } from "@/lib/supabase-with-user-jwt";

export interface ResolvedCartorio {
  userId: string;
  cartorioId: string;
  accessToken: string;
}

/**
 * Autentica o usuário pelo header Authorization e resolve o cartorio_id dele.
 * Retorna NextResponse em caso de erro (401/403/500), pronto para `return`.
 */
export async function resolveCartorioFromRequest(
  request: NextRequest
): Promise<ResolvedCartorio | NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Não autorizado. Autenticação necessária." },
      { status: 401 }
    );
  }

  const accessToken = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return NextResponse.json(
      { error: "Não autorizado. Sessão inválida." },
      { status: 401 }
    );
  }

  const db = createSupabaseWithUserJwt(accessToken);
  const { data, error } = await db
    .from("users")
    .select("cartorio_id")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Erro ao obter o cartório do usuário." },
      { status: 500 }
    );
  }

  const cartorioId = (data as { cartorio_id?: string | null })?.cartorio_id;
  if (!cartorioId) {
    return NextResponse.json(
      { error: "Usuário sem cartório vinculado." },
      { status: 403 }
    );
  }

  return { userId: user.id, cartorioId, accessToken };
}
