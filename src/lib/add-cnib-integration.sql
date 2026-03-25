-- Script para adicionar integração CNIB na tabela cartorios
-- Execute no Supabase SQL Editor

DO $$
BEGIN
  -- Client ID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cartorios'
      AND column_name = 'cnib_client_id'
  ) THEN
    ALTER TABLE cartorios ADD COLUMN cnib_client_id TEXT;
  END IF;

  -- Client Secret
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cartorios'
      AND column_name = 'cnib_client_secret'
  ) THEN
    ALTER TABLE cartorios ADD COLUMN cnib_client_secret TEXT;
  END IF;

  -- CPF da serventia (usuário CNIB) usado em cpf_usuario na API de consulta
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cartorios'
      AND column_name = 'cnib_cpf_usuario'
  ) THEN
    ALTER TABLE cartorios ADD COLUMN cnib_cpf_usuario TEXT;
  END IF;
END $$;

COMMENT ON COLUMN cartorios.cnib_client_id IS 'Client ID da integração CNIB';
COMMENT ON COLUMN cartorios.cnib_client_secret IS 'Client Secret da integração CNIB';
COMMENT ON COLUMN cartorios.cnib_cpf_usuario IS 'CPF da serventia cadastrado na CNIB (11 dígitos), enviado como cpf_usuario na consulta';

