import { supabase } from "@/lib/supabase";

/** Agrupamento das ações na tela de logs do super admin. */
export type LogCategoria =
  | "autenticacao"
  | "protocolo"
  | "usuario"
  | "cartorio"
  | "configuracao"
  | "conta"
  | "sistema";

export const LOG_CATEGORIA_LABEL: Record<LogCategoria, string> = {
  autenticacao: "Autenticação",
  protocolo: "Protocolos",
  usuario: "Usuários",
  cartorio: "Cartórios",
  configuracao: "Configurações",
  conta: "Contas a pagar",
  sistema: "Sistema",
};

export interface LogSistema {
  id: string;
  usuario_id: string | null;
  usuario_nome: string | null;
  usuario_email: string | null;
  usuario_perfil: string | null;
  cartorio_id: string | null;
  cartorio_nome: string | null;
  acao: string;
  categoria: LogCategoria | string;
  descricao: string;
  entidade: string | null;
  entidade_id: string | null;
  metadata: Record<string, unknown> | null;
  rota: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface RegistrarLogInput {
  acao: string;
  categoria: LogCategoria;
  descricao: string;
  entidade?: string | null;
  entidadeId?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Usado quando não há sessão (ex.: falha de login) */
  usuarioEmail?: string | null;
  cartorioId?: string | null;
  /**
   * Token explícito para ações que destroem a sessão (logout) — sem ele a
   * busca da sessão pode acontecer depois do signOut e o log perde o autor.
   */
  accessToken?: string | null;
}

/**
 * Registra uma movimentação do usuário na trilha de auditoria.
 *
 * É "fire and forget" por definição: log é efeito colateral, nunca pode
 * derrubar nem atrasar a ação do usuário. Erros ficam apenas no console.
 */
export function registrarLog(input: RegistrarLogInput): void {
  if (typeof window === "undefined") return;

  void (async () => {
    try {
      let accessToken = input.accessToken ?? undefined;
      if (!accessToken) {
        const { data } = await supabase.auth.getSession();
        accessToken = data.session?.access_token;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      await fetch("/api/logs", {
        method: "POST",
        headers,
        keepalive: true,
        body: JSON.stringify({
          acao: input.acao,
          categoria: input.categoria,
          descricao: input.descricao,
          entidade: input.entidade ?? null,
          entidade_id: input.entidadeId ?? null,
          metadata: input.metadata ?? null,
          usuario_email: input.usuarioEmail ?? null,
          cartorio_id: input.cartorioId ?? null,
          rota: window.location.pathname,
        }),
      });
    } catch (err) {
      console.warn("Falha ao registrar log do sistema:", err);
    }
  })();
}

/** Resume uma alteração comparando o registro anterior com os campos enviados. */
export function descreverAlteracoes(
  anterior: Record<string, any> | null | undefined,
  atualizacoes: Record<string, any> | null | undefined,
  rotulos: Record<string, string> = {}
): { campo: string; de: unknown; para: unknown }[] {
  if (!anterior || !atualizacoes) return [];

  const mudancas: { campo: string; de: unknown; para: unknown }[] = [];
  const normalizar = (v: unknown) =>
    v === undefined || v === "" ? null : Array.isArray(v) ? v.join(", ") : v;

  for (const [campo, valor] of Object.entries(atualizacoes)) {
    const de = normalizar(anterior[campo]);
    const para = normalizar(valor);
    if (JSON.stringify(de) === JSON.stringify(para)) continue;
    mudancas.push({ campo: rotulos[campo] ?? campo, de, para });
  }

  return mudancas;
}
