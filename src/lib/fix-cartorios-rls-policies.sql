-- Script para corrigir políticas RLS da tabela cartorios
-- Execute este script no Supabase SQL Editor
-- Este script corrige as políticas RLS para permitir UPDATE corretamente

-- 1. Dropar políticas existentes que podem estar causando problemas
DROP POLICY IF EXISTS "Permitir escrita para usuários autenticados" ON cartorios;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON cartorios;

-- 2. Criar políticas separadas e mais específicas

-- Política para SELECT (leitura)
CREATE POLICY "Usuários autenticados podem ler cartórios" 
ON cartorios 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Política para INSERT (inserção)
CREATE POLICY "Usuários autenticados podem inserir cartórios" 
ON cartorios 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Política para UPDATE (atualização) - IMPORTANTE: precisa de USING e WITH CHECK
CREATE POLICY "Usuários autenticados podem atualizar cartórios" 
ON cartorios 
FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Política para DELETE (exclusão)
CREATE POLICY "Usuários autenticados podem deletar cartórios" 
ON cartorios 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- 3. Verificar se as políticas foram criadas
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
WHERE tablename = 'cartorios'
ORDER BY policyname;

-- 4. Testar se a tabela está acessível
SELECT 
  'Tabela acessível?' as pergunta,
  COUNT(*) > 0 as resposta
FROM information_schema.tables 
WHERE table_name = 'cartorios' 
AND table_schema = 'public';

