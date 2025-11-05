-- Script para criar tabela de tokens CNIB
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela para armazenar tokens CNIB
CREATE TABLE IF NOT EXISTS cnib_tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    access_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índice para busca rápida de token válido
CREATE INDEX IF NOT EXISTS idx_cnib_tokens_expires_at ON cnib_tokens(expires_at DESC);

-- 3. Criar função para obter token válido mais recente
CREATE OR REPLACE FUNCTION get_valid_cnib_token()
RETURNS TABLE (
    id UUID,
    access_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ct.id,
        ct.access_token,
        ct.expires_at
    FROM cnib_tokens ct
    WHERE ct.expires_at > NOW()
    ORDER BY ct.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar função para limpar tokens expirados (opcional, pode ser executada periodicamente)
CREATE OR REPLACE FUNCTION cleanup_expired_cnib_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM cnib_tokens
    WHERE expires_at < NOW() - INTERVAL '1 day';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Verificar se a tabela foi criada corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'cnib_tokens'
ORDER BY ordinal_position;

