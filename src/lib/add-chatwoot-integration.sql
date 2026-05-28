-- Script para adicionar integração Chatwoot na tabela cartorios
-- Execute no Supabase SQL Editor

DO $$
BEGIN
  -- Flag de uso do Chatwoot
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cartorios' AND column_name = 'sistema_chatwoot'
  ) THEN
    ALTER TABLE cartorios ADD COLUMN sistema_chatwoot BOOLEAN DEFAULT false;
  END IF;

  -- ID numérico da conta no Chatwoot (visível na URL: /app/accounts/{ID}/...)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cartorios' AND column_name = 'chatwoot_account_id'
  ) THEN
    ALTER TABLE cartorios ADD COLUMN chatwoot_account_id TEXT;
  END IF;

  -- Token de acesso do usuário Chatwoot (api_access_token)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cartorios' AND column_name = 'chatwoot_token'
  ) THEN
    ALTER TABLE cartorios ADD COLUMN chatwoot_token TEXT;
  END IF;

  -- Inbox específica (opcional). Se nulo, lista conversas de todas as inboxes.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cartorios' AND column_name = 'chatwoot_inbox_id'
  ) THEN
    ALTER TABLE cartorios ADD COLUMN chatwoot_inbox_id TEXT;
  END IF;
END $$;

COMMENT ON COLUMN cartorios.sistema_chatwoot IS 'Indica se o cartório utiliza a integração de Chat (Chatwoot)';
COMMENT ON COLUMN cartorios.chatwoot_account_id IS 'ID numérico da conta no Chatwoot (Application API)';
COMMENT ON COLUMN cartorios.chatwoot_token IS 'Token de usuário Chatwoot enviado no header api_access_token';
COMMENT ON COLUMN cartorios.chatwoot_inbox_id IS 'ID da inbox Chatwoot para filtrar conversas (opcional)';
