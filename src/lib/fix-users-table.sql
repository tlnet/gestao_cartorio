-- Script para corrigir a tabela users
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a tabela users existe
SELECT 
  'Tabela users existe?' as pergunta,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'users'
  ) as resposta;

-- 2. Se a tabela não existir, criá-la
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'atendente',
    telefone VARCHAR(20),
    cartorio_id UUID REFERENCES cartorios(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Se a tabela existir mas não tiver chave primária, adicionar
DO $$
BEGIN
  -- Verificar se já tem chave primária
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'users' 
    AND constraint_type = 'PRIMARY KEY'
    AND table_schema = 'public'
  ) THEN
    -- Adicionar coluna id se não existir
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'id'
      AND table_schema = 'public'
    ) THEN
      ALTER TABLE users ADD COLUMN id UUID DEFAULT uuid_generate_v4();
    END IF;
    
    -- Adicionar chave primária
    ALTER TABLE users ADD PRIMARY KEY (id);
    RAISE NOTICE 'Chave primária adicionada à tabela users!';
  ELSE
    RAISE NOTICE 'Tabela users já tem chave primária!';
  END IF;
END $$;

-- 4. Verificar se a coluna id é UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'id'
    AND data_type = 'uuid'
    AND table_schema = 'public'
  ) THEN
    RAISE NOTICE 'Coluna id já é UUID!';
  ELSE
    -- Alterar tipo da coluna id para UUID se necessário
    ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::UUID;
    RAISE NOTICE 'Coluna id alterada para UUID!';
  END IF;
END $$;

-- 5. Verificar estrutura final
SELECT 
  'Estrutura final da tabela users:' as info,
  COUNT(*) as total_colunas
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public';

-- 6. Listar todas as colunas finais
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Verificar constraints
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'users' 
AND tc.table_schema = 'public';
