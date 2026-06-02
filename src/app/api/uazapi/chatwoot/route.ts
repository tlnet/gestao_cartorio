import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import { getCartorioUazapi, linkChatwootForCartorio } from "@/lib/uazapi";

/**
 * POST /api/uazapi/chatwoot
 * (Re)vincula a instância WhatsApp ao Chatwoot do cartório — a Uazapi cria/usa
 * a inbox e passa a rotear mensagens nos dois sentidos.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const cart = await getCartorioUazapi(auth.cartorioId);
    if (!cart.uazapi_instance_token) {
      return NextResponse.json(
        { error: "Conecte o WhatsApp antes de vincular ao Chatwoot." },
        { status: 400 }
      );
    }
    if (!cart.chatwoot_account_id || !cart.chatwoot_token) {
      return NextResponse.json(
        { error: "Configure o Chatwoot (account_id e token) antes de vincular." },
        { status: 400 }
      );
    }

    const linked = await linkChatwootForCartorio(cart, cart.uazapi_instance_token);
    return NextResponse.json({ ok: linked });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao vincular ao Chatwoot." },
      { status: 500 }
    );
  }
}
