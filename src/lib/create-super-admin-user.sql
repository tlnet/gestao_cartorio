-- =====================================================
-- Criação/atualização do usuário Super Adm
-- =====================================================
-- Pré-requisitos:
-- 1) Rodar add-admin-geral-role.sql
-- 2) Criar o usuário no Supabase Auth (Dashboard > Authentication > Users)
--    com o mesmo e-mail definido abaixo

DO $$
DECLARE
  v_email text := 'jv.kulka13@gmail.com';
  v_nome text := 'Super Administrador';
  v_telefone text := '(00) 00000-0000';
  v_auth_user_id uuid;
BEGIN
  SELECT id
    INTO v_auth_user_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION
      'Usuário "%" não encontrado em auth.users. Crie primeiro no Supabase Auth e execute este script novamente.',
      v_email;
  END IF;

  INSERT INTO public.users (
    id,
    name,
    email,
    telefone,
    role,
    roles,
    cartorio_id,
    ativo
  )
  VALUES (
    v_auth_user_id,
    v_nome,
    v_email,
    v_telefone,
    'admin_geral',
    ARRAY['admin_geral']::text[],
    NULL,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    telefone = EXCLUDED.telefone,
    role = 'admin_geral',
    roles = ARRAY['admin_geral']::text[],
    cartorio_id = NULL,
    ativo = true;
END $$;
