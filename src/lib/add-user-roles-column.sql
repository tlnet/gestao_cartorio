-- Adiciona coluna roles (array de permissões) na tabela users para suportar múltiplas permissões por usuário.
-- Mantém a coluna 'role' para compatibilidade; roles tem precedência quando preenchido.

-- 1. Adicionar coluna roles (array de texto)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'roles'
  ) THEN
    ALTER TABLE users ADD COLUMN roles text[] DEFAULT '{}';
    COMMENT ON COLUMN users.roles IS 'Lista de permissões do usuário: admin, atendente, financeiro. União das permissões.';
    RAISE NOTICE 'Coluna users.roles criada.';
  ELSE
    RAISE NOTICE 'Coluna users.roles já existe.';
  END IF;
END $$;

-- 2. Migrar role único para roles (um item no array)
UPDATE users
SET roles = ARRAY[role]::text[]
WHERE (roles IS NULL OR roles = '{}') AND role IS NOT NULL AND role != '';

-- 3. Garantir que usuários sem role tenham pelo menos atendente
UPDATE users
SET roles = ARRAY['atendente']::text[]
WHERE (roles IS NULL OR roles = '{}') OR array_length(roles, 1) IS NULL;

-- 4. Constraint opcional: só valores permitidos (descomente se quiser validar no banco)
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_roles_check;
-- ALTER TABLE users ADD CONSTRAINT users_roles_check
--   CHECK (roles <@ ARRAY['admin','atendente','financeiro']::text[]);
