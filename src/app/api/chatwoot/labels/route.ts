import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import { getChatwootConfig, listLabels, createLabel } from "@/lib/chatwoot";

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

/**
 * POST /api/chatwoot/labels -> cria uma etiqueta na conta
 * Body: { title, description?, color?, show_on_sidebar? }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { error: "Informe o nome da etiqueta." },
        { status: 400 }
      );
    }

    const config = await getChatwootConfig(auth.cartorioId);
    const label = await createLabel(config, {
      title,
      description:
        typeof body?.description === "string" ? body.description.trim() : null,
      color: typeof body?.color === "string" ? body.color.trim() : null,
      showOnSidebar: body?.show_on_sidebar !== false,
    });
    return NextResponse.json({ label });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao criar etiqueta." },
      { status: 500 }
    );
  }
}
