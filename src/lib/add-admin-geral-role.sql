-- =====================================================
-- Permissões: adicionar papel "admin_geral" (Super Adm)
-- =====================================================
-- Objetivo:
-- 1) Permitir admin_geral no campo role (legado)
-- 2) Permitir admin_geral no array roles (modelo atual)
-- 3) Garantir coluna roles e normalização básica

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'roles'
  ) THEN
    ALTER TABLE public.users ADD COLUMN roles text[] DEFAULT '{}';
  END IF;
END $$;

-- Preenche roles quando estiver vazio, usando o role legado
UPDATE public.users
SET roles = ARRAY[role]::text[]
WHERE (roles IS NULL OR roles = '{}')
  AND role IS NOT NULL
  AND role <> '';

-- Garante ao menos atendente em registros sem role/roles
UPDATE public.users
SET roles = ARRAY['atendente']::text[]
WHERE roles IS NULL OR array_length(roles, 1) IS NULL;

-- Atualiza constraint de role legado
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (
    role IS NULL
    OR role IN ('admin_geral', 'admin', 'atendente', 'financeiro')
  );

-- Atualiza constraint do array de roles (se já existir, recria)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_roles_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_roles_check
  CHECK (
    roles IS NULL
    OR roles <@ ARRAY['admin_geral', 'admin', 'atendente', 'financeiro']::text[]
  );
