-- =====================================================
-- RLS: acesso global para Super Adm (admin_geral)
-- =====================================================
-- Execute este script APOS add-admin-geral-role.sql
-- para liberar leitura/gestão global em cartorios e users.

CREATE OR REPLACE FUNCTION public.is_admin_geral_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = user_id
      AND (
        u.role = 'admin_geral'
        OR (u.roles IS NOT NULL AND 'admin_geral' = ANY(u.roles))
      )
  );
$$;

-- Boa prática com SECURITY DEFINER
REVOKE ALL ON FUNCTION public.is_admin_geral_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_geral_user(uuid) TO authenticated;

ALTER TABLE public.cartorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Cartórios: Super Adm pode tudo
DROP POLICY IF EXISTS "super_admin_cartorios_select" ON public.cartorios;
CREATE POLICY "super_admin_cartorios_select"
ON public.cartorios
FOR SELECT
USING (public.is_admin_geral_user(auth.uid()));

DROP POLICY IF EXISTS "super_admin_cartorios_insert" ON public.cartorios;
CREATE POLICY "super_admin_cartorios_insert"
ON public.cartorios
FOR INSERT
WITH CHECK (public.is_admin_geral_user(auth.uid()));

DROP POLICY IF EXISTS "super_admin_cartorios_update" ON public.cartorios;
CREATE POLICY "super_admin_cartorios_update"
ON public.cartorios
FOR UPDATE
USING (public.is_admin_geral_user(auth.uid()))
WITH CHECK (public.is_admin_geral_user(auth.uid()));

DROP POLICY IF EXISTS "super_admin_cartorios_delete" ON public.cartorios;
CREATE POLICY "super_admin_cartorios_delete"
ON public.cartorios
FOR DELETE
USING (public.is_admin_geral_user(auth.uid()));

-- Users: Super Adm pode tudo
DROP POLICY IF EXISTS "super_admin_users_select" ON public.users;
CREATE POLICY "super_admin_users_select"
ON public.users
FOR SELECT
USING (public.is_admin_geral_user(auth.uid()));

DROP POLICY IF EXISTS "super_admin_users_insert" ON public.users;
CREATE POLICY "super_admin_users_insert"
ON public.users
FOR INSERT
WITH CHECK (public.is_admin_geral_user(auth.uid()));

DROP POLICY IF EXISTS "super_admin_users_update" ON public.users;
CREATE POLICY "super_admin_users_update"
ON public.users
FOR UPDATE
USING (public.is_admin_geral_user(auth.uid()))
WITH CHECK (public.is_admin_geral_user(auth.uid()));

DROP POLICY IF EXISTS "super_admin_users_delete" ON public.users;
CREATE POLICY "super_admin_users_delete"
ON public.users
FOR DELETE
USING (public.is_admin_geral_user(auth.uid()));
