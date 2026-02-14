-- Script para adicionar coluna updated_at na tabela relatorios_ia se não existir
-- Execute este script no Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'relatorios_ia' 
    AND column_name = 'updated_at'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE relatorios_ia ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Coluna updated_at adicionada com sucesso!';
  ELSE
    RAISE NOTICE 'Coluna updated_at já existe!';
  END IF;
END $$;

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_relatorios_ia_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger se já existir e criar novamente
DROP TRIGGER IF EXISTS update_relatorios_ia_updated_at ON relatorios_ia;
CREATE TRIGGER update_relatorios_ia_updated_at 
BEFORE UPDATE ON relatorios_ia 
FOR EACH ROW 
EXECUTE FUNCTION update_relatorios_ia_updated_at();
