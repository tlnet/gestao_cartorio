import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import {
  getChatwootConfig,
  normalizePhoneBR,
  findContactByPhone,
  getContactConversations,
  updateContact,
  type ChatwootConfig,
} from "@/lib/chatwoot";
import { getCartorioUazapi, sendText } from "@/lib/uazapi";

/**
 * Espera a conversa aparecer no Chatwoot depois do envio pela Uazapi.
 * A sincronização é assíncrona (Uazapi → webhook → Chatwoot), então damos
 * alguns segundos antes de desistir.
 */
async function waitForConversation(
  config: ChatwootConfig,
  phone: string,
  attempts = 6,
  delayMs = 1200
) {
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, delayMs));

    const contact = await findContactByPhone(config, phone).catch(() => null);
    if (!contact) continue;

    const convs = await getContactConversations(config, contact.id).catch(
      () => []
    );
    const conv = convs.find((c) => c.status !== "resolved") ?? convs[0];
    if (conv) {
      return {
        contactId: contact.id,
        conversationId: conv.id,
        status: conv.status,
      };
    }
  }
  return null;
}

/**
 * POST /api/chatwoot/contacts
 * Body: { name, phone, message, email? }
 *
 * Inicia conversa com quem nunca escreveu. A mensagem sai pela API da Uazapi,
 * não pelo Chatwoot: criar contato e conversa direto no Chatwoot gera um
 * source_id que a ponte WhatsApp não reconhece, e a mensagem volta como
 * "failed". Enviando pela Uazapi, ela mesma registra contato e conversa no
 * Chatwoot — daí em diante o envio pela tela funciona normalmente.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const rawPhone = typeof body?.phone === "string" ? body.phone : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "Informe o nome do contato." },
        { status: 400 }
      );
    }
    if (!message) {
      return NextResponse.json(
        { error: "Informe a primeira mensagem." },
        { status: 400 }
      );
    }

    const phone = normalizePhoneBR(rawPhone);
    if (!phone) {
      return NextResponse.json(
        { error: "Telefone inválido. Informe com DDD, ex.: (11) 98765-4321." },
        { status: 400 }
      );
    }

    const cart = await getCartorioUazapi(auth.cartorioId);
    if (!cart.uazapi_instance_token) {
      return NextResponse.json(
        { error: "Conecte o WhatsApp em Configurações antes de iniciar conversas." },
        { status: 400 }
      );
    }

    // 1. Envia pelo WhatsApp. Se falhar aqui, nada foi criado.
    await sendText(cart.uazapi_instance_token, phone.replace(/\D/g, ""), message);

    // 2. Aguarda a Uazapi registrar contato e conversa no Chatwoot.
    const config = await getChatwootConfig(auth.cartorioId);
    const found = await waitForConversation(config, phone);

    // 3. Ajusta os dados do contato — a Uazapi cria com o nome do WhatsApp
    //    (ou o próprio número), não com o que foi digitado aqui.
    if (found) {
      await updateContact(config, found.contactId, {
        name,
        ...(email ? { email } : {}),
      }).catch(() => {
        // Nome é cosmético: não invalida o envio já realizado.
      });
    }

    return NextResponse.json({
      sent: true,
      phone,
      contactId: found?.contactId ?? null,
      conversationId: found?.conversationId ?? null,
      status: found?.status ?? "open",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao iniciar conversa." },
      { status: 500 }
    );
  }
}
