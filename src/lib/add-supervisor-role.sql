-- =====================================================
-- Permissões: adicionar papel "supervisor"
-- =====================================================
-- Objetivo:
-- 1) Permitir supervisor no campo role (legado)
-- 2) Permitir supervisor no array roles (modelo atual)
--
-- Supervisor: mesmas funções de atendente, com poder de
-- alterar o status de qualquer protocolo do cartório.

-- Atualiza constraint de role legado
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (
    role IS NULL
    OR role IN ('admin_geral', 'admin', 'supervisor', 'atendente', 'financeiro')
  );

-- Atualiza constraint do array de roles (se já existir, recria)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_roles_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_roles_check
  CHECK (
    roles IS NULL
    OR roles <@ ARRAY['admin_geral', 'admin', 'supervisor', 'atendente', 'financeiro']::text[]
  );
