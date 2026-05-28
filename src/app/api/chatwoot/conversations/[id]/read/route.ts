import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import { getChatwootConfig, markConversationRead } from "@/lib/chatwoot";

/**
 * POST /api/chatwoot/conversations/{id}/read -> marca a conversa como lida
 * (zera o unread_count no Chatwoot).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const config = await getChatwootConfig(auth.cartorioId);
    await markConversationRead(config, id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao marcar conversa como lida." },
      { status: 500 }
    );
  }
}
