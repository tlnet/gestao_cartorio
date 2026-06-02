import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import {
  getInstanceStatus,
  getCartorioUazapi,
  updateCartorioUazapi,
  linkChatwootForCartorio,
  numeroFromInstance,
} from "@/lib/uazapi";

/**
 * GET /api/uazapi/status
 * Retorna o status atual da conexão. Ao detectar a conexão recém-estabelecida,
 * grava o número e vincula automaticamente ao Chatwoot do cartório.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const cart = await getCartorioUazapi(auth.cartorioId);
    const token = cart.uazapi_instance_token;

    if (!token) {
      return NextResponse.json({
        configured: false,
        connected: false,
        status: "disconnected",
        qrcode: null,
        numero: null,
        chatwootLinked: false,
        name: cart.uazapi_instance_name || null,
      });
    }

    const result = await getInstanceStatus(token);
    let numero = cart.whatsapp_numero;
    let chatwootLinked = false;

    if (result.loggedIn) {
      numero = numeroFromInstance(result.instance) || numero;

      // Transição para conectado: grava e vincula ao Chatwoot uma vez.
      if (cart.whatsapp_status !== "connected") {
        await updateCartorioUazapi(auth.cartorioId, {
          whatsapp_status: "connected",
          whatsapp_numero: numero,
        });
        try {
          chatwootLinked = await linkChatwootForCartorio(cart, token);
        } catch (err) {
          console.error("[uazapi] Falha ao vincular Chatwoot:", err);
        }
      } else {
        chatwootLinked = Boolean(cart.chatwoot_account_id && cart.chatwoot_token);
      }
    } else if (cart.whatsapp_status === "connected") {
      // Caiu a conexão.
      await updateCartorioUazapi(auth.cartorioId, {
        whatsapp_status: "disconnected",
      });
    }

    return NextResponse.json({
      configured: true,
      connected: result.loggedIn,
      status: result.status,
      qrcode: result.loggedIn ? null : result.qrcode,
      paircode: result.paircode,
      numero,
      chatwootLinked,
      name: cart.uazapi_instance_name || result.instance?.name || null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao consultar status." },
      { status: 500 }
    );
  }
}
