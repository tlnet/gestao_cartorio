import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import {
  getChatwootConfig,
  getConversationLabels,
  setConversationLabels,
} from "@/lib/chatwoot";

/** GET  /api/chatwoot/conversations/{id}/labels -> etiquetas da conversa */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const config = await getChatwootConfig(auth.cartorioId);
    const labels = await getConversationLabels(config, id);
    return NextResponse.json({ labels });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao carregar etiquetas." },
      { status: 500 }
    );
  }
}

/** POST /api/chatwoot/conversations/{id}/labels  Body: { labels: string[] } */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const labels = Array.isArray(body?.labels)
      ? body.labels.map((l: unknown) => String(l))
      : [];

    const config = await getChatwootConfig(auth.cartorioId);
    const result = await setConversationLabels(config, id, labels);
    return NextResponse.json({ labels: result });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao salvar etiquetas." },
      { status: 500 }
    );
  }
}
