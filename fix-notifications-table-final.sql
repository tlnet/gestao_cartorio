-- Script final para corrigir a tabela notificacoes
-- Este script verifica e corrige todos os problemas possíveis

-- 1. Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notificacoes') THEN
        RAISE NOTICE 'Tabela notificacoes não existe. Criando...';
        
        CREATE TABLE notificacoes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            usuario_id UUID NOT NULL,
            cartorio_id UUID,
            protocolo_id UUID,
            tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('prazo_vencimento', 'relatorio_ia', 'geral', 'info')),
            titulo VARCHAR(255) NOT NULL,
            mensagem TEXT NOT NULL,
            prioridade VARCHAR(20) DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
            lida BOOLEAN DEFAULT FALSE,
            data_notificacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            data_vencimento DATE,
            metadata JSONB,
            action_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Criar índices
        CREATE INDEX idx_notificacoes_usuario_id ON notificacoes(usuario_id);
        CREATE INDEX idx_notificacoes_cartorio_id ON notificacoes(cartorio_id);
        CREATE INDEX idx_notificacoes_protocolo_id ON notificacoes(protocolo_id);
        CREATE INDEX idx_notificacoes_tipo ON notificacoes(tipo);
        CREATE INDEX idx_notificacoes_prioridade ON notificacoes(prioridade);
        CREATE INDEX idx_notificacoes_lida ON notificacoes(lida);
        CREATE INDEX idx_notificacoes_data_notificacao ON notificacoes(data_notificacao);
        
        -- Habilitar RLS
        ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
        
        -- Criar políticas RLS
        CREATE POLICY "Usuários podem ver suas próprias notificações" ON notificacoes
            FOR SELECT USING (usuario_id = auth.uid());
            
        CREATE POLICY "Usuários podem inserir suas próprias notificações" ON notificacoes
            FOR INSERT WITH CHECK (usuario_id = auth.uid());
            
        CREATE POLICY "Usuários podem atualizar suas próprias notificações" ON notificacoes
            FOR UPDATE USING (usuario_id = auth.uid());
            
        CREATE POLICY "Usuários podem deletar suas próprias notificações" ON notificacoes
            FOR DELETE USING (usuario_id = auth.uid());
            
        RAISE NOTICE 'Tabela notificacoes criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela notificacoes já existe. Verificando estrutura...';
    END IF;
END $$;

-- 2. Verificar e corrigir colunas faltantes
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Verificar se cartorio_id existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notificacoes' AND column_name = 'cartorio_id'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE notificacoes ADD COLUMN cartorio_id UUID;
        CREATE INDEX IF NOT EXISTS idx_notificacoes_cartorio_id ON notificacoes(cartorio_id);
        RAISE NOTICE 'Coluna cartorio_id adicionada';
    END IF;
    
    -- Verificar se protocolo_id existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notificacoes' AND column_name = 'protocolo_id'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE notificacoes ADD COLUMN protocolo_id UUID;
        CREATE INDEX IF NOT EXISTS idx_notificacoes_protocolo_id ON notificacoes(protocolo_id);
        RAISE NOTICE 'Coluna protocolo_id adicionada';
    END IF;
    
    -- Verificar se prioridade existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notificacoes' AND column_name = 'prioridade'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE notificacoes ADD COLUMN prioridade VARCHAR(20) DEFAULT 'normal';
        CREATE INDEX IF NOT EXISTS idx_notificacoes_prioridade ON notificacoes(prioridade);
        RAISE NOTICE 'Coluna prioridade adicionada';
    END IF;
    
    -- Verificar se data_notificacao existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notificacoes' AND column_name = 'data_notificacao'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE notificacoes ADD COLUMN data_notificacao TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        CREATE INDEX IF NOT EXISTS idx_notificacoes_data_notificacao ON notificacoes(data_notificacao);
        RAISE NOTICE 'Coluna data_notificacao adicionada';
    END IF;
    
    -- Verificar se data_vencimento existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notificacoes' AND column_name = 'data_vencimento'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE notificacoes ADD COLUMN data_vencimento DATE;
        RAISE NOTICE 'Coluna data_vencimento adicionada';
    END IF;
    
    -- Verificar se metadata existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notificacoes' AND column_name = 'metadata'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE notificacoes ADD COLUMN metadata JSONB;
        RAISE NOTICE 'Coluna metadata adicionada';
    END IF;
    
    -- Verificar se action_url existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notificacoes' AND column_name = 'action_url'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE notificacoes ADD COLUMN action_url TEXT;
        RAISE NOTICE 'Coluna action_url adicionada';
    END IF;
    
    -- Verificar se created_at existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notificacoes' AND column_name = 'created_at'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE notificacoes ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Coluna created_at adicionada';
    END IF;
    
    -- Verificar se updated_at existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notificacoes' AND column_name = 'updated_at'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE notificacoes ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Coluna updated_at adicionada';
    END IF;
