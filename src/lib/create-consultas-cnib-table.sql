-- Script para criar a tabela consultas_cnib
-- Execute este script no Supabase SQL Editor

-- 1. Criar a tabela se não existir
CREATE TABLE IF NOT EXISTS consultas_cnib (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    documento VARCHAR(20) NOT NULL, -- CPF ou CNPJ consultado (sem formatação)
    tipo_documento VARCHAR(10) CHECK (tipo_documento IN ('CPF', 'CNPJ')) NOT NULL,
    nome_razao_social VARCHAR(255), -- Nome ou razão social retornado pela API
    hash_consulta VARCHAR(255), -- Hash da consulta retornado pela API CNIB
    indisponivel BOOLEAN DEFAULT false, -- Se há indisponibilidade de bens
    quantidade_ordens INTEGER DEFAULT 0, -- Quantidade de ordens encontradas
    dados_consulta JSONB, -- Dados completos retornados pela API CNIB
    status VARCHAR(20) CHECK (status IN ('sucesso', 'erro')) DEFAULT 'sucesso',
    mensagem_erro TEXT, -- Mensagem de erro caso a consulta falhe
    usuario_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    cartorio_id UUID REFERENCES cartorios(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_consultas_cnib_cartorio_id ON consultas_cnib(cartorio_id);
CREATE INDEX IF NOT EXISTS idx_consultas_cnib_usuario_id ON consultas_cnib(usuario_id);
CREATE INDEX IF NOT EXISTS idx_consultas_cnib_documento ON consultas_cnib(documento);
CREATE INDEX IF NOT EXISTS idx_consultas_cnib_tipo_documento ON consultas_cnib(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_consultas_cnib_created_at ON consultas_cnib(created_at);
CREATE INDEX IF NOT EXISTS idx_consultas_cnib_status ON consultas_cnib(status);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE consultas_cnib ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS
-- Política para permitir que usuários vejam apenas consultas do seu cartório
CREATE POLICY "Usuários podem ver consultas do seu cartório"
    ON consultas_cnib
    FOR SELECT
    USING (
        cartorio_id IN (
            SELECT cartorio_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

-- Política para permitir que usuários criem consultas para o seu cartório
CREATE POLICY "Usuários podem criar consultas para o seu cartório"
    ON consultas_cnib
    FOR INSERT
    WITH CHECK (
        cartorio_id IN (
            SELECT cartorio_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

-- 5. Verificar se a tabela foi criada
SELECT 
    'Tabela consultas_cnib criada com sucesso!' as status,
    COUNT(*) as colunas
FROM information_schema.columns 
WHERE table_name = 'consultas_cnib' 
AND table_schema = 'public';
