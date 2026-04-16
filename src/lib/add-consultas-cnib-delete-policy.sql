-- Habilita exclusão de consultas CNIB para administradores
-- Execute no Supabase SQL Editor

-- Remove política antiga com mesmo nome, se existir
DROP POLICY IF EXISTS "Admins podem apagar consultas CNIB do cartório" ON consultas_cnib;

-- Admin do cartório pode excluir consultas do próprio cartório.
-- Admin geral pode excluir de qualquer cartório.
CREATE POLICY "Admins podem apagar consultas CNIB do cartório"
ON consultas_cnib
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'admin_geral')
        OR (u.roles IS NOT NULL AND (u.roles && ARRAY['admin', 'admin_geral']::text[]))
      )
      AND (
        u.role = 'admin_geral'
        OR (u.roles IS NOT NULL AND 'admin_geral' = ANY(u.roles))
        OR u.cartorio_id = consultas_cnib.cartorio_id
      )
  )
);

COMMENT ON POLICY "Admins podem apagar consultas CNIB do cartório" ON consultas_cnib
IS 'Permite DELETE em consultas_cnib para admin/admin_geral; admin limitado ao próprio cartório.';
