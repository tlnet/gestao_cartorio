-- Script para criar a tabela chatwoot_messages
-- Barramento de eventos/cache para realtime do Chat (Chatwoot)
-- Execute este script no Supabase SQL Editor

-- 1. Criar a tabela se não existir
CREATE TABLE IF NOT EXISTS chatwoot_messages (
    id BIGINT PRIMARY KEY,                 -- id da mensagem no Chatwoot (dedupe entre webhook e envio)
    cartorio_id UUID REFERENCES cartorios(id) ON DELETE CASCADE NOT NULL,
    conversation_id BIGINT NOT NULL,       -- id da conversa no Chatwoot
    content TEXT,                          -- texto da mensagem
    message_type SMALLINT DEFAULT 0,       -- 0 = incoming (cliente), 1 = outgoing (atendente), 2 = activity
    sender_name TEXT,                      -- nome de quem enviou
    attachments JSONB,                     -- anexos (data_url, file_type)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw JSONB                              -- payload bruto do Chatwoot
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_chatwoot_messages_cartorio_id ON chatwoot_messages(cartorio_id);
CREATE INDEX IF NOT EXISTS idx_chatwoot_messages_conversation_id ON chatwoot_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatwoot_messages_created_at ON chatwoot_messages(created_at);

-- 3. Habilitar RLS
ALTER TABLE chatwoot_messages ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
-- SELECT: usuários só veem mensagens do próprio cartório.
-- INSERT/UPDATE ficam restritos ao service role (rotas server-side), que ignora RLS.
DROP POLICY IF EXISTS "Usuários podem ver mensagens do seu cartório" ON chatwoot_messages;
CREATE POLICY "Usuários podem ver mensagens do seu cartório"
    ON chatwoot_messages
    FOR SELECT
    USING (
        cartorio_id IN (
            SELECT cartorio_id
            FROM users
            WHERE id = auth.uid()
        )
    );

-- 5. Habilitar Realtime na tabela
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'chatwoot_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chatwoot_messages;
    END IF;
END $$;

-- 6. Verificação
SELECT
    'Tabela chatwoot_messages criada com sucesso!' as status,
    COUNT(*) as colunas
FROM information_schema.columns
WHERE table_name = 'chatwoot_messages'
AND table_schema = 'public';
