-- Adicionar campos ZDG na tabela cartorios
DO $$
BEGIN
    -- Adicionar external_id_zdg
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cartorios' 
        AND column_name = 'external_id_zdg'
    ) THEN
        ALTER TABLE cartorios 
        ADD COLUMN external_id_zdg TEXT;
        
        COMMENT ON COLUMN cartorios.external_id_zdg IS 'External ID ZDG para integração com sistema externo';
    END IF;

    -- Adicionar api_token_zdg
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cartorios' 
        AND column_name = 'api_token_zdg'
    ) THEN
        ALTER TABLE cartorios 
        ADD COLUMN api_token_zdg TEXT;
        
        COMMENT ON COLUMN cartorios.api_token_zdg IS 'API Token ZDG para autenticação na API';
    END IF;

    -- Adicionar channel_id_zdg
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cartorios' 
        AND column_name = 'channel_id_zdg'
    ) THEN
        ALTER TABLE cartorios 
        ADD COLUMN channel_id_zdg TEXT;
        
        COMMENT ON COLUMN cartorios.channel_id_zdg IS 'Channel ID ZDG para identificação do canal';
    END IF;
END $$;

