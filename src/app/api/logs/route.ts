import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { registrarLogServidor } from "@/lib/system-log-server";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados."
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const CATEGORIAS_VALIDAS = new Set([
  "autenticacao",
  "protocolo",
  "usuario",
  "cartorio",
  "configuracao",
  "conta",
  "sistema",
]);

const MAX_TEXTO = 500;

const truncar = (valor: unknown, limite = MAX_TEXTO): string | null => {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  if (!limpo) return null;
  return limpo.length > limite ? `${limpo.slice(0, limite)}…` : limpo;
};

/**
 * Registra uma movimentação do usuário.
 *
 * A identidade vem sempre do token (nunca do corpo), para que o cliente não
 * consiga forjar logs em nome de outra pessoa. Sem token, só são aceitas ações
 * de autenticação (ex.: tentativa de login que falhou).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const acao = truncar(body.acao, 120);
    const descricao = truncar(body.descricao);
    const categoria = String(body.categoria || "sistema");

    if (!acao || !descricao) {
      return NextResponse.json(
        { error: "Ação e descrição são obrigatórias." },
        { status: 400 }
      );
    }

    if (!CATEGORIAS_VALIDAS.has(categoria)) {
      return NextResponse.json(
        { error: "Categoria inválida." },
        { status: 400 }
      );
    }

    const usuario = await getAuthenticatedUser(request);

    // Sem sessão só passam eventos de autenticação (ex.: login que falhou);
    // qualquer outra ação exigiria um autor, e ele viria do token.
    if (!usuario && (categoria !== "autenticacao" || !acao.startsWith("auth."))) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const admin = getAdminClient();

    await registrarLogServidor(
      admin,
      {
        acao,
        categoria: categoria as any,
        descricao,
        usuarioId: usuario?.id ?? null,
        usuarioNome: usuario?.profile?.name ?? null,
        usuarioEmail: usuario?.email ?? truncar(body.usuario_email, 200),
        usuarioPerfil: usuario?.userRoles?.join(", ") ?? null,
        cartorioId:
          usuario?.profile?.cartorio_id ??
          (typeof body.cartorio_id === "string" ? body.cartorio_id : null),
        entidade: truncar(body.entidade, 80),
        entidadeId: truncar(body.entidade_id, 120),
        metadata:
          body.metadata && typeof body.metadata === "object"
            ? body.metadata
            : null,
        rota: truncar(body.rota, 200),
      },
      request
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    console.error("[logs] Erro ao registrar log:", err);
    return NextResponse.json(
      { error: err?.message || "Erro inesperado." },
      { status: 500 }
    );
  }
}

/** Lista os logs — exclusivo do super administrador. */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getAuthenticatedUser(request);

    if (!usuario) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    if (!usuario.userRoles.includes("admin_geral")) {
      return NextResponse.json(
        { error: "Apenas o super administrador pode consultar os logs." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pagina = Math.max(1, Number(searchParams.get("pagina") || 1));
    const porPagina = Math.min(
      200,
      Math.max(10, Number(searchParams.get("porPagina") || 50))
    );
    const categoria = searchParams.get("categoria");
    const acao = searchParams.get("acao");
    const usuarioId = searchParams.get("usuarioId");
    const cartorioId = searchParams.get("cartorioId");
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");
    const busca = searchParams.get("busca")?.trim();

    const admin = getAdminClient();

    let query = admin
      .from("logs_sistema")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (categoria && categoria !== "todas") query = query.eq("categoria", categoria);
    if (acao && acao !== "todas") query = query.eq("acao", acao);
    if (usuarioId && usuarioId !== "todos") query = query.eq("usuario_id", usuarioId);
    if (cartorioId && cartorioId !== "todos") query = query.eq("cartorio_id", cartorioId);
    if (dataInicio) query = query.gte("created_at", `${dataInicio}T00:00:00.000Z`);
    if (dataFim) query = query.lte("created_at", `${dataFim}T23:59:59.999Z`);

    if (busca) {
      const termo = busca.replace(/[%,]/g, " ");
      query = query.or(
        [
          `descricao.ilike.%${termo}%`,
          `usuario_nome.ilike.%${termo}%`,
          `usuario_email.ilike.%${termo}%`,
          `acao.ilike.%${termo}%`,
          `entidade_id.ilike.%${termo}%`,
        ].join(",")
      );
    }

    const de = (pagina - 1) * porPagina;
    const { data, error, count } = await query.range(de, de + porPagina - 1);

    if (error) {
      // 42P01 = tabela inexistente: migração pendente
      if ((error as any)?.code === "42P01") {
        return NextResponse.json(
          {
            error:
              "A tabela 'logs_sistema' não existe. Execute a migração src/lib/add-logs-sistema.sql no SQL Editor do Supabase.",
            migracaoPendente: true,
          },
          { status: 503 }
        );
      }

      console.error("[logs] Erro ao consultar logs:", error);
      return NextResponse.json(
        { error: error.message || "Erro ao consultar logs." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { logs: data || [], total: count ?? 0, pagina, porPagina },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[logs] Erro inesperado:", err);
    return NextResponse.json(
      { error: err?.message || "Erro inesperado." },
      { status: 500 }
    );
  }
}
