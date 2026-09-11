-- Marca status personalizados que encerram o protocolo sem contar como
-- conclusão da serventia (ex.: Nota Devolutiva, Retirada pelo Cliente).
-- Execute no Supabase SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'status_personalizados'
      AND column_name = 'is_encerramento_externo'
  ) THEN
    ALTER TABLE status_personalizados
      ADD COLUMN is_encerramento_externo BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

COMMENT ON COLUMN status_personalizados.is_encerramento_externo IS
  'Quando true, protocolos com este status saem de Em aberto, vão para Encerramentos externos e NÃO contam na taxa de conclusão da serventia';

-- Seed: status já existentes que dependem do cliente
UPDATE status_personalizados
SET
  is_encerramento_externo = true,
  is_conclusao = false
WHERE
  lower(
    trim(
      translate(
        nome,
        'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
        'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
      )
    )
  ) IN (
    'nota devolutiva',
    'retirada pelo cliente'
  );
