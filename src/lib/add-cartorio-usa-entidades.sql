-- Habilita suporte a Entidades (Recepção de RCPn) no cartório
-- Execute no Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cartorios'
      AND column_name = 'usa_entidades_rcpn'
  ) THEN
    ALTER TABLE cartorios ADD COLUMN usa_entidades_rcpn BOOLEAN DEFAULT false;
  END IF;
END $$;

COMMENT ON COLUMN cartorios.usa_entidades_rcpn IS 'Indica se o cartório atua com Entidades (Recepção de RCPn)';
