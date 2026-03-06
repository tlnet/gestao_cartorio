-- Garante que a coluna relatorio_doc (URL do arquivo .doc/.docx editável) existe
-- Execute no Supabase SQL Editor se a coluna ainda não estiver presente
-- (o script fix-relatorios-ia-table.sql já inclui esta coluna; este é um utilitário isolado)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name   = 'relatorios_ia'
      AND column_name  = 'relatorio_doc'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.relatorios_ia
      ADD COLUMN relatorio_doc TEXT DEFAULT NULL;
    RAISE NOTICE 'Coluna relatorio_doc adicionada com sucesso.';
  ELSE
    RAISE NOTICE 'Coluna relatorio_doc já existe.';
  END IF;
END $$;

-- Confirma estrutura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name   = 'relatorios_ia'
  AND table_schema = 'public'
ORDER BY ordinal_position;
