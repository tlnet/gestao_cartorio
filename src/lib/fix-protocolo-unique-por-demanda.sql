-- O número do protocolo no Levontech/TecnoCart é sequencial dentro de cada demanda
-- (ex.: demanda 64870 / protocolo 35), então ele se repete entre demandas e entre cartórios.
-- A restrição UNIQUE global em protocolos.protocolo impedia o cadastro com
-- "duplicate key value violates unique constraint".
-- Execute no Supabase SQL Editor

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Remove qualquer UNIQUE que tenha apenas a coluna "protocolo"
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'protocolos'
      AND con.contype = 'u'
      AND array_length(con.conkey, 1) = 1
      AND con.conkey[1] = (
        SELECT attnum FROM pg_attribute
        WHERE attrelid = rel.oid AND attname = 'protocolo'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.protocolos DROP CONSTRAINT %I', r.conname);
    RAISE NOTICE 'Constraint % removida.', r.conname;
  END LOOP;

  -- Remove índices únicos avulsos somente sobre "protocolo"
  FOR r IN
    SELECT i.relname AS indexname
    FROM pg_index ix
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_namespace nsp ON nsp.oid = t.relnamespace
    WHERE nsp.nspname = 'public'
      AND t.relname = 'protocolos'
      AND ix.indisunique
      AND NOT ix.indisprimary
      AND ix.indnatts = 1
      AND ix.indkey[0] = (
        SELECT attnum FROM pg_attribute
        WHERE attrelid = t.oid AND attname = 'protocolo'
      )
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', r.indexname);
    RAISE NOTICE 'Índice % removido.', r.indexname;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_protocolos_cartorio_demanda_protocolo
  ON public.protocolos (cartorio_id, demanda, protocolo);

CREATE INDEX IF NOT EXISTS idx_protocolos_protocolo
  ON public.protocolos (protocolo);
