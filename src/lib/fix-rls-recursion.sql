-- ============================================================================
-- CORREÇÃO: Remover Políticas RLS que Causam Recursão Infinita
-- ============================================================================
-- Execute este script para remover as políticas problemáticas que causam
-- recursão infinita na tabela users.
-- ============================================================================

-- Remover políticas problemáticas
DROP POLICY IF EXISTS "Admins podem ver dados de convite" ON users;
DROP POLICY IF EXISTS "Admins podem atualizar convites" ON users;

-- Criar função helper para verificar admin (sem recursão)
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Buscar role do usuário diretamente, sem usar políticas RLS
    SELECT role INTO user_role
    FROM users
    WHERE id = user_id;
    
    RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_admin_user(UUID) IS 'Verifica se um usuário é admin sem causar recursão em políticas RLS';

-- Verificar se políticas foram removidas
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE tablename = 'users'
  AND policyname IN ('Admins podem ver dados de convite', 'Admins podem atualizar convites');

-- Se a query acima retornar vazio, as políticas foram removidas com sucesso
-- Se ainda retornar algo, execute novamente os DROP POLICY acima
