import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import { getChatwootConfig, setConversationStatus } from "@/lib/chatwoot";

/**
 * POST /api/chatwoot/conversations/{id}/status
 * Body: { status: "open" | "resolved" | "pending" | "snoozed", snoozed_until?: number }
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
    const status = body?.status as
      | "open"
      | "resolved"
      | "pending"
      | "snoozed"
      | undefined;

    if (!status || !["open", "resolved", "pending", "snoozed"].includes(status)) {
      return NextResponse.json(
        { error: "Status inválido." },
        { status: 400 }
      );
    }

    const config = await getChatwootConfig(auth.cartorioId);
    await setConversationStatus(
      config,
      id,
      status,
      typeof body?.snoozed_until === "number" ? body.snoozed_until : null
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao alterar status." },
      { status: 500 }
    );
  }
}
