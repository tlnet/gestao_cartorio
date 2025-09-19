-- Script para adicionar campo data_conclusao na tabela protocolos
-- Este campo será preenchido automaticamente quando o status for alterado para "Concluído"

-- 1. Adicionar o campo data_conclusao
ALTER TABLE protocolos 
ADD COLUMN data_conclusao TIMESTAMP WITH TIME ZONE;

-- 2. Adicionar comentário para documentar o campo
COMMENT ON COLUMN protocolos.data_conclusao IS 'Data e hora em que o protocolo foi concluído. Preenchido automaticamente quando status é alterado para "Concluído".';

-- 3. Criar índice para melhorar performance em consultas por data de conclusão
CREATE INDEX idx_protocolos_data_conclusao ON protocolos(data_conclusao);

-- 4. Atualizar protocolos existentes que já estão com status "Concluído"
-- Usar updated_at como data_conclusao para protocolos já concluídos
UPDATE protocolos 
SET data_conclusao = updated_at 
WHERE status = 'Concluído' 
AND data_conclusao IS NULL;

-- 5. Verificar se a alteração foi aplicada corretamente
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'protocolos' 
AND column_name = 'data_conclusao'
AND table_schema = 'public';

-- 6. Verificar quantos protocolos foram atualizados
SELECT 
    COUNT(*) as protocolos_concluidos_atualizados
FROM protocolos 
WHERE status = 'Concluído' 
AND data_conclusao IS NOT NULL;
