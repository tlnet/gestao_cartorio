-- Permite que usuários autenticados leiam e atualizem a própria linha na tabela users.
-- Sem isso o perfil não carrega (role/roles) e o app usa fallback "atendente".
-- Execute no SQL Editor do Supabase.

-- 1. Habilitar RLS na tabela users (se ainda não estiver)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. SELECT: usuário pode ler a linha onde id = auth.uid()
DROP POLICY IF EXISTS "Usuários podem ler próprio perfil" ON users;
CREATE POLICY "Usuários podem ler próprio perfil"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- 3. UPDATE: usuário pode atualizar a linha onde id = auth.uid() OU onde email = seu email (para completar registro e sincronizar id)
--    Assim, ao definir senha pelo link, o registro pode fazer UPDATE ... WHERE email = ? SET id = auth.uid(), role, roles
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON users;
CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON users FOR UPDATE
  USING (
    auth.uid() = id
    OR (auth.jwt() ->> 'email') IS NOT NULL AND email = (auth.jwt() ->> 'email')
  )
  WITH CHECK (
    auth.uid() = id
    OR (auth.jwt() ->> 'email') IS NOT NULL AND email = (auth.jwt() ->> 'email')
  );
