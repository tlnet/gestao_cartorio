-- Tabela de documentos vinculados a protocolos
CREATE TABLE IF NOT EXISTS documentos_protocolos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    protocolo_id UUID REFERENCES protocolos(id) ON DELETE CASCADE NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    url_arquivo TEXT NOT NULL,
    tipo_arquivo VARCHAR(100) NOT NULL,
    tamanho_arquivo BIGINT NOT NULL DEFAULT 0,
    usuario_upload UUID REFERENCES users(id) ON DELETE SET NULL,
    data_upload TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documentos_protocolos_protocolo_id
    ON documentos_protocolos(protocolo_id);

ALTER TABLE documentos_protocolos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documentos_protocolos_select_authenticated" ON documentos_protocolos;
CREATE POLICY "documentos_protocolos_select_authenticated" ON documentos_protocolos
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "documentos_protocolos_all_authenticated" ON documentos_protocolos;
CREATE POLICY "documentos_protocolos_all_authenticated" ON documentos_protocolos
    FOR ALL USING (auth.role() = 'authenticated');
