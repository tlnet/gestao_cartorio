-- Limpar todo o histórico de Análises (relatórios IA)
-- Execute no SQL Editor do Supabase.
-- Atenção: isso remove TODOS os registros da tabela relatorios_ia.
-- Os arquivos no bucket "documentos-ia" (PDFs/DOCs) NÃO são apagados por este script;
-- se quiser removê-los, faça pelo painel do Supabase Storage.

-- 1) Opcional: ver quantos registros serão removidos
SELECT COUNT(*) AS total_a_remover FROM relatorios_ia;

-- 2) Limpar a tabela (escolha UMA das opções abaixo)

-- Opção A: TRUNCATE (mais rápido, limpa tudo de uma vez)
TRUNCATE TABLE relatorios_ia;

-- Opção B: DELETE (se preferir usar DELETE em vez de TRUNCATE)
-- DELETE FROM relatorios_ia;

-- 3) Opcional: confirmar que está vazio
SELECT COUNT(*) AS total_restante FROM relatorios_ia;
