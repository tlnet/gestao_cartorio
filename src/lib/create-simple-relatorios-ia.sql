-- Script simples para criar a tabela relatorios_ia sem foreign keys problemáticas
-- Execute este script no Supabase SQL Editor

-- 1. Dropar a tabela existente se houver
DROP TABLE IF EXISTS relatorios_ia CASCADE;

-- 2. Criar a tabela sem foreign keys
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
    cartorio_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índices para performance
CREATE INDEX idx_relatorios_ia_cartorio_id ON relatorios_ia(cartorio_id);
CREATE INDEX idx_relatorios_ia_usuario_id ON relatorios_ia(usuario_id);
CREATE INDEX idx_relatorios_ia_status ON relatorios_ia(status);
CREATE INDEX idx_relatorios_ia_tipo ON relatorios_ia(tipo);
CREATE INDEX idx_relatorios_ia_created_at ON relatorios_ia(created_at);

-- 4. Habilitar RLS
ALTER TABLE relatorios_ia ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas RLS simples
CREATE POLICY "Users can view reports from their cartorio" ON relatorios_ia
FOR SELECT
USING (
  cartorio_id IN (
    SELECT cartorio_id 
    FROM users 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert reports to their cartorio" ON relatorios_ia
FOR INSERT
WITH CHECK (
  cartorio_id IN (
    SELECT cartorio_id 
    FROM users 
    WHERE id = auth.uid()
  )
  AND usuario_id = auth.uid()
);

CREATE POLICY "Users can update their own reports" ON relatorios_ia
FOR UPDATE
USING (
  usuario_id = auth.uid()
  AND cartorio_id IN (
    SELECT cartorio_id 
    FROM users 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  usuario_id = auth.uid()
  AND cartorio_id IN (
    SELECT cartorio_id 
    FROM users 
    WHERE id = auth.uid()
  )
);

-- 6. Verificar se a tabela foi criada
SELECT 
  'Tabela relatorios_ia criada com sucesso!' as status,
  COUNT(*) as colunas
FROM information_schema.columns 
WHERE table_name = 'relatorios_ia' 
AND table_schema = 'public';

-- 7. Listar estrutura final
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'relatorios_ia' 
AND table_schema = 'public'
ORDER BY ordinal_position;
