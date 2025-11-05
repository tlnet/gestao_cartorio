-- Script para adicionar campo CPF à tabela users (se não existir)
-- Execute este script no Supabase SQL Editor

-- Verificar se a coluna existe e adicionar se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'cpf'
    ) THEN
        ALTER TABLE users ADD COLUMN cpf VARCHAR(11);
        RAISE NOTICE 'Coluna cpf adicionada à tabela users';
    ELSE
        RAISE NOTICE 'Coluna cpf já existe na tabela users';
    END IF;
END $$;

-- Verificar se a coluna foi criada
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name = 'cpf';

