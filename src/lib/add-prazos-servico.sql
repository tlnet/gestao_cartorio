-- Separa o prazo único do serviço em dois:
--   - prazo_verificacao: dias para verificar documentos (conta da abertura)
--   - prazo_execucao: dias para entrega após pagamento (conta do status de início do prazo)
-- Execute no Supabase SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'servicos'
      AND column_name = 'prazo_verificacao'
  ) THEN
    ALTER TABLE servicos
      ADD COLUMN prazo_verificacao INTEGER;
  END IF;
END $$;

COMMENT ON COLUMN servicos.prazo_verificacao IS
  'Prazo em dias para verificação dos documentos. Conta a partir da abertura do protocolo.';

COMMENT ON COLUMN servicos.prazo_execucao IS
  'Prazo em dias para entrega após pagamento. Conta a partir do status marcado como início do prazo.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'protocolos'
      AND column_name = 'prazo_verificacao'
  ) THEN
    ALTER TABLE protocolos
      ADD COLUMN prazo_verificacao DATE;
  END IF;
END $$;

COMMENT ON COLUMN protocolos.prazo_verificacao IS
  'Data limite para verificação dos documentos (calculada: abertura + maior prazo_verificacao dos serviços).';

COMMENT ON COLUMN protocolos.prazo_execucao IS
  'Data limite para entrega após pagamento (calculada: prazo_iniciado_em + maior prazo_execucao dos serviços).';
