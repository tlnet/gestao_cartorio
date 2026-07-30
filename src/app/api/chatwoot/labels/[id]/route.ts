import { NextRequest, NextResponse } from "next/server";
import { resolveCartorioFromRequest } from "@/lib/chatwoot-auth";
import {
  getChatwootConfig,
  listLabels,
  unlinkLabelEverywhere,
  deleteLabel,
} from "@/lib/chatwoot";

/**
 * DELETE /api/chatwoot/labels/{id} -> remove a etiqueta da conta
 *
 * Desvincula a etiqueta das conversas e contatos ANTES de excluí-la: o
 * Chatwoot não faz essa limpeza sozinho e deixaria etiquetas órfãs marcadas
 * nas conversas. A ordem importa — se a varredura falhar, a etiqueta ainda
 * existe e a operação pode ser repetida, sem deixar vínculos quebrados.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCartorioFromRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const config = await getChatwootConfig(auth.cartorioId);

    const label = (await listLabels(config)).find(
      (l) => String(l.id) === String(id)
    );
    if (!label) {
      return NextResponse.json(
        { error: "Etiqueta não encontrada." },
        { status: 404 }
      );
    }

    const swept = await unlinkLabelEverywhere(config, label.title);
    await deleteLabel(config, id);

    return NextResponse.json({
      ok: true,
      title: label.title,
      unlinked: swept,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erro ao excluir etiqueta." },
      { status: 500 }
    );
  }
}
