import { createClient } from "@supabase/supabase-js";

/** Cliente anon com JWT no header — necessário nas API routes para respeitar RLS em `users` e tabelas relacionadas. */
export function createSupabaseWithUserJwt(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}
