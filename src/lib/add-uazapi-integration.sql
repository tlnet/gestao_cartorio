-- Script para adicionar integração WhatsApp via Uazapi na tabela cartorios
-- Execute no Supabase SQL Editor

DO $$
BEGIN
  -- Nome da instância criada na Uazapi (1 por cartório)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cartorios' AND column_name = 'uazapi_instance_name'
  ) THEN
    ALTER TABLE cartorios ADD COLUMN uazapi_instance_name TEXT;
  END IF;

  -- Token da instância Uazapi (header "token"); nunca exposto ao browser
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cartorios' AND column_name = 'uazapi_instance_token'
  ) THEN
    ALTER TABLE cartorios ADD COLUMN uazapi_instance_token TEXT;
  END IF;

  -- Número de WhatsApp conectado (preenchido ao conectar)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cartorios' AND column_name = 'whatsapp_numero'
  ) THEN
    ALTER TABLE cartorios ADD COLUMN whatsapp_numero TEXT;
  END IF;

  -- Status da conexão: disconnected | connecting | connected
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cartorios' AND column_name = 'whatsapp_status'
  ) THEN
    ALTER TABLE cartorios ADD COLUMN whatsapp_status TEXT DEFAULT 'disconnected';
  END IF;
END $$;

COMMENT ON COLUMN cartorios.uazapi_instance_name IS 'Nome da instância WhatsApp criada na Uazapi (1 por cartório)';
COMMENT ON COLUMN cartorios.uazapi_instance_token IS 'Token da instância Uazapi (header token). Secreto, server-side apenas';
COMMENT ON COLUMN cartorios.whatsapp_numero IS 'Número de WhatsApp conectado via Uazapi';
COMMENT ON COLUMN cartorios.whatsapp_status IS 'Status da conexão WhatsApp: disconnected | connecting | connected';
