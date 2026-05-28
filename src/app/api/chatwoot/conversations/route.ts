import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import { getChatwootConfig, listConversations } from "@/lib/chatwoot";

/**
 * GET /api/chatwoot/conversations[?status=open]
 * Lista as conversas do cartório do usuário autenticado.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const config = await getChatwootConfig(auth.cartorioId);
    const status = request.nextUrl.searchParams.get("status") || undefined;

    const conversations = await listConversations(config, { status });
    return NextResponse.json({ conversations });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao listar conversas." },
      { status: 500 }
    );
  }
}
