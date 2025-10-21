-- Script para recriar completamente a tabela relatorios_ia
-- Execute este script no Supabase SQL Editor

-- 1. Fazer backup dos dados existentes (se houver)
CREATE TABLE IF NOT EXISTS relatorios_ia_backup AS 
SELECT * FROM relatorios_ia;

-- 2. Dropar a tabela existente
DROP TABLE IF EXISTS relatorios_ia CASCADE;

-- 3. Recriar a tabela com a estrutura correta
CREATE TABLE relatorios_ia (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tipo VARCHAR(50) CHECK (tipo IN ('resumo_matricula', 'analise_malote', 'minuta_documento')) NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    arquivo_original TEXT NOT NULL,
    relatorio_pdf TEXT,
    relatorio_doc TEXT,
    relatorio_docx TEXT,
    resumo JSONB,
    status VARCHAR(20) CHECK (status IN ('processando', 'concluido', 'erro')) DEFAULT 'processando',
    usuario_id UUID NOT NULL,
    cartorio_id UUID REFERENCES cartorios(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar índices para performance
CREATE INDEX idx_relatorios_ia_cartorio_id ON relatorios_ia(cartorio_id);
CREATE INDEX idx_relatorios_ia_usuario_id ON relatorios_ia(usuario_id);
CREATE INDEX idx_relatorios_ia_status ON relatorios_ia(status);
CREATE INDEX idx_relatorios_ia_tipo ON relatorios_ia(tipo);
CREATE INDEX idx_relatorios_ia_created_at ON relatorios_ia(created_at);

-- 5. Restaurar dados do backup (se houver)
INSERT INTO relatorios_ia 
SELECT * FROM relatorios_ia_backup
WHERE EXISTS (SELECT 1 FROM relatorios_ia_backup);

-- 6. Dropar tabela de backup
DROP TABLE IF EXISTS relatorios_ia_backup;

-- 7. Verificar se a tabela foi criada corretamente
SELECT 
  'Tabela relatorios_ia recriada com sucesso!' as status,
  COUNT(*) as colunas
FROM information_schema.columns 
WHERE table_name = 'relatorios_ia' 
AND table_schema = 'public';

-- 8. Listar estrutura final
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'relatorios_ia' 
AND table_schema = 'public'
ORDER BY ordinal_position;
