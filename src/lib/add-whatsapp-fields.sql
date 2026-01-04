-- Adicionar campos de WhatsApp na tabela cartorios
DO $$
BEGIN
    -- Adicionar whatsapp_contas
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cartorios' 
        AND column_name = 'whatsapp_contas'
    ) THEN
        ALTER TABLE cartorios 
        ADD COLUMN whatsapp_contas TEXT;
        
        COMMENT ON COLUMN cartorios.whatsapp_contas IS 'Número de WhatsApp para receber notificações sobre contas a pagar e vencimentos';
    END IF;

    -- Adicionar whatsapp_protocolos
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cartorios' 
        AND column_name = 'whatsapp_protocolos'
    ) THEN
        ALTER TABLE cartorios 
        ADD COLUMN whatsapp_protocolos TEXT;
        
        COMMENT ON COLUMN cartorios.whatsapp_protocolos IS 'Número de WhatsApp para receber notificações sobre prazos de protocolos';
    END IF;
END $$;

