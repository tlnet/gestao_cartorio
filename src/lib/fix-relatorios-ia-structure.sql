-- Script para corrigir a estrutura da tabela relatorios_ia
-- Execute este script no Supabase SQL Editor

-- 1. Verificar estrutura atual
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
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

-- 3. Verificar se há colunas duplicadas (isso não deveria acontecer, mas vamos verificar)
SELECT 
  column_name,
  COUNT(*) as quantidade
FROM information_schema.columns 
WHERE table_name = 'relatorios_ia' 
AND table_schema = 'public'
GROUP BY column_name
HAVING COUNT(*) > 1;

-- 4. Verificar estrutura final
SELECT 
  'Estrutura final da tabela relatorios_ia:' as info,
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