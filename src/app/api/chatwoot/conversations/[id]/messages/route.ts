import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import {
  getChatwootConfig,
  getMessages,
  sendMessage,
  sendMessageMultipart,
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
    const config = await getChatwootConfig(auth.cartorioId);
    const contentType = request.headers.get("content-type") || "";

    let message;

    if (contentType.includes("multipart/form-data")) {
      // Envio com anexos.
      const inForm = await request.formData();
      const content = String(inForm.get("content") || "").trim();
      const isPrivate = String(inForm.get("private") || "") === "true";
      const files = inForm
        .getAll("attachments")
        .filter((f): f is File => f instanceof File);

      if (!content && files.length === 0) {
        return NextResponse.json(
          { error: "Informe um texto ou ao menos um anexo." },
          { status: 400 }
        );
      }

      const outForm = new FormData();
      if (content) outForm.append("content", content);
      outForm.append("message_type", "outgoing");
      if (isPrivate) outForm.append("private", "true");
      for (const f of files) outForm.append("attachments[]", f, f.name);

      message = await sendMessageMultipart(config, id, outForm);
    } else {
      // Envio só de texto (eventualmente como nota privada).
      const body = await request.json().catch(() => ({}));
      const content =
        typeof body?.content === "string" ? body.content.trim() : "";
      const isPrivate = body?.private === true;

      if (!content) {
        return NextResponse.json(
          { error: "Campo 'content' é obrigatório." },
          { status: 400 }
        );
      }

      message = await sendMessage(config, id, content, { isPrivate });
    }

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
