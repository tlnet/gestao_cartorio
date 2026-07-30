-- =====================================================
-- Corrige RLS de INSERT em notificacoes
-- =====================================================
-- Problema:
-- Ao atualizar o status de um protocolo, um trigger tenta
-- inserir notificação para outro usuário (ex.: criador do
-- protocolo). A política atual só permite INSERT quando
-- usuario_id = auth.uid(), o que falha com:
--   42501 new row violates row-level security policy
--   for table "notificacoes"
--
-- A checagem de mesmo cartório usa SECURITY DEFINER para
-- não ser bloqueada pelo RLS da própria tabela users.
--
-- Execute no SQL Editor do Supabase.

CREATE OR REPLACE FUNCTION public.can_notify_user(dest_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    dest_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.users u_actor
      JOIN public.users u_dest ON u_dest.id = dest_user_id
      WHERE u_actor.id = auth.uid()
        AND u_actor.cartorio_id IS NOT NULL
        AND u_actor.cartorio_id = u_dest.cartorio_id
    )
    OR public.is_admin_geral_user(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.can_notify_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_notify_user(uuid) TO authenticated;

DROP POLICY IF EXISTS "insert_notificacoes_mesmo_cartorio" ON public.notificacoes;

CREATE POLICY "insert_notificacoes_mesmo_cartorio"
ON public.notificacoes
FOR INSERT
TO authenticated
WITH CHECK (public.can_notify_user(usuario_id));
