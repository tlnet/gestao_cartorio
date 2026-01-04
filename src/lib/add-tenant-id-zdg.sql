-- Adicionar coluna tenant_id_zdg na tabela cartorios
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cartorios' 
        AND column_name = 'tenant_id_zdg'
    ) THEN
        ALTER TABLE cartorios 
        ADD COLUMN tenant_id_zdg TEXT;
        
        COMMENT ON COLUMN cartorios.tenant_id_zdg IS 'Tenant ID ZDG para integração com sistema externo';
    END IF;
END $$;

