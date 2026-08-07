-- Amplia o limite do nome de status personalizado de 50 para 100 caracteres
-- Execute no Supabase SQL Editor
-- Também alinha colunas que armazenam o nome do status em protocolos/histórico
--
-- Observação: views que dependem de protocolos.status (ex.: dashboard_view)
-- são removidas temporariamente e recriadas após o ALTER.

DO $$
DECLARE
  r record;
  v_defs text[] := ARRAY[]::text[];
  v_names text[] := ARRAY[]::text[];
  i int;
BEGIN
  -- 1) Captura definição das views que dependem de protocolos.status
  FOR r IN
    SELECT DISTINCT
      n.nspname AS schemaname,
      c.relname AS viewname,
      pg_get_viewdef(c.oid, true) AS definition
    FROM pg_depend d
    JOIN pg_rewrite rw ON rw.oid = d.objid
    JOIN pg_class c ON c.oid = rw.ev_class AND c.relkind = 'v'
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class src ON src.oid = d.refobjid
    JOIN pg_namespace sn ON sn.oid = src.relnamespace
    JOIN pg_attribute a
      ON a.attrelid = d.refobjid
     AND a.attnum = d.refobjsubid
    WHERE sn.nspname = 'public'
      AND src.relname = 'protocolos'
      AND a.attname = 'status'
  LOOP
    v_names := array_append(v_names, format('%I.%I', r.schemaname, r.viewname));
    v_defs := array_append(v_defs, r.definition);
  END LOOP;

  -- 2) Remove as views dependentes
  IF array_length(v_names, 1) IS NOT NULL THEN
    FOR i IN 1 .. array_length(v_names, 1) LOOP
      EXECUTE format('DROP VIEW IF EXISTS %s CASCADE', v_names[i]);
    END LOOP;
  END IF;

  -- 3) Altera as colunas
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'status_personalizados'
      AND column_name = 'nome'
  ) THEN
    ALTER TABLE status_personalizados
      ALTER COLUMN nome TYPE VARCHAR(100);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'protocolos'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE protocolos
      ALTER COLUMN status TYPE VARCHAR(100);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'historico_protocolos'
      AND column_name = 'status_anterior'
  ) THEN
    ALTER TABLE historico_protocolos
      ALTER COLUMN status_anterior TYPE VARCHAR(100);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'historico_protocolos'
      AND column_name = 'novo_status'
  ) THEN
    ALTER TABLE historico_protocolos
      ALTER COLUMN novo_status TYPE VARCHAR(100);
  END IF;

  -- 4) Recria as views na ordem inversa (dependências)
  IF array_length(v_names, 1) IS NOT NULL THEN
    FOR i IN REVERSE 1 .. array_length(v_names, 1) LOOP
      EXECUTE format('CREATE OR REPLACE VIEW %s AS %s', v_names[i], v_defs[i]);
    END LOOP;
  END IF;
END $$;

COMMENT ON COLUMN status_personalizados.nome IS 'Nome do status personalizado (até 100 caracteres)';
