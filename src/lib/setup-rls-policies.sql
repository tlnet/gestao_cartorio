-- Script para configurar políticas RLS para a tabela relatorios_ia
-- Execute este script no Supabase SQL Editor

-- 1. Habilitar RLS na tabela
ALTER TABLE relatorios_ia ENABLE ROW LEVEL SECURITY;

-- 2. Dropar políticas existentes (se houver)
DROP POLICY IF EXISTS "Users can view their own reports" ON relatorios_ia;
DROP POLICY IF EXISTS "Users can insert their own reports" ON relatorios_ia;
DROP POLICY IF EXISTS "Users can update their own reports" ON relatorios_ia;

-- 3. Criar política para visualização (usuários podem ver relatórios do seu cartório)
CREATE POLICY "Users can view reports from their cartorio" ON relatorios_ia
FOR SELECT
USING (
  cartorio_id IN (
    SELECT cartorio_id 
    FROM users 
    WHERE id = auth.uid()
  )
);

-- 4. Criar política para inserção (usuários podem inserir relatórios no seu cartório)
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

-- 5. Criar política para atualização (usuários podem atualizar seus próprios relatórios)
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

-- 6. Verificar se as políticas foram criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'relatorios_ia';

-- 7. Testar se a tabela está acessível
SELECT 
  'Tabela acessível?' as pergunta,
  COUNT(*) > 0 as resposta
FROM information_schema.tables 
WHERE table_name = 'relatorios_ia' 
AND table_schema = 'public';
