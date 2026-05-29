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
    const pageParam = request.nextUrl.searchParams.get("page");
    const page = pageParam ? Number(pageParam) : undefined;

    const { payload, meta } = await listConversations(config, { status, page });
    return NextResponse.json({ conversations: payload, meta });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao listar conversas." },
      { status: 500 }
    );
  }
}
