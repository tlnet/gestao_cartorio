-- Script para verificar a estrutura atual da tabela relatorios_ia
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a tabela existe
SELECT 
  'Tabela existe?' as pergunta,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'relatorios_ia'
  ) as resposta;

-- 2. Listar todas as colunas da tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'relatorios_ia' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar se a coluna arquivo_original existe
SELECT 
  'Coluna arquivo_original existe?' as pergunta,
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'relatorios_ia' 
    AND column_name = 'arquivo_original'
    AND table_schema = 'public'
  ) as resposta;
