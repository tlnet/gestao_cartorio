-- Adicionar campos para dados do cartório usados na minuta de documento
DO $$
BEGIN
    -- Campo cidade
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'cartorios'
                   AND column_name = 'cidade') THEN
        ALTER TABLE cartorios ADD COLUMN cidade TEXT;
    END IF;
    
    -- Campo estado
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'cartorios'
                   AND column_name = 'estado') THEN
        ALTER TABLE cartorios ADD COLUMN estado TEXT;
    END IF;
    
    -- Campo numero_oficio
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'cartorios'
                   AND column_name = 'numero_oficio') THEN
        ALTER TABLE cartorios ADD COLUMN numero_oficio TEXT;
    END IF;
    
    -- Campo tabeliao_responsavel
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'cartorios'
                   AND column_name = 'tabeliao_responsavel') THEN
        ALTER TABLE cartorios ADD COLUMN tabeliao_responsavel TEXT;
    END IF;
END $$;

-- Adicionar comentários nas colunas
COMMENT ON COLUMN cartorios.cidade IS 'Cidade onde o cartório está localizado';
COMMENT ON COLUMN cartorios.estado IS 'Estado (UF) onde o cartório está localizado';
COMMENT ON COLUMN cartorios.numero_oficio IS 'Número do ofício do cartório';
COMMENT ON COLUMN cartorios.tabeliao_responsavel IS 'Nome do tabelião responsável pelo cartório';
