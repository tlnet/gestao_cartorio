-- Script para limpar dados de teste que podem estar causando chaves duplicadas
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se há dados de teste nos serviços
SELECT nome, COUNT(*) as quantidade
FROM servicos 
WHERE nome ILIKE '%teste%' OR nome = 'Teste'
GROUP BY nome
HAVING COUNT(*) > 1;

-- 2. Verificar se há dados de teste nos status personalizados
SELECT nome, COUNT(*) as quantidade
FROM status_personalizados 
WHERE nome ILIKE '%teste%' OR nome = 'Teste'
GROUP BY nome
HAVING COUNT(*) > 1;

-- 3. Verificar se há dados de teste nas categorias
SELECT nome, COUNT(*) as quantidade
FROM categorias_personalizadas 
WHERE nome ILIKE '%teste%' OR nome = 'Teste'
GROUP BY nome
HAVING COUNT(*) > 1;

-- 4. Limpar dados duplicados de serviços (manter apenas o mais recente)
DELETE FROM servicos 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY nome, cartorio_id ORDER BY updated_at DESC) as rn
    FROM servicos 
    WHERE nome ILIKE '%teste%' OR nome = 'Teste'
  ) t 
  WHERE rn > 1
);

-- 5. Limpar dados duplicados de status personalizados (manter apenas o mais recente)
DELETE FROM status_personalizados 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY nome, cartorio_id ORDER BY updated_at DESC) as rn
    FROM status_personalizados 
    WHERE nome ILIKE '%teste%' OR nome = 'Teste'
  ) t 
  WHERE rn > 1
);

-- 6. Limpar dados duplicados de categorias (manter apenas o mais recente)
DELETE FROM categorias_personalizadas 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY nome, cartorio_id ORDER BY atualizado_em DESC) as rn
    FROM categorias_personalizadas 
    WHERE nome ILIKE '%teste%' OR nome = 'Teste'
  ) t 
  WHERE rn > 1
);

-- 7. Verificar se ainda há duplicatas
SELECT 'servicos' as tabela, nome, COUNT(*) as quantidade
FROM servicos 
GROUP BY nome, cartorio_id
HAVING COUNT(*) > 1

UNION ALL

SELECT 'status_personalizados' as tabela, nome, COUNT(*) as quantidade
FROM status_personalizados 
GROUP BY nome, cartorio_id
HAVING COUNT(*) > 1

UNION ALL

SELECT 'categorias_personalizadas' as tabela, nome, COUNT(*) as quantidade
FROM categorias_personalizadas 
GROUP BY nome, cartorio_id
HAVING COUNT(*) > 1;
