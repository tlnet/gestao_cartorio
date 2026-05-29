import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import { getChatwootConfig, setConversationMute } from "@/lib/chatwoot";

/**
 * POST /api/chatwoot/conversations/{id}/mute
 * Body: { mute: boolean }  (true = silenciar, false = reativar)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const mute = body?.mute !== false; // default: silenciar

    const config = await getChatwootConfig(auth.cartorioId);
    await setConversationMute(config, id, mute);

    return NextResponse.json({ ok: true, muted: mute });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao silenciar conversa." },
      { status: 500 }
    );
  }
}
