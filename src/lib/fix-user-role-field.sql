-- Script para corrigir o campo de tipo/role na tabela users
-- Execute este script no Supabase SQL Editor

-- 1. Verificar estrutura atual da tabela users
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name IN ('role', 'tipo')
ORDER BY column_name;

-- 2. Se a tabela tem 'role' mas não 'tipo', adicionar 'tipo' como alias/computed
-- OU atualizar para usar 'tipo' como campo principal

-- Opção A: Adicionar coluna 'tipo' e migrar dados de 'role'
DO $$
BEGIN
  -- Verificar se 'tipo' não existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'tipo'
    AND table_schema = 'public'
  ) THEN
    -- Adicionar coluna tipo
    ALTER TABLE users ADD COLUMN tipo VARCHAR(50);
    
    -- Copiar dados de role para tipo
    UPDATE users SET tipo = role WHERE role IS NOT NULL;
    
    -- Definir valor padrão
    ALTER TABLE users ALTER COLUMN tipo SET DEFAULT 'atendente';
    
    RAISE NOTICE 'Coluna tipo adicionada e dados migrados de role!';
  ELSE
    RAISE NOTICE 'Coluna tipo já existe!';
  END IF;
END $$;

-- 3. Garantir que todos os usuários tenham um tipo válido
UPDATE users 
SET tipo = COALESCE(tipo, role, 'atendente')
WHERE tipo IS NULL OR tipo = '';

-- 4. Verificar dados após migração
SELECT 
  id,
  name,
  email,
  role,
  tipo,
  ativo
FROM users
ORDER BY created_at DESC;

-- 5. (OPCIONAL) Se quiser usar apenas 'tipo' e remover 'role'
-- IMPORTANTE: Só faça isso depois de confirmar que tudo está funcionando!
-- ALTER TABLE users DROP COLUMN role;
