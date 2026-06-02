import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import {
  createInstance,
  connectInstance,
  getCartorioUazapi,
  updateCartorioUazapi,
  instanceNameForCartorio,
} from "@/lib/uazapi";

/**
 * POST /api/uazapi/connect
 * Cria a instância (se ainda não existir) e inicia a conexão ao WhatsApp,
 * retornando o QR Code para o usuário escanear.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => ({}));
    const desiredName =
      typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";

    const cart = await getCartorioUazapi(auth.cartorioId);
    let token = cart.uazapi_instance_token;

    // Cria a instância na primeira vez.
    if (!token) {
      const name = desiredName || instanceNameForCartorio(auth.cartorioId);
      const created = await createInstance(name);
      token = created.token;
      await updateCartorioUazapi(auth.cartorioId, {
        uazapi_instance_name: created.name,
        uazapi_instance_token: token,
        whatsapp_status: "connecting",
      });
    }

    const result = await connectInstance(token);

    await updateCartorioUazapi(auth.cartorioId, {
      whatsapp_status: result.loggedIn ? "connected" : "connecting",
    });

    return NextResponse.json({
      connected: result.loggedIn,
      status: result.status,
      qrcode: result.loggedIn ? null : result.qrcode,
      paircode: result.paircode,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao conectar WhatsApp." },
      { status: 500 }
    );
  }
}
