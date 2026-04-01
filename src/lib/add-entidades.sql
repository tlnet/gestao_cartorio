-- Tabela de Entidades (Recepção de RCPn) e coluna entidade_id em protocolos
-- Execute no Supabase SQL Editor APÓS add-cartorio-usa-entidades.sql

-- Tabela de entidades
CREATE TABLE IF NOT EXISTS entidades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cartorio_id UUID REFERENCES cartorios(id) ON DELETE CASCADE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entidades_cartorio_id ON entidades(cartorio_id);

-- RLS
ALTER TABLE entidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura para usuários autenticados" ON entidades
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir escrita para usuários autenticados" ON entidades
  FOR ALL USING (auth.role() = 'authenticated');

-- Trigger de updated_at
CREATE OR REPLACE TRIGGER update_entidades_updated_at
  BEFORE UPDATE ON entidades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Coluna entidade_id em protocolos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'protocolos'
      AND column_name = 'entidade_id'
  ) THEN
    ALTER TABLE protocolos
      ADD COLUMN entidade_id UUID REFERENCES entidades(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON TABLE entidades IS 'Entidades parceiras para Recepção de RCPn';
COMMENT ON COLUMN entidades.nome IS 'Nome da entidade';
COMMENT ON COLUMN protocolos.entidade_id IS 'Entidade (RCPn) de origem do protocolo';
