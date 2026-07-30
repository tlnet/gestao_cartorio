import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import { getChatwootConfig, markConversationUnread } from "@/lib/chatwoot";

/**
 * POST /api/chatwoot/conversations/{id}/unread -> marca a conversa como não lida.
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
    await markConversationUnread(config, id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao marcar conversa como não lida." },
      { status: 500 }
    );
  }
}
