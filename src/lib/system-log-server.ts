import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LogCategoria } from "@/lib/system-log";

export interface RegistrarLogServidorInput {
  acao: string;
  categoria: LogCategoria;
  descricao: string;
  usuarioId?: string | null;
  usuarioNome?: string | null;
  usuarioEmail?: string | null;
  usuarioPerfil?: string | null;
  cartorioId?: string | null;
  cartorioNome?: string | null;
  entidade?: string | null;
  entidadeId?: string | null;
  metadata?: Record<string, unknown> | null;
  rota?: string | null;
}

/** IP real por trás do proxy da Vercel. */
export function extrairIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}

/**
 * Grava um log de auditoria usando o client service role.
 *
 * Nunca lança: uma falha de auditoria não pode quebrar a operação que a
 * originou — o erro fica no log do servidor.
 */
export async function registrarLogServidor(
  admin: SupabaseClient<any, any, any>,
  input: RegistrarLogServidorInput,
  request?: NextRequest
): Promise<void> {
  try {
    const { error } = await admin.from("logs_sistema").insert([
      {
        usuario_id: input.usuarioId ?? null,
        usuario_nome: input.usuarioNome ?? null,
        usuario_email: input.usuarioEmail ?? null,
        usuario_perfil: input.usuarioPerfil ?? null,
        cartorio_id: input.cartorioId ?? null,
        cartorio_nome: input.cartorioNome ?? null,
        acao: input.acao,
        categoria: input.categoria,
        descricao: input.descricao,
        entidade: input.entidade ?? null,
        entidade_id: input.entidadeId ?? null,
        metadata: input.metadata ?? null,
        rota: input.rota ?? null,
        ip: request ? extrairIp(request) : null,
        user_agent: request?.headers.get("user-agent") ?? null,
      } as any,
    ]);

    if (error) {
      // 42P01 = tabela inexistente (migração add-logs-sistema.sql pendente)
      console.warn("[logs_sistema] Não foi possível registrar o log:", {
        acao: input.acao,
        code: (error as any)?.code,
        message: error.message,
      });
    }
  } catch (err) {
    console.warn("[logs_sistema] Erro inesperado ao registrar log:", err);
  }
}
