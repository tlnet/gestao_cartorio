-- Script para corrigir a estrutura da tabela relatorios_ia
-- Execute este script no Supabase SQL Editor

-- 1. Verificar estrutura atual
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'relatorios_ia' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Adicionar coluna arquivo_original se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'relatorios_ia' 
    AND column_name = 'arquivo_original'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE relatorios_ia ADD COLUMN arquivo_original TEXT;
    RAISE NOTICE 'Coluna arquivo_original adicionada com sucesso!';
  ELSE
    RAISE NOTICE 'Coluna arquivo_original já existe!';
  END IF;
END $$;

-- 3. Adicionar outras colunas que podem estar faltando
DO $$
BEGIN
  -- Adicionar coluna relatorio_pdf se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'relatorios_ia' 
    AND column_name = 'relatorio_pdf'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE relatorios_ia ADD COLUMN relatorio_pdf TEXT;
    RAISE NOTICE 'Coluna relatorio_pdf adicionada!';
  END IF;

  -- Adicionar coluna relatorio_doc se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'relatorios_ia' 
    AND column_name = 'relatorio_doc'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE relatorios_ia ADD COLUMN relatorio_doc TEXT;
    RAISE NOTICE 'Coluna relatorio_doc adicionada!';
  END IF;

  -- Adicionar coluna relatorio_docx se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'relatorios_ia' 
    AND column_name = 'relatorio_docx'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE relatorios_ia ADD COLUMN relatorio_docx TEXT;
    RAISE NOTICE 'Coluna relatorio_docx adicionada!';
  END IF;

  -- Adicionar coluna resumo se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'relatorios_ia' 
    AND column_name = 'resumo'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE relatorios_ia ADD COLUMN resumo JSONB;
    RAISE NOTICE 'Coluna resumo adicionada!';
  END IF;

  -- Adicionar coluna status se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'relatorios_ia' 
    AND column_name = 'status'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE relatorios_ia ADD COLUMN status VARCHAR(20) DEFAULT 'processando';
    RAISE NOTICE 'Coluna status adicionada!';
  END IF;
END $$;

-- 4. Verificar estrutura final
SELECT 
  'Estrutura final da tabela:' as info,
  COUNT(*) as total_colunas
FROM information_schema.columns 
WHERE table_name = 'relatorios_ia' 
AND table_schema = 'public';

-- 5. Listar todas as colunas finais
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'relatorios_ia' 
AND table_schema = 'public'
ORDER BY ordinal_position;
