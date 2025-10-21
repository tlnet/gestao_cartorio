-- Script para verificar a estrutura da tabela users
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a tabela users existe
SELECT 
  'Tabela users existe?' as pergunta,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'users'
  ) as resposta;

-- 2. Listar todas as colunas da tabela users
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar constraints da tabela users
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'users' 
AND tc.table_schema = 'public';

-- 4. Verificar se há chave primária
SELECT 
  'Tem chave primária?' as pergunta,
  EXISTS (
    SELECT FROM information_schema.table_constraints 
    WHERE table_name = 'users' 
    AND constraint_type = 'PRIMARY KEY'
    AND table_schema = 'public'
  ) as resposta;
