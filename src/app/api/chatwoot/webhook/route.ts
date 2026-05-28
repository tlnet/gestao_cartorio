import { NextRequest, NextResponse } from "next/server";
import { getConfigByAccountId, upsertMessageCache } from "@/lib/chatwoot";

/**
 * POST /api/chatwoot/webhook?secret=<CHATWOOT_WEBHOOK_SECRET>
 *
 * Recebe eventos do Chatwoot (configurar em Settings > Integrations > Webhooks).
 * Trata 'message_created': resolve o cartório por account.id e grava a mensagem
 * em chatwoot_messages para disparar o Realtime na página de Chat.
 */
function messageTypeToNumber(value: unknown): number {
  if (typeof value === "number") return value;
  switch (value) {
    case "incoming":
      return 0;
    case "outgoing":
      return 1;
    default:
      return 2;
  }
}

function toEpochSeconds(value: unknown): number {
  if (typeof value === "number") return value; // já em segundos
  if (typeof value === "string") {
    const ms = Date.parse(value);
    if (!Number.isNaN(ms)) return Math.floor(ms / 1000);
  }
  return Math.floor(Date.now() / 1000);
}

export async function POST(request: NextRequest) {
  try {
    // Proteção por segredo (querystring ou header).
    const expected = process.env.CHATWOOT_WEBHOOK_SECRET;
    if (expected) {
      const provided =
        request.nextUrl.searchParams.get("secret") ||
        request.headers.get("x-chatwoot-secret");
      if (provided !== expected) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    // Só tratamos criação de mensagem nesta primeira versão.
    if (body.event !== "message_created") {
      return NextResponse.json({ ok: true, ignored: body.event });
    }

    const accountId = body?.account?.id;
    const conversationId = body?.conversation?.id;
    const messageId = body?.id;
    if (!accountId || !conversationId || !messageId) {
      return NextResponse.json(
        { ok: true, skipped: "campos obrigatórios ausentes" }
      );
    }

    const config = await getConfigByAccountId(accountId);
    if (!config) {
      // Nenhum cartório usa esse account_id — ignora silenciosamente.
      return NextResponse.json({ ok: true, skipped: "cartório não encontrado" });
    }

    await upsertMessageCache(config.cartorioId, conversationId, {
      id: Number(messageId),
      content: body?.content ?? null,
      message_type: messageTypeToNumber(body?.message_type),
      created_at: toEpochSeconds(body?.created_at),
      sender: body?.sender ? { name: body.sender?.name ?? null } : null,
      attachments: body?.attachments ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[chatwoot/webhook] erro:", e?.message);
    return NextResponse.json(
      { error: e?.message || "Erro no webhook" },
      { status: 500 }
    );
  }
}
