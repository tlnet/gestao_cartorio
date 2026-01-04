-- Script para adicionar integração com Sistema Levontech
-- Execute este script no Supabase SQL Editor

-- Adicionar colunas para integração Levontech na tabela cartorios
DO $$ 
BEGIN
    -- Adicionar coluna sistema_levontech se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cartorios' 
                   AND column_name = 'sistema_levontech') THEN
        ALTER TABLE cartorios ADD COLUMN sistema_levontech BOOLEAN DEFAULT false;
    END IF;
    
    -- Adicionar coluna levontech_url se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cartorios' 
                   AND column_name = 'levontech_url') THEN
        ALTER TABLE cartorios ADD COLUMN levontech_url TEXT;
    END IF;
    
    -- Adicionar coluna levontech_username se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cartorios' 
                   AND column_name = 'levontech_username') THEN
        ALTER TABLE cartorios ADD COLUMN levontech_username TEXT;
    END IF;
    
    -- Adicionar coluna levontech_password se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cartorios' 
                   AND column_name = 'levontech_password') THEN
        ALTER TABLE cartorios ADD COLUMN levontech_password TEXT;
    END IF;
END $$;

-- Comentários nas colunas para documentação
COMMENT ON COLUMN cartorios.sistema_levontech IS 'Indica se o cartório utiliza o sistema Levontech';
COMMENT ON COLUMN cartorios.levontech_url IS 'URL da API do sistema Levontech';
COMMENT ON COLUMN cartorios.levontech_username IS 'Username para autenticação na API Levontech';
COMMENT ON COLUMN cartorios.levontech_password IS 'Password para autenticação na API Levontech';

