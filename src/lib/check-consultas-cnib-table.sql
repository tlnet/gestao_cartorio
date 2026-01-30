-- Script para verificar se a tabela consultas_cnib existe e está configurada corretamente
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a tabela existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'consultas_cnib'
        ) THEN '✅ Tabela consultas_cnib existe'
        ELSE '❌ Tabela consultas_cnib NÃO existe'
    END as status_tabela;

-- 2. Verificar estrutura da tabela (se existir)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'consultas_cnib' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar se RLS está habilitado
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'consultas_cnib'
        ) THEN (
            SELECT 
                CASE 
                    WHEN relrowsecurity THEN '✅ RLS está habilitado'
                    ELSE '❌ RLS NÃO está habilitado'
                END
            FROM pg_class 
            WHERE relname = 'consultas_cnib'
        )
        ELSE 'Tabela não existe'
    END as status_rls;

-- 4. Verificar políticas RLS existentes
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

-- 5. Contar registros na tabela (se existir)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'consultas_cnib'
        ) THEN (
            SELECT COUNT(*)::text || ' consultas encontradas'
            FROM consultas_cnib
        )
        ELSE 'Tabela não existe'
    END as total_consultas;
