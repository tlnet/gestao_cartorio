import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import {
  disconnectInstance,
  getCartorioUazapi,
  updateCartorioUazapi,
} from "@/lib/uazapi";

/**
 * POST /api/uazapi/disconnect
 * Desconecta o WhatsApp (mantém a instância criada para reconexão futura).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const cart = await getCartorioUazapi(auth.cartorioId);
    if (!cart.uazapi_instance_token) {
      return NextResponse.json({ ok: true, status: "disconnected" });
    }

    await disconnectInstance(cart.uazapi_instance_token);
    await updateCartorioUazapi(auth.cartorioId, {
      whatsapp_status: "disconnected",
    });

    return NextResponse.json({ ok: true, status: "disconnected" });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao desconectar." },
      { status: 500 }
    );
  }
}
