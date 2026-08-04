-- Prazo condicionado a um status: a contagem só começa quando o protocolo
-- recebe um status marcado como "início de prazo" (ex.: "Orçamento Pago").
-- Execute no Supabase SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'status_personalizados'
      AND column_name = 'is_inicio_prazo'
  ) THEN
    ALTER TABLE status_personalizados
      ADD COLUMN is_inicio_prazo BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

COMMENT ON COLUMN status_personalizados.is_inicio_prazo IS
  'Quando true, a contagem do prazo do protocolo começa ao receber este status';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'protocolos'
      AND column_name = 'prazo_iniciado_em'
  ) THEN
    ALTER TABLE protocolos
      ADD COLUMN prazo_iniciado_em TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

COMMENT ON COLUMN protocolos.prazo_iniciado_em IS
  'Data em que a contagem do prazo passou a valer (null = ainda não iniciada). '
  'Quando null e o cartório não usa status de início de prazo, vale created_at.';

-- Protocolos já existentes continuam contando a partir da abertura: preenche
-- prazo_iniciado_em com created_at para quem já tem prazo definido, evitando
-- que virem "aguardando início" ao ativar a regra.
UPDATE protocolos
SET prazo_iniciado_em = created_at
WHERE prazo_iniciado_em IS NULL
  AND prazo_execucao IS NOT NULL;
