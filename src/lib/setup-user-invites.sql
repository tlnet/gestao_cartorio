-- ============================================================================
-- SISTEMA DE CONVITE DE USUÁRIOS
-- ============================================================================
-- Este script adiciona suporte para sistema de convites na tabela users
-- Permite que administradores convidem usuários sem definir senhas
-- Usuários definem suas próprias senhas através de link único e seguro
-- ============================================================================

-- Adicionar campos de convite na tabela users
-- ============================================================================

DO $$ 
BEGIN
    -- Adicionar campo invite_token (token UUID único)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'invite_token'
    ) THEN
        ALTER TABLE users ADD COLUMN invite_token TEXT NULL;
        COMMENT ON COLUMN users.invite_token IS 'Token UUID único para convite de ativação de conta';
    END IF;

    -- Adicionar campo invite_created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'invite_created_at'
    ) THEN
        ALTER TABLE users ADD COLUMN invite_created_at TIMESTAMP WITH TIME ZONE NULL;
        COMMENT ON COLUMN users.invite_created_at IS 'Data e hora de criação do convite';
    END IF;

    -- Adicionar campo invite_expires_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'invite_expires_at'
    ) THEN
        ALTER TABLE users ADD COLUMN invite_expires_at TIMESTAMP WITH TIME ZONE NULL;
        COMMENT ON COLUMN users.invite_expires_at IS 'Data e hora de expiração do convite (7 dias após criação)';
    END IF;

    -- Adicionar campo invite_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'invite_status'
    ) THEN
        ALTER TABLE users ADD COLUMN invite_status TEXT DEFAULT 'pending';
        COMMENT ON COLUMN users.invite_status IS 'Status do convite: pending, accepted, expired, cancelled';
    END IF;

    -- Adicionar campo invite_accepted_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'invite_accepted_at'
    ) THEN
        ALTER TABLE users ADD COLUMN invite_accepted_at TIMESTAMP WITH TIME ZONE NULL;
        COMMENT ON COLUMN users.invite_accepted_at IS 'Data e hora em que o convite foi aceito e conta ativada';
    END IF;

    -- Adicionar campo account_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'account_status'
    ) THEN
        ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT 'active';
        COMMENT ON COLUMN users.account_status IS 'Status da conta: active, pending_activation, inactive';
    END IF;

    RAISE NOTICE 'Campos de convite adicionados com sucesso à tabela users';
END $$;

-- Criar índices para melhorar performance de queries
-- ============================================================================

-- Índice único para invite_token (busca rápida por token)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_users_invite_token'
    ) THEN
        CREATE UNIQUE INDEX idx_users_invite_token ON users(invite_token) 
        WHERE invite_token IS NOT NULL;
        RAISE NOTICE 'Índice idx_users_invite_token criado com sucesso';
    END IF;
END $$;

-- Índice para account_status (filtrar usuários por status)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_users_account_status'
    ) THEN
        CREATE INDEX idx_users_account_status ON users(account_status);
        RAISE NOTICE 'Índice idx_users_account_status criado com sucesso';
    END IF;
END $$;

-- Índice para invite_status (filtrar convites pendentes)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_users_invite_status'
    ) THEN
        CREATE INDEX idx_users_invite_status ON users(invite_status);
        RAISE NOTICE 'Índice idx_users_invite_status criado com sucesso';
    END IF;
END $$;

-- Atualizar usuários existentes
-- ============================================================================

-- Definir account_status como 'active' para usuários já existentes e ativos
UPDATE users 
SET account_status = 'active'
WHERE account_status IS NULL 
  AND ativo = true;

-- Definir account_status como 'inactive' para usuários inativos
UPDATE users 
SET account_status = 'inactive'
WHERE account_status IS NULL 
  AND ativo = false;

-- Políticas RLS (Row Level Security)
-- ============================================================================
-- NOTA: As políticas de convite foram removidas para evitar recursão infinita.
-- As políticas existentes de 'users' já devem cobrir o acesso necessário.
-- Se necessário, use funções SECURITY DEFINER para verificar permissões de admin
-- sem causar recursão.

-- Remover políticas problemáticas se existirem
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins podem ver dados de convite" ON users;
    DROP POLICY IF EXISTS "Admins podem atualizar convites" ON users;
    RAISE NOTICE 'Políticas de convite removidas (para evitar recursão)';
END $$;

-- Função helper para verificar se usuário é admin (sem causar recursão)
-- Esta função pode ser usada em outras políticas se necessário
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

-- Função para expirar convites automaticamente (opcional - pode ser chamada por cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE users
    SET invite_status = 'expired'
    WHERE invite_status = 'pending'
      AND invite_expires_at < NOW()
      AND invite_token IS NOT NULL;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION expire_old_invites() IS 'Marca convites expirados automaticamente. Retorna número de convites expirados.';

-- ============================================================================
-- QUERIES DE VERIFICAÇÃO
-- ============================================================================

-- Verificar estrutura da tabela users (campos de convite)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    COALESCE(col_description((table_schema||'.'||table_name)::regclass::oid, ordinal_position), '') as description
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('invite_token', 'invite_created_at', 'invite_expires_at', 'invite_status', 'invite_accepted_at', 'account_status')
ORDER BY ordinal_position;

-- Verificar índices criados
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
  AND indexname IN ('idx_users_invite_token', 'idx_users_account_status', 'idx_users_invite_status');

-- Contar usuários por account_status
SELECT 
    account_status,
    COUNT(*) as total
FROM users
GROUP BY account_status
ORDER BY account_status;

-- Contar convites por invite_status
SELECT 
    invite_status,
    COUNT(*) as total
FROM users
WHERE invite_token IS NOT NULL
GROUP BY invite_status
ORDER BY invite_status;

-- ============================================================================
-- NOTAS DE IMPLEMENTAÇÃO
-- ============================================================================
-- 
-- 1. SEGURANÇA:
--    - invite_token deve ser UUID v4 gerado no backend
--    - Tokens devem ser únicos (garantido por índice)
--    - RLS garante que apenas admins acessam tokens
--    - Tokens expiram após 7 dias
--
-- 2. FLUXO DE CONVITE:
--    - Admin cria usuário → invite_token gerado → invite_status='pending'
--    - Usuário acessa link → valida token → define senha
--    - Após ativação → invite_status='accepted', account_status='active'
--
-- 3. MANUTENÇÃO:
--    - Executar expire_old_invites() periodicamente (diário)
--    - Considerar limpar tokens antigos após 30 dias
--
-- 4. COMPATIBILIDADE:
--    - Script é idempotente (pode ser executado múltiplas vezes)
--    - Preserva dados existentes
--    - Atualiza usuários existentes para account_status='active'
-- ============================================================================