END $$;

-- 3. Corrigir constraints se necessário
DO $$
BEGIN
    -- Remover constraint de tipo se existir e recriar
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'notificacoes_tipo_check'
    ) THEN
        ALTER TABLE notificacoes DROP CONSTRAINT notificacoes_tipo_check;
        RAISE NOTICE 'Constraint notificacoes_tipo_check removida';
    END IF;
    
    -- Recriar constraint de tipo
    ALTER TABLE notificacoes ADD CONSTRAINT notificacoes_tipo_check 
        CHECK (tipo IN ('prazo_vencimento', 'relatorio_ia', 'geral', 'info'));
    RAISE NOTICE 'Constraint notificacoes_tipo_check recriada';
    
    -- Remover constraint de prioridade se existir e recriar
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'notificacoes_prioridade_check'
    ) THEN
        ALTER TABLE notificacoes DROP CONSTRAINT notificacoes_prioridade_check;
        RAISE NOTICE 'Constraint notificacoes_prioridade_check removida';
    END IF;
    
    -- Recriar constraint de prioridade
    ALTER TABLE notificacoes ADD CONSTRAINT notificacoes_prioridade_check 
        CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente'));
    RAISE NOTICE 'Constraint notificacoes_prioridade_check recriada';
END $$;

-- 4. Verificar e corrigir RLS
DO $$
BEGIN
    -- Verificar se RLS está habilitado
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'notificacoes' AND relrowsecurity = true
    ) THEN
        ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS habilitado na tabela notificacoes';
    END IF;
    
    -- Verificar se as políticas existem
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notificacoes' AND policyname = 'Usuários podem ver suas próprias notificações'
    ) THEN
        CREATE POLICY "Usuários podem ver suas próprias notificações" ON notificacoes
            FOR SELECT USING (usuario_id = auth.uid());
        RAISE NOTICE 'Política de SELECT criada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notificacoes' AND policyname = 'Usuários podem inserir suas próprias notificações'
    ) THEN
        CREATE POLICY "Usuários podem inserir suas próprias notificações" ON notificacoes
            FOR INSERT WITH CHECK (usuario_id = auth.uid());
        RAISE NOTICE 'Política de INSERT criada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notificacoes' AND policyname = 'Usuários podem atualizar suas próprias notificações'
    ) THEN
        CREATE POLICY "Usuários podem atualizar suas próprias notificações" ON notificacoes
            FOR UPDATE USING (usuario_id = auth.uid());
        RAISE NOTICE 'Política de UPDATE criada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notificacoes' AND policyname = 'Usuários podem deletar suas próprias notificações'
    ) THEN
        CREATE POLICY "Usuários podem deletar suas próprias notificações" ON notificacoes
            FOR DELETE USING (usuario_id = auth.uid());
        RAISE NOTICE 'Política de DELETE criada';
    END IF;
END $$;

-- 5. Verificar estrutura final
SELECT 
    'Estrutura final da tabela notificacoes:' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notificacoes' 
ORDER BY ordinal_position;

-- 6. Verificar constraints
SELECT 
    'Constraints da tabela notificacoes:' as status,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'notificacoes'::regclass;

-- 7. Verificar políticas RLS
SELECT 
    'Políticas RLS da tabela notificacoes:' as status,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'notificacoes';

-- 8. Testar inserção
DO $$
DECLARE
    test_id UUID;
BEGIN
    -- Inserir notificação de teste
    INSERT INTO notificacoes (
        usuario_id,
        tipo,
        titulo,
        mensagem,
        prioridade,
        data_notificacao
    ) VALUES (
        '00000000-0000-0000-0000-000000000000'::UUID,
        'info',
        'Teste de Notificação',
        'Esta é uma notificação de teste',
        'normal',
        NOW()
    ) RETURNING id INTO test_id;
    
    RAISE NOTICE 'Notificação de teste inserida com ID: %', test_id;
    
    -- Remover notificação de teste
    DELETE FROM notificacoes WHERE id = test_id;
    RAISE NOTICE 'Notificação de teste removida';
    
    RAISE NOTICE 'Teste de inserção realizado com sucesso!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro no teste de inserção: %', SQLERRM;
END $$;
