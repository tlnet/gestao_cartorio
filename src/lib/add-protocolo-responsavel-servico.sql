-- Responsável pelo serviço no protocolo (usuário cadastrado no cartório)
-- Execute no Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'protocolos'
      AND column_name = 'responsavel_servico_id'
  ) THEN
    ALTER TABLE protocolos
      ADD COLUMN responsavel_servico_id UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN protocolos.responsavel_servico_id IS 'Usuário do cartório responsável pelo serviço deste protocolo';
