-- Script para adicionar a coluna hash_consulta na tabela consultas_cnib
-- Execute este script no Supabase SQL Editor se a tabela já existir

-- 1. Adicionar coluna hash_consulta se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'consultas_cnib' 
        AND column_name = 'hash_consulta'
    ) THEN
        ALTER TABLE consultas_cnib 
        ADD COLUMN hash_consulta VARCHAR(255);
        
        RAISE NOTICE 'Coluna hash_consulta adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna hash_consulta já existe na tabela.';
    END IF;
END $$;

-- 2. Verificar se a coluna foi adicionada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'consultas_cnib' 
AND table_schema = 'public'
AND column_name = 'hash_consulta';
