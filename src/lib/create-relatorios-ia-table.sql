-- Script para criar a tabela relatorios_ia se não existir
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a tabela existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'relatorios_ia'
) as tabela_existe;

-- 2. Criar a tabela se não existir
CREATE TABLE IF NOT EXISTS relatorios_ia (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tipo VARCHAR(50) CHECK (tipo IN ('resumo_matricula', 'analise_malote', 'minuta_documento')) NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    arquivo_original TEXT NOT NULL,
    relatorio_pdf TEXT,
    relatorio_doc TEXT,
    relatorio_docx TEXT,
    resumo JSONB,
    status VARCHAR(20) CHECK (status IN ('processando', 'concluido', 'erro')) DEFAULT 'processando',
    usuario_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    cartorio_id UUID REFERENCES cartorios(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_relatorios_ia_cartorio_id ON relatorios_ia(cartorio_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_ia_usuario_id ON relatorios_ia(usuario_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_ia_status ON relatorios_ia(status);
CREATE INDEX IF NOT EXISTS idx_relatorios_ia_tipo ON relatorios_ia(tipo);

-- 4. Verificar se a tabela foi criada
SELECT 
  'Tabela relatorios_ia criada com sucesso!' as status,
  COUNT(*) as colunas
FROM information_schema.columns 
WHERE table_name = 'relatorios_ia' 
AND table_schema = 'public';
