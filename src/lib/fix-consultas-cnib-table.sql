-- Script para verificar e corrigir a tabela consultas_cnib
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a coluna hash_consulta existe
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
        
        RAISE NOTICE '✅ Coluna hash_consulta adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna hash_consulta já existe na tabela.';
    END IF;
END $$;

-- 2. Verificar estrutura completa da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'consultas_cnib' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'consultas_cnib'
ORDER BY policyname;

-- 4. Contar registros
SELECT COUNT(*) as total_consultas FROM consultas_cnib;
