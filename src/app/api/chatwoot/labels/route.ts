import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import { getChatwootConfig, listLabels } from "@/lib/chatwoot";

/** GET /api/chatwoot/labels -> etiquetas disponíveis na conta */
export async function GET(request: NextRequest) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const config = await getChatwootConfig(auth.cartorioId);
    const labels = await listLabels(config);
    return NextResponse.json({ labels });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao listar etiquetas." },
      { status: 500 }
    );
  }
}
