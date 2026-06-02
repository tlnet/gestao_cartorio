import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import {
  renameInstance,
  getCartorioUazapi,
  updateCartorioUazapi,
} from "@/lib/uazapi";

/**
 * POST /api/uazapi/rename  Body: { name: string }
 * Renomeia a instância/canal (rótulo). Não afeta o token nem a conexão.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => ({}));
    const name =
      typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }

    const cart = await getCartorioUazapi(auth.cartorioId);
    if (!cart.uazapi_instance_token) {
      return NextResponse.json(
        { error: "Nenhuma instância criada ainda." },
        { status: 400 }
      );
    }

    await renameInstance(cart.uazapi_instance_token, name);
    await updateCartorioUazapi(auth.cartorioId, { uazapi_instance_name: name });

    return NextResponse.json({ ok: true, name });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao renomear instância." },
      { status: 500 }
    );
  }
}
