import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import { getChatwootConfig, getContact, updateContact } from "@/lib/chatwoot";

/** GET /api/chatwoot/contacts/{id} -> detalhes do contato */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const config = await getChatwootConfig(auth.cartorioId);
    const contact = await getContact(config, id);
    return NextResponse.json({ contact });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao carregar contato." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/chatwoot/contacts/{id}
 * Body: { name?, email?, phone_number? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const payload: {
      name?: string;
      email?: string | null;
      phone_number?: string | null;
    } = {};
    if (typeof body?.name === "string") payload.name = body.name.trim();
    if (typeof body?.email === "string") payload.email = body.email.trim() || null;
    if (typeof body?.phone_number === "string")
      payload.phone_number = body.phone_number.trim() || null;

    const config = await getChatwootConfig(auth.cartorioId);
    const contact = await updateContact(config, id, payload);
    return NextResponse.json({ contact });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao atualizar contato." },
      { status: 500 }
    );
  }
}
