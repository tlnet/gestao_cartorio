-- Script SIMPLES para limpar dados de teste que podem estar causando chaves duplicadas
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se há dados de teste nos serviços
SELECT 'SERVIÇOS' as tabela, nome, COUNT(*) as quantidade
FROM servicos 
WHERE nome ILIKE '%teste%' OR nome = 'Teste'
GROUP BY nome, cartorio_id
HAVING COUNT(*) > 1;

-- 2. Verificar se há dados de teste nos status personalizados
SELECT 'STATUS' as tabela, nome, COUNT(*) as quantidade
FROM status_personalizados 
WHERE nome ILIKE '%teste%' OR nome = 'Teste'
GROUP BY nome, cartorio_id
HAVING COUNT(*) > 1;

-- 3. Verificar se há dados de teste nas categorias
SELECT 'CATEGORIAS' as tabela, nome, COUNT(*) as quantidade
FROM categorias_personalizadas 
WHERE nome ILIKE '%teste%' OR nome = 'Teste'
GROUP BY nome, cartorio_id
HAVING COUNT(*) > 1;

-- 4. LIMPAR dados de teste dos serviços (remover TODOS os registros de teste)
DELETE FROM servicos 
WHERE nome ILIKE '%teste%' OR nome = 'Teste';

-- 5. LIMPAR dados de teste dos status personalizados (remover TODOS os registros de teste)
DELETE FROM status_personalizados 
WHERE nome ILIKE '%teste%' OR nome = 'Teste';

-- 6. LIMPAR dados de teste das categorias (remover TODOS os registros de teste)
DELETE FROM categorias_personalizadas 
WHERE nome ILIKE '%teste%' OR nome = 'Teste';

-- 7. Verificar se ainda há duplicatas em TODAS as tabelas
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
