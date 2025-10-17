-- Adicionar campos faltantes na tabela servicos
ALTER TABLE servicos 
ADD COLUMN IF NOT EXISTS descricao TEXT,
ADD COLUMN IF NOT EXISTS preco DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS dias_notificacao_antes_vencimento INTEGER DEFAULT 1;

-- Comentários para documentação
COMMENT ON COLUMN servicos.descricao IS 'Descrição opcional do serviço';
COMMENT ON COLUMN servicos.preco IS 'Preço do serviço em reais';
COMMENT ON COLUMN servicos.dias_notificacao_antes_vencimento IS 'Dias antes do vencimento para enviar notificação via WhatsApp';
