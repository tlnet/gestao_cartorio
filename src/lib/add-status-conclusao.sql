-- Marca status personalizados que representam a conclusão do protocolo
-- Execute no Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'status_personalizados'
      AND column_name = 'is_conclusao'
  ) THEN
    ALTER TABLE status_personalizados
      ADD COLUMN is_conclusao BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

COMMENT ON COLUMN status_personalizados.is_conclusao IS 'Quando true, protocolos com este status são tratados como concluídos';

-- Status personalizados já existentes chamados "Concluído" passam a ser de conclusão
UPDATE status_personalizados
SET is_conclusao = true
WHERE is_conclusao = false
  AND lower(trim(nome)) IN ('concluído', 'concluido', 'concluída', 'concluida');
