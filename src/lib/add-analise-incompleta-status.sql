-- Script para adicionar o status "analise_incompleta" à tabela relatorios_ia
-- Execute este script no Supabase SQL Editor

-- 1. Remover o CHECK constraint existente
ALTER TABLE relatorios_ia 
DROP CONSTRAINT IF EXISTS relatorios_ia_status_check;

-- 2. Adicionar novo CHECK constraint com o status "analise_incompleta"
ALTER TABLE relatorios_ia 
ADD CONSTRAINT relatorios_ia_status_check 
CHECK (status IN ('processando', 'concluido', 'erro', 'analise_incompleta'));

-- 3. Verificar se a alteração foi aplicada
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE table_name = 'relatorios_ia'
AND constraint_name = 'relatorios_ia_status_check';

-- 4. Verificar estrutura atual da tabela
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'relatorios_ia'
AND column_name = 'status'
ORDER BY ordinal_position;
