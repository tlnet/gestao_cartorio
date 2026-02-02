-- Script para verificar e corrigir a coluna hash_consulta na tabela consultas_cnib
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

-- 3. Verificar se há consultas sem hash mas com dados_consulta que podem ter o hash
SELECT 
    id,
    documento,
    created_at,
    CASE 
        WHEN hash_consulta IS NULL THEN '❌ Sem hash'
        ELSE '✅ Com hash'
    END as status_hash,
    CASE 
        WHEN dados_consulta IS NOT NULL THEN '✅ Com dados'
        ELSE '❌ Sem dados'
    END as status_dados
FROM consultas_cnib
ORDER BY created_at DESC
LIMIT 10;

-- 3.1. Verificar estrutura dos dados_consulta para entender onde está o hash
SELECT 
    id,
    documento,
    created_at,
    -- Verificar diferentes possíveis locais do hash
    dados_consulta->'data'->>'identifierRequest' as hash_data_identifierRequest,
    dados_consulta->>'identifierRequest' as hash_identifierRequest,
    dados_consulta->'data'->'dados_usuario'->>'hash' as hash_data_dados_usuario,
    dados_consulta->'dados_usuario'->>'hash' as hash_dados_usuario,
    dados_consulta->'data'->'data'->'dados_usuario'->>'hash' as hash_data_data_dados_usuario,
    -- Ver todas as chaves do primeiro nível
    jsonb_object_keys(dados_consulta) as chaves_nivel1
FROM consultas_cnib
WHERE hash_consulta IS NULL 
AND dados_consulta IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 4. Tentar extrair hash de consultas antigas que têm dados_consulta mas não têm hash_consulta
-- Primeiro, vamos ver quais consultas podem ter hash nos dados_consulta
SELECT 
    id,
    documento,
    created_at,
    CASE
        WHEN dados_consulta->'data'->>'identifierRequest' IS NOT NULL 
        THEN dados_consulta->'data'->>'identifierRequest'
        WHEN dados_consulta->'identifierRequest' IS NOT NULL 
        THEN dados_consulta->>'identifierRequest'
        WHEN dados_consulta->'data'->'dados_usuario'->>'hash' IS NOT NULL 
        THEN dados_consulta->'data'->'dados_usuario'->>'hash'
        WHEN dados_consulta->'dados_usuario'->>'hash' IS NOT NULL 
        THEN dados_consulta->'dados_usuario'->>'hash'
        WHEN dados_consulta->'data'->'data'->'dados_usuario'->>'hash' IS NOT NULL 
        THEN dados_consulta->'data'->'data'->'dados_usuario'->>'hash'
        ELSE NULL
    END as hash_encontrado,
    hash_consulta as hash_atual
FROM consultas_cnib
WHERE hash_consulta IS NULL 
AND dados_consulta IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 5. Atualizar consultas que têm hash nos dados_consulta mas não têm hash_consulta
UPDATE consultas_cnib
SET hash_consulta = (
    CASE
        WHEN dados_consulta->'data'->>'identifierRequest' IS NOT NULL 
        THEN dados_consulta->'data'->>'identifierRequest'
        WHEN dados_consulta->'identifierRequest' IS NOT NULL 
        THEN dados_consulta->>'identifierRequest'
        WHEN dados_consulta->'data'->'dados_usuario'->>'hash' IS NOT NULL 
        THEN dados_consulta->'data'->'dados_usuario'->>'hash'
        WHEN dados_consulta->'dados_usuario'->>'hash' IS NOT NULL 
        THEN dados_consulta->'dados_usuario'->>'hash'
        WHEN dados_consulta->'data'->'data'->'dados_usuario'->>'hash' IS NOT NULL 
        THEN dados_consulta->'data'->'data'->'dados_usuario'->>'hash'
        ELSE NULL
    END
)
WHERE hash_consulta IS NULL 
AND dados_consulta IS NOT NULL
AND (
    dados_consulta->'data'->>'identifierRequest' IS NOT NULL OR
    dados_consulta->'identifierRequest' IS NOT NULL OR
    dados_consulta->'data'->'dados_usuario'->>'hash' IS NOT NULL OR
    dados_consulta->'dados_usuario'->>'hash' IS NOT NULL OR
    dados_consulta->'data'->'data'->'dados_usuario'->>'hash' IS NOT NULL
);

-- 6. Verificar resultado da atualização
SELECT 
    COUNT(*) FILTER (WHERE hash_consulta IS NOT NULL) as consultas_com_hash,
    COUNT(*) FILTER (WHERE hash_consulta IS NULL) as consultas_sem_hash,
    COUNT(*) as total_consultas
FROM consultas_cnib;
