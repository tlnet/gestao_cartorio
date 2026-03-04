-- Adiciona a coluna dados_minuta (JSONB) à tabela relatorios_ia
-- Execute no Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name   = 'relatorios_ia'
      AND column_name  = 'dados_minuta'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.relatorios_ia
      ADD COLUMN dados_minuta JSONB DEFAULT NULL;
    RAISE NOTICE 'Coluna dados_minuta adicionada com sucesso.';
  ELSE
    RAISE NOTICE 'Coluna dados_minuta já existe.';
  END IF;
END $$;

-- Verifica resultado
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'relatorios_ia'
  AND table_schema = 'public'
ORDER BY ordinal_position;
