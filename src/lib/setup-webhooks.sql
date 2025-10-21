-- Script para configurar webhooks padrão
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a tabela n8n_config existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'n8n_config'
);

-- 2. Criar tabela se não existir
CREATE TABLE IF NOT EXISTS n8n_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cartorio_id UUID REFERENCES cartorios(id) ON DELETE CASCADE NOT NULL,
    webhook_url TEXT,
    webhook_resumo_matricula TEXT,
    webhook_analise_malote TEXT,
    webhook_minuta_documento TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Adicionar colunas específicas se a tabela já existir
DO $$ 
BEGIN
    -- Adicionar webhook_resumo_matricula se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'n8n_config' 
                   AND column_name = 'webhook_resumo_matricula') THEN
        ALTER TABLE n8n_config ADD COLUMN webhook_resumo_matricula TEXT;
    END IF;
    
    -- Adicionar webhook_analise_malote se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'n8n_config' 
                   AND column_name = 'webhook_analise_malote') THEN
        ALTER TABLE n8n_config ADD COLUMN webhook_analise_malote TEXT;
    END IF;
    
    -- Adicionar webhook_minuta_documento se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'n8n_config' 
                   AND column_name = 'webhook_minuta_documento') THEN
        ALTER TABLE n8n_config ADD COLUMN webhook_minuta_documento TEXT;
    END IF;
END $$;

-- 4. Configurar webhooks padrão para todos os cartórios
INSERT INTO n8n_config (
  cartorio_id,
  webhook_url,
  webhook_resumo_matricula,
  webhook_analise_malote,
  webhook_minuta_documento,
  ativo
)
SELECT 
  c.id as cartorio_id,
  'https://webhook.conversix.com.br/webhook/generic' as webhook_url,
  'https://webhook.conversix.com.br/webhook/resumo-matricula' as webhook_resumo_matricula,
  'https://webhook.conversix.com.br/webhook/resumo-malote-eletronico' as webhook_analise_malote,
  'https://webhook.conversix.com.br/webhook/minuta-compra-e-venda' as webhook_minuta_documento,
  true as ativo
FROM cartorios c
WHERE NOT EXISTS (
  SELECT 1 FROM n8n_config n 
  WHERE n.cartorio_id = c.id
);

-- 5. Atualizar configurações existentes com webhooks padrão
UPDATE n8n_config 
SET 
  webhook_resumo_matricula = 'https://webhook.conversix.com.br/webhook/resumo-matricula',
  webhook_analise_malote = 'https://webhook.conversix.com.br/webhook/resumo-malote-eletronico',
  webhook_minuta_documento = 'https://webhook.conversix.com.br/webhook/minuta-compra-e-venda',
  updated_at = NOW()
WHERE ativo = true;

-- 6. Verificar configurações finais
SELECT 
  c.nome as cartorio_nome,
  n.webhook_url,
  n.webhook_resumo_matricula,
  n.webhook_analise_malote,
  n.webhook_minuta_documento,
  n.ativo,
  n.updated_at
FROM n8n_config n
JOIN cartorios c ON c.id = n.cartorio_id
WHERE n.ativo = true
ORDER BY c.nome;
