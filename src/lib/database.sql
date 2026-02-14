-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de cartórios
CREATE TABLE cartorios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    endereco TEXT NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    dias_alerta_vencimento INTEGER DEFAULT 3,
    notificacao_whatsapp BOOLEAN DEFAULT false,
    webhook_n8n TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de usuários
CREATE TABLE usuarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('admin', 'atendente', 'financeiro')) NOT NULL,
    cartorio_id UUID REFERENCES cartorios(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT true,
    ultimo_acesso TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de protocolos
CREATE TABLE protocolos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    protocolo VARCHAR(100) UNIQUE NOT NULL,
    demanda TEXT NOT NULL,
    solicitante VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(18) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    apresentante VARCHAR(255),
    servicos TEXT[] NOT NULL,
    status VARCHAR(100) NOT NULL,
    observacao TEXT,
    prazo_execucao DATE,
    cartorio_id UUID REFERENCES cartorios(id) ON DELETE CASCADE NOT NULL,
    criado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de histórico de protocolos
CREATE TABLE historico_protocolos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    protocolo_id UUID REFERENCES protocolos(id) ON DELETE CASCADE NOT NULL,
    status_anterior VARCHAR(100),
    novo_status VARCHAR(100) NOT NULL,
    usuario_responsavel UUID REFERENCES usuarios(id) ON DELETE SET NULL NOT NULL,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de relatórios de IA
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
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL NOT NULL,
    cartorio_id UUID REFERENCES cartorios(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de serviços
CREATE TABLE servicos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    prazo_execucao INTEGER NOT NULL,
    ativo BOOLEAN DEFAULT true,
    cartorio_id UUID REFERENCES cartorios(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de status personalizados
CREATE TABLE status_personalizados (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cor VARCHAR(7) NOT NULL,
    ordem INTEGER NOT NULL,
    cartorio_id UUID REFERENCES cartorios(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_protocolos_cartorio_id ON protocolos(cartorio_id);
CREATE INDEX idx_protocolos_status ON protocolos(status);
CREATE INDEX idx_protocolos_created_at ON protocolos(created_at);
CREATE INDEX idx_usuarios_cartorio_id ON usuarios(cartorio_id);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_historico_protocolo_id ON historico_protocolos(protocolo_id);
CREATE INDEX idx_relatorios_ia_cartorio_id ON relatorios_ia(cartorio_id);
CREATE INDEX idx_relatorios_ia_usuario_id ON relatorios_ia(usuario_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cartorios_updated_at BEFORE UPDATE ON cartorios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_protocolos_updated_at BEFORE UPDATE ON protocolos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_servicos_updated_at BEFORE UPDATE ON servicos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_status_personalizados_updated_at BEFORE UPDATE ON status_personalizados FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - Políticas de segurança
ALTER TABLE cartorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocolos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_protocolos ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_personalizados ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (permissivas para desenvolvimento)
CREATE POLICY "Permitir leitura para usuários autenticados" ON cartorios FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir escrita para usuários autenticados" ON cartorios FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir leitura para usuários autenticados" ON usuarios FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir escrita para usuários autenticados" ON usuarios FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir leitura para usuários autenticados" ON protocolos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir escrita para usuários autenticados" ON protocolos FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir leitura para usuários autenticados" ON historico_protocolos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir escrita para usuários autenticados" ON historico_protocolos FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir leitura para usuários autenticados" ON relatorios_ia FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir escrita para usuários autenticados" ON relatorios_ia FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir leitura para usuários autenticados" ON servicos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir escrita para usuários autenticados" ON servicos FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir leitura para usuários autenticados" ON status_personalizados FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir escrita para usuários autenticados" ON status_personalizados FOR ALL USING (auth.role() = 'authenticated');

-- Dados iniciais
INSERT INTO cartorios (nome, cnpj, endereco, telefone, email) VALUES
('Cartório do 1º Ofício de Notas', '12.345.678/0001-90', 'Rua das Flores, 123 - Centro - São Paulo/SP', '(11) 3333-4444', 'contato@cartorio1oficio.com.br'),
('Cartório do 2º Ofício de Registro Civil', '98.765.432/0001-10', 'Av. Principal, 456 - Centro - São Paulo/SP', '(11) 4444-5555', 'contato@cartorio2oficio.com.br');

-- Inserir usuário admin inicial
INSERT INTO usuarios (nome, email, telefone, tipo) VALUES
('Administrador Sistema', 'admin@iacartorios.com.br', '(11) 99999-9999', 'admin');