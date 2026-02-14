-- Corrige a constraint users_role_check para permitir os valores: admin, atendente, financeiro.
-- Erro: "new row for relation "users" violates check constraint "users_role_check""

-- 1. Remover a constraint antiga (que provavelmente só permitia admin e atendente)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Adicionar nova constraint permitindo admin, atendente e financeiro
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IS NULL OR role IN ('admin', 'atendente', 'financeiro'));
