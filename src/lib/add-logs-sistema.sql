-- =====================================================
-- Logs do sistema (auditoria de movimentações dos usuários)
-- Execute no Supabase SQL Editor.
-- =====================================================
-- A escrita acontece somente via service role (rota /api/logs e rotas admin),
-- para que o registro não possa ser forjado nem apagado pelo cliente.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.logs_sistema (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

    -- Autor da ação. Os snapshots de nome/e-mail preservam o log mesmo que o
    -- usuário seja excluído depois.
    usuario_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    usuario_nome TEXT,
    usuario_email TEXT,
    usuario_perfil TEXT,

    cartorio_id UUID REFERENCES public.cartorios(id) ON DELETE SET NULL,
    cartorio_nome TEXT,

    -- Ex.: 'protocolo.status_alterado'. Categoria agrupa na tela de logs.
    acao TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'sistema',
    descricao TEXT NOT NULL,

    -- Recurso afetado (tabela/identificador), quando houver
    entidade TEXT,
    entidade_id TEXT,

    metadata JSONB,
    rota TEXT,
    ip TEXT,
    user_agent TEXT,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.logs_sistema IS
  'Trilha de auditoria das movimentações dos usuários. Escrita apenas via service role.';

CREATE INDEX IF NOT EXISTS idx_logs_sistema_created_at
  ON public.logs_sistema (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_sistema_usuario
  ON public.logs_sistema (usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_sistema_cartorio
  ON public.logs_sistema (cartorio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_sistema_categoria
  ON public.logs_sistema (categoria, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_sistema_acao
  ON public.logs_sistema (acao, created_at DESC);

-- RLS sem policies: nenhum cliente (anon/authenticated) lê ou escreve
-- diretamente. Leitura e escrita passam pela API com service role, que ignora
-- RLS e valida o perfil admin_geral.
ALTER TABLE public.logs_sistema ENABLE ROW LEVEL SECURITY;

-- Limpeza opcional de logs antigos (chame por um cron/manualmente).
CREATE OR REPLACE FUNCTION public.limpar_logs_sistema(dias INTEGER DEFAULT 180)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  removidos INTEGER;
BEGIN
  DELETE FROM public.logs_sistema
  WHERE created_at < NOW() - (dias || ' days')::INTERVAL;
  GET DIAGNOSTICS removidos = ROW_COUNT;
  RETURN removidos;
END;
$$;
