-- =============================================
-- Corellux OS - Supabase RLS Policy Setup
-- Execute este script no SQL Editor do Supabase:
-- https://supabase.com/dashboard → seu projeto → SQL Editor → New Query → Cole e clique RUN
-- =============================================

-- ============================================================
-- PASSO 1: Habilitar RLS em todas as tabelas (caso não esteja)
-- ============================================================
ALTER TABLE app_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PASSO 2: Remover políticas antigas (evita conflitos)
-- ============================================================
DROP POLICY IF EXISTS "anon_all_app_users"     ON app_users;
DROP POLICY IF EXISTS "anon_all_categories"    ON categories;
DROP POLICY IF EXISTS "anon_all_products"      ON products;
DROP POLICY IF EXISTS "anon_all_suppliers"     ON suppliers;
DROP POLICY IF EXISTS "anon_all_sectors"       ON sectors;
DROP POLICY IF EXISTS "anon_all_areas"         ON areas;
DROP POLICY IF EXISTS "anon_all_stock_batches" ON stock_batches;

-- ============================================================
-- PASSO 3: Criar políticas permissivas para a role 'anon'
-- (permite SELECT, INSERT, UPDATE, DELETE sem autenticação JWT)
-- Adequado para ERP interno sem login via Supabase Auth.
-- ============================================================

-- app_users
CREATE POLICY "anon_all_app_users"
ON app_users
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- categories
CREATE POLICY "anon_all_categories"
ON categories
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- products
CREATE POLICY "anon_all_products"
ON products
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- suppliers
CREATE POLICY "anon_all_suppliers"
ON suppliers
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- sectors
CREATE POLICY "anon_all_sectors"
ON sectors
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- areas
CREATE POLICY "anon_all_areas"
ON areas
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- stock_batches
CREATE POLICY "anon_all_stock_batches"
ON stock_batches
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- ============================================================
-- VERIFICAÇÃO (opcional): Listar todas as políticas criadas
-- ============================================================
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
