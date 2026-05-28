import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import {
  getChatwootConfig,
  getMessages,
  sendMessage,
  upsertMessageCache,
} from "@/lib/chatwoot";

/**
 * GET  /api/chatwoot/conversations/{id}/messages  -> histórico da conversa
 * POST /api/chatwoot/conversations/{id}/messages  -> envia mensagem (outgoing)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const config = await getChatwootConfig(auth.cartorioId);
    const messages = await getMessages(config, id);
    return NextResponse.json({ messages });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao carregar mensagens." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json(
        { error: "Campo 'content' é obrigatório." },
        { status: 400 }
      );
    }

    const config = await getChatwootConfig(auth.cartorioId);
    const message = await sendMessage(config, id, content);

    // Upsert no cache para dedupe com o webhook (não bloqueia a resposta).
    await upsertMessageCache(auth.cartorioId, id, message);

    return NextResponse.json({ message });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao enviar mensagem." },
      { status: 500 }
    );
  }
}
