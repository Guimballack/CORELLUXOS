-- =============================================================================
-- CORELLUX OS ERP - SCHEMA MULTI-TENANT SUPABASE/POSTGRESQL
-- =============================================================================
-- INSTRUÇÃO DE USO:
--   1. Acesse o painel do Supabase do seu projeto.
--   2. No menu lateral, clique em "SQL Editor".
--   3. Cole TODO o conteúdo deste arquivo no editor.
--   4. Clique em "Run" para executar.
--   ATENÇÃO: Execute em ambiente de desenvolvimento/staging antes de produção.
--   Este script é IDEMPOTENTE: usa IF NOT EXISTS e ON CONFLICT DO NOTHING
--   para poder ser executado múltiplas vezes sem erros.
-- =============================================================================
-- Gerado em: 2026-06-06 | Projeto: Corellux OS ERP
-- =============================================================================


-- =============================================================================
-- SEÇÃO 1: TABELAS MASTER (sem empresa_id — nível de plataforma)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Planos SaaS disponíveis na plataforma
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planos (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              VARCHAR(100) NOT NULL,
  descricao         TEXT,
  preco_mensal      NUMERIC(10,2) DEFAULT 0,
  max_usuarios      INTEGER      DEFAULT 5,
  max_filiais       INTEGER      DEFAULT 1,
  max_storage_gb    INTEGER      DEFAULT 5,
  modulos_inclusos  TEXT[]       DEFAULT '{}',
  status            VARCHAR(20)  DEFAULT 'Ativo',  -- Ativo, Inativo
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE planos IS 'Planos de assinatura SaaS disponíveis na plataforma Corellux OS ERP.';

-- -----------------------------------------------------------------------------
-- Empresas (tenants) — cada empresa é um tenant isolado
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresas (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social     VARCHAR(200) NOT NULL,
  nome_fantasia    VARCHAR(150),
  cnpj             VARCHAR(20)  UNIQUE,
  email            VARCHAR(150),
  telefone         VARCHAR(50),
  endereco         JSONB,
  plano_id         UUID         REFERENCES planos(id),
  status           VARCHAR(20)  DEFAULT 'Ativo',         -- Ativo, Suspenso, Bloqueado
  login_usuario    VARCHAR(100) DEFAULT 'admin',
  login_senha      VARCHAR(100) DEFAULT 'password',
  data_cadastro    DATE         DEFAULT CURRENT_DATE,
  data_vencimento  DATE,
  logo_url         TEXT,
  configuracoes    JSONB        DEFAULT '{}',
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE empresas IS 'Tenants do sistema. Cada empresa representa um cliente SaaS isolado.';
COMMENT ON COLUMN empresas.status IS 'Ativo | Suspenso | Bloqueado';
COMMENT ON COLUMN empresas.configuracoes IS 'JSON livre para configurações específicas por tenant.';

-- -----------------------------------------------------------------------------
-- Módulos do sistema Corellux OS ERP
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS modulos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      VARCHAR(50) UNIQUE NOT NULL,  -- 'estoque', 'producao', 'pdv', etc.
  nome        VARCHAR(100) NOT NULL,
  descricao   TEXT,
  icone       VARCHAR(100),
  versao      VARCHAR(20) DEFAULT '1.0.0',
  status      VARCHAR(20) DEFAULT 'Ativo',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE modulos IS 'Catálogo de módulos funcionais disponíveis no sistema.';
COMMENT ON COLUMN modulos.codigo IS 'Identificador textual único do módulo: estoque, producao, pdv, financeiro, etc.';

-- -----------------------------------------------------------------------------
-- Módulos habilitados por empresa (licença de módulo por tenant)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresa_modulos (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID    NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  modulo_id   UUID    NOT NULL REFERENCES modulos(id),
  habilitado  BOOLEAN DEFAULT TRUE,
  data_inicio DATE    DEFAULT CURRENT_DATE,
  data_fim    DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, modulo_id)
);

COMMENT ON TABLE empresa_modulos IS 'Relação de quais módulos cada empresa tem habilitados.';

-- -----------------------------------------------------------------------------
-- Filiais por empresa (unidades de negócio dentro do tenant)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS filiais (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID         NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome        VARCHAR(150) NOT NULL,
  cnpj        VARCHAR(20),
  endereco    JSONB,
  telefone    VARCHAR(50),
  email       VARCHAR(150),
  status      VARCHAR(20)  DEFAULT 'Ativo',
  is_matriz   BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE filiais IS 'Filiais/unidades de cada empresa tenant. Uma empresa pode ter múltiplas filiais conforme o plano.';

-- -----------------------------------------------------------------------------
-- Usuários Master — super-administradores da plataforma Corellux
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS master_usuarios (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         VARCHAR(100) NOT NULL,
  email        VARCHAR(150) UNIQUE NOT NULL,
  senha_hash   TEXT         NOT NULL,
  nivel        VARCHAR(20)  DEFAULT 'MASTER',  -- MASTER, SUPORTE
  status       VARCHAR(20)  DEFAULT 'Ativo',
  ultimo_login TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE master_usuarios IS 'Usuários internos da Corellux com acesso total à plataforma.';
COMMENT ON COLUMN master_usuarios.nivel IS 'MASTER = acesso total; SUPORTE = acesso somente-leitura de dados dos tenants.';

-- -----------------------------------------------------------------------------
-- Auditoria global — registra ações de todos os tipos de usuário
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID        REFERENCES empresas(id),
  usuario_id       TEXT,                      -- pode ser UUID de master_usuario ou app_user
  usuario_nome     VARCHAR(100),
  usuario_tipo     VARCHAR(20),               -- MASTER, SUPORTE, ADMIN, GERENTE, OPERADOR
  acao             VARCHAR(50) NOT NULL,       -- LOGIN, LOGOUT, CREATE, UPDATE, DELETE, IMPERSONATE
  entidade         VARCHAR(100),              -- nome da tabela/recurso afetado
  entidade_id      TEXT,
  dados_anteriores JSONB,
  dados_novos      JSONB,
  ip               VARCHAR(50),
  user_agent       TEXT,
  motivo           TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'Log de auditoria global. Registra todas as ações relevantes de qualquer tipo de usuário.';
COMMENT ON COLUMN audit_log.acao IS 'LOGIN | LOGOUT | CREATE | UPDATE | DELETE | IMPERSONATE';

-- -----------------------------------------------------------------------------
-- Cobranças por empresa (histórico financeiro do SaaS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cobrancas (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          UUID         NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  descricao           VARCHAR(200),
  valor               NUMERIC(10,2) NOT NULL,
  vencimento          DATE         NOT NULL,
  status              VARCHAR(20)  DEFAULT 'Pendente',   -- Pendente, Pago, Atrasado, Cancelado
  data_pagamento      DATE,
  referencia_externa  TEXT,        -- ID de gateway de pagamento externo
  observacoes         TEXT,
  created_at          TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE cobrancas IS 'Faturas e cobranças de assinatura SaaS por empresa.';
COMMENT ON COLUMN cobrancas.status IS 'Pendente | Pago | Atrasado | Cancelado';

-- -----------------------------------------------------------------------------
-- Licenças por empresa (controle de licenciamento de módulos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS licencas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  modulo_id   UUID        REFERENCES modulos(id),
  tipo        VARCHAR(50),                   -- mensal, anual, vitalicia
  quantidade  INTEGER     DEFAULT 1,
  data_inicio DATE        DEFAULT CURRENT_DATE,
  data_fim    DATE,
  status      VARCHAR(20) DEFAULT 'Ativa',   -- Ativa, Expirada, Cancelada
  chave       VARCHAR(100) UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE licencas IS 'Licenças de módulos concedidas a cada empresa tenant.';

-- -----------------------------------------------------------------------------
-- Métricas de uso por empresa (telemetria diária)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metricas_uso (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID          NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  data                  DATE          NOT NULL DEFAULT CURRENT_DATE,
  usuarios_ativos       INTEGER       DEFAULT 0,
  vendas_registradas    INTEGER       DEFAULT 0,
  documentos_emitidos   INTEGER       DEFAULT 0,
  storage_usado_mb      NUMERIC(10,2) DEFAULT 0,
  api_calls             INTEGER       DEFAULT 0,
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE(empresa_id, data)
);

COMMENT ON TABLE metricas_uso IS 'Snapshot diário de métricas de uso por empresa. Usado para billing e monitoramento.';

-- -----------------------------------------------------------------------------
-- Sessões de impersonação — "Entrar como Cliente" pelo suporte/master
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  master_usuario_id   UUID        NOT NULL REFERENCES master_usuarios(id),
  empresa_id          UUID        NOT NULL REFERENCES empresas(id),
  ip                  VARCHAR(50),
  motivo              TEXT,
  iniciado_em         TIMESTAMPTZ DEFAULT NOW(),
  encerrado_em        TIMESTAMPTZ
);

COMMENT ON TABLE impersonation_sessions IS 'Registro de sessões em que um usuário master acessou o sistema como um tenant específico.';


-- =============================================================================
-- SEÇÃO 2: MIGRAÇÃO DAS TABELAS EXISTENTES
-- Adiciona empresa_id e filial_id onde necessário.
-- Todos os blocos são idempotentes (IF NOT EXISTS).
-- =============================================================================

-- --- app_users ---

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE app_users ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    RAISE NOTICE 'Coluna empresa_id adicionada em app_users';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'filial_id'
  ) THEN
    ALTER TABLE app_users ADD COLUMN filial_id UUID REFERENCES filiais(id);
    RAISE NOTICE 'Coluna filial_id adicionada em app_users';
  END IF;
END $$;

-- --- products ---

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE products ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    RAISE NOTICE 'Coluna empresa_id adicionada em products';
  END IF;
END $$;

-- --- suppliers ---

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    RAISE NOTICE 'Coluna empresa_id adicionada em suppliers';
  END IF;
END $$;

-- --- categories ---

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE categories ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    RAISE NOTICE 'Coluna empresa_id adicionada em categories';
  END IF;
END $$;

-- --- sale_product_categories ---

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sale_product_categories' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE sale_product_categories ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    RAISE NOTICE 'Coluna empresa_id adicionada em sale_product_categories';
  END IF;
END $$;

-- --- sectors ---

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sectors' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE sectors ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    RAISE NOTICE 'Coluna empresa_id adicionada em sectors';
  END IF;
END $$;

-- --- areas ---

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'areas' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE areas ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    RAISE NOTICE 'Coluna empresa_id adicionada em areas';
  END IF;
END $$;

-- --- stock_batches ---

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_batches' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE stock_batches ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    RAISE NOTICE 'Coluna empresa_id adicionada em stock_batches';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_batches' AND column_name = 'filial_id'
  ) THEN
    ALTER TABLE stock_batches ADD COLUMN filial_id UUID REFERENCES filiais(id);
    RAISE NOTICE 'Coluna filial_id adicionada em stock_batches';
  END IF;
END $$;

-- --- sale_products ---

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sale_products' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE sale_products ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    RAISE NOTICE 'Coluna empresa_id adicionada em sale_products';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sale_products' AND column_name = 'filial_id'
  ) THEN
    ALTER TABLE sale_products ADD COLUMN filial_id UUID REFERENCES filiais(id);
    RAISE NOTICE 'Coluna filial_id adicionada em sale_products';
  END IF;
END $$;

-- --- wms_warehouses ---

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wms_warehouses' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE wms_warehouses ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    RAISE NOTICE 'Coluna empresa_id adicionada em wms_warehouses';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wms_warehouses' AND column_name = 'filial_id'
  ) THEN
    ALTER TABLE wms_warehouses ADD COLUMN filial_id UUID REFERENCES filiais(id);
    RAISE NOTICE 'Coluna filial_id adicionada em wms_warehouses';
  END IF;
END $$;

-- --- wms_zones ---

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wms_zones' AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE wms_zones ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    RAISE NOTICE 'Coluna empresa_id adicionada em wms_zones';
  END IF;
END $$;


-- =============================================================================
-- SEÇÃO 3: ÍNDICES DE PERFORMANCE
-- Índices em empresa_id agilizam queries multi-tenant
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_app_users_empresa_id             ON app_users(empresa_id);
CREATE INDEX IF NOT EXISTS idx_app_users_filial_id              ON app_users(filial_id);
CREATE INDEX IF NOT EXISTS idx_products_empresa_id              ON products(empresa_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_empresa_id             ON suppliers(empresa_id);
CREATE INDEX IF NOT EXISTS idx_categories_empresa_id            ON categories(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sale_product_categories_emp      ON sale_product_categories(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sectors_empresa_id               ON sectors(empresa_id);
CREATE INDEX IF NOT EXISTS idx_areas_empresa_id                 ON areas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_stock_batches_empresa_id         ON stock_batches(empresa_id);
CREATE INDEX IF NOT EXISTS idx_stock_batches_filial_id          ON stock_batches(filial_id);
CREATE INDEX IF NOT EXISTS idx_sale_products_empresa_id         ON sale_products(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sale_products_filial_id          ON sale_products(filial_id);
CREATE INDEX IF NOT EXISTS idx_wms_warehouses_empresa_id        ON wms_warehouses(empresa_id);
CREATE INDEX IF NOT EXISTS idx_wms_warehouses_filial_id         ON wms_warehouses(filial_id);
CREATE INDEX IF NOT EXISTS idx_wms_zones_empresa_id             ON wms_zones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_modulos_empresa_id       ON empresa_modulos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_filiais_empresa_id               ON filiais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_empresa_id             ON cobrancas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_licencas_empresa_id              ON licencas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_metricas_uso_empresa_data        ON metricas_uso(empresa_id, data);
CREATE INDEX IF NOT EXISTS idx_audit_log_empresa_id             ON audit_log(empresa_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at             ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_empresa_id         ON impersonation_sessions(empresa_id);


-- =============================================================================
-- SEÇÃO 4: SEED INICIAL
-- Dados obrigatórios para o funcionamento do sistema
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4.1 Planos SaaS padrão
-- -----------------------------------------------------------------------------
INSERT INTO planos (nome, descricao, preco_mensal, max_usuarios, max_filiais, max_storage_gb, modulos_inclusos)
VALUES
  (
    'Starter',
    'Plano básico para pequenas empresas. Inclui gestão de estoque e PDV.',
    149.90, 5, 1, 5,
    ARRAY['estoque', 'pdv']
  ),
  (
    'Professional',
    'Plano completo para empresas em crescimento. Inclui módulos financeiros e de produção.',
    349.90, 20, 3, 20,
    ARRAY['estoque', 'pdv', 'financeiro', 'producao', 'checklist']
  ),
  (
    'Enterprise',
    'Plano ilimitado para grandes operações. Todos os módulos inclusos.',
    749.90, 999, 999, 999,
    ARRAY['estoque', 'pdv', 'financeiro', 'producao', 'checklist', 'fiscal', 'rh', 'crm', 'delivery', 'ged', 'patrimonio', 'kpi']
  )
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4.2 Módulos do sistema Corellux OS ERP
-- -----------------------------------------------------------------------------
INSERT INTO modulos (codigo, nome, descricao, icone) VALUES
  ('estoque',     'Estoque & WMS',        'Controle de estoque, lotes e armazém',                       'boxes'),
  ('producao',    'Produção',             'Fichas técnicas, subprodutos e ordens de produção',           'factory'),
  ('pdv',         'PDV & Vendas',         'Ponto de venda, cardápio e pedidos',                         'shopping-cart'),
  ('financeiro',  'Financeiro',           'Contas, fluxo de caixa e DRE',                               'dollar-sign'),
  ('fiscal',      'Fiscal & NF-e',        'Emissão de notas fiscais e SPED',                            'file-text'),
  ('checklist',   'Checklist',            'Modelos e execução de checklists operacionais',               'check-square'),
  ('patrimonio',  'Patrimônio',           'Gestão de ativos e materiais operacionais',                  'package'),
  ('rh',          'RH & Pessoas',         'Folha de pagamento, ponto e escalas',                        'users'),
  ('crm',         'CRM & Clientes',       'Gestão de clientes e relacionamento',                        'heart'),
  ('delivery',    'Delivery',             'Gestão de entregas e rastreamento',                          'truck'),
  ('ged',         'GED & Documentos',     'Gestão eletrônica de documentos',                            'folder'),
  ('kpi',         'KPIs & Analytics',     'Painéis de indicadores e metas',                             'bar-chart-2')
ON CONFLICT (codigo) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4.3 Empresa padrão — Bella Italia (tenant de demonstração)
-- -----------------------------------------------------------------------------
INSERT INTO empresas (id, razao_social, nome_fantasia, email, status, data_cadastro)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'BELLA ITALIA PIZZARIA LTDA',
  'Bella Italia',
  'admin@bellaitalia.com.br',
  'Ativo',
  CURRENT_DATE
)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4.4 Filial padrão — Matriz da Bella Italia
-- -----------------------------------------------------------------------------
INSERT INTO filiais (id, empresa_id, nome, status, is_matriz)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Matriz',
  'Ativo',
  TRUE
)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4.5 Módulos habilitados para a empresa padrão (todos do plano Enterprise)
-- -----------------------------------------------------------------------------
INSERT INTO empresa_modulos (empresa_id, modulo_id, habilitado)
SELECT
  '00000000-0000-0000-0000-000000000001',
  id,
  TRUE
FROM modulos
ON CONFLICT (empresa_id, modulo_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4.6 Vincular dados existentes à empresa e filial padrão
-- -----------------------------------------------------------------------------
UPDATE app_users
SET
  empresa_id = '00000000-0000-0000-0000-000000000001',
  filial_id  = '00000000-0000-0000-0000-000000000002'
WHERE empresa_id IS NULL;

UPDATE products
SET empresa_id = '00000000-0000-0000-0000-000000000001'
WHERE empresa_id IS NULL;

UPDATE suppliers
SET empresa_id = '00000000-0000-0000-0000-000000000001'
WHERE empresa_id IS NULL;

UPDATE categories
SET empresa_id = '00000000-0000-0000-0000-000000000001'
WHERE empresa_id IS NULL;

UPDATE sale_product_categories
SET empresa_id = '00000000-0000-0000-0000-000000000001'
WHERE empresa_id IS NULL;

UPDATE sectors
SET empresa_id = '00000000-0000-0000-0000-000000000001'
WHERE empresa_id IS NULL;

UPDATE areas
SET empresa_id = '00000000-0000-0000-0000-000000000001'
WHERE empresa_id IS NULL;

UPDATE stock_batches
SET
  empresa_id = '00000000-0000-0000-0000-000000000001',
  filial_id  = '00000000-0000-0000-0000-000000000002'
WHERE empresa_id IS NULL;

UPDATE sale_products
SET
  empresa_id = '00000000-0000-0000-0000-000000000001',
  filial_id  = '00000000-0000-0000-0000-000000000002'
WHERE empresa_id IS NULL;

UPDATE wms_warehouses
SET
  empresa_id = '00000000-0000-0000-0000-000000000001',
  filial_id  = '00000000-0000-0000-0000-000000000002'
WHERE empresa_id IS NULL;

UPDATE wms_zones
SET empresa_id = '00000000-0000-0000-0000-000000000001'
WHERE empresa_id IS NULL;

-- -----------------------------------------------------------------------------
-- 4.7 Usuário Master padrão da plataforma Corellux
-- ATENÇÃO: Substitua o senha_hash por um hash bcrypt real antes de ir para
--          produção. Nunca use o placeholder abaixo em produção.
-- -----------------------------------------------------------------------------
INSERT INTO master_usuarios (nome, email, senha_hash, nivel)
VALUES (
  'Super Administrador',
  'master@corellux.com.br',
  '$2b$10$SUBSTITUA_ESTE_HASH_POR_UM_BCRYPT_REAL_EM_PRODUCAO',
  'MASTER'
)
ON CONFLICT (email) DO NOTHING;


-- =============================================================================
-- SEÇÃO 5: ROW LEVEL SECURITY (RLS)
-- Garante isolamento de dados entre tenants na camada do banco de dados.
-- A política usa current_setting('app.empresa_id') definido pela aplicação.
-- Usuários master (app.is_master = 'true') têm acesso irrestrito.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 5.1 Habilitar RLS nas tabelas operacionais existentes
-- -----------------------------------------------------------------------------
ALTER TABLE app_users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_batches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_warehouses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_zones               ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS nas tabelas novas com empresa_id
ALTER TABLE filiais                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_modulos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobrancas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE licencas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_uso            ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log               ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 5.2 Remover políticas antigas (para re-execução segura do script)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_app_users               ON app_users;
DROP POLICY IF EXISTS rls_products                ON products;
DROP POLICY IF EXISTS rls_suppliers               ON suppliers;
DROP POLICY IF EXISTS rls_categories              ON categories;
DROP POLICY IF EXISTS rls_sale_product_categories ON sale_product_categories;
DROP POLICY IF EXISTS rls_sectors                 ON sectors;
DROP POLICY IF EXISTS rls_areas                   ON areas;
DROP POLICY IF EXISTS rls_stock_batches           ON stock_batches;
DROP POLICY IF EXISTS rls_sale_products           ON sale_products;
DROP POLICY IF EXISTS rls_wms_warehouses          ON wms_warehouses;
DROP POLICY IF EXISTS rls_wms_zones               ON wms_zones;
DROP POLICY IF EXISTS rls_filiais                 ON filiais;
DROP POLICY IF EXISTS rls_empresa_modulos         ON empresa_modulos;
DROP POLICY IF EXISTS rls_cobrancas               ON cobrancas;
DROP POLICY IF EXISTS rls_licencas                ON licencas;
DROP POLICY IF EXISTS rls_metricas_uso            ON metricas_uso;
DROP POLICY IF EXISTS rls_impersonation_sessions  ON impersonation_sessions;
DROP POLICY IF EXISTS rls_audit_log               ON audit_log;

-- -----------------------------------------------------------------------------
-- 5.3 Políticas RLS — Tabelas operacionais existentes
--
-- Lógica padrão:
--   - Acesso permitido se empresa_id da linha = empresa_id da sessão (app.empresa_id)
--   - OU se o usuário for master (app.is_master = 'true')
--   - O current_setting com segundo argumento TRUE retorna NULL (não erro) se
--     a variável não estiver definida, garantindo segurança por padrão.
-- -----------------------------------------------------------------------------

CREATE POLICY rls_app_users ON app_users
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR current_setting('app.is_master', TRUE) = 'true'
  );

CREATE POLICY rls_products ON products
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR current_setting('app.is_master', TRUE) = 'true'
  );

CREATE POLICY rls_suppliers ON suppliers
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR current_setting('app.is_master', TRUE) = 'true'
  );

CREATE POLICY rls_categories ON categories
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR current_setting('app.is_master', TRUE) = 'true'
  );

CREATE POLICY rls_sale_product_categories ON sale_product_categories
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR current_setting('app.is_master', TRUE) = 'true'
  );

CREATE POLICY rls_sectors ON sectors
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR current_setting('app.is_master', TRUE) = 'true'
  );

CREATE POLICY rls_areas ON areas
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR current_setting('app.is_master', TRUE) = 'true'
  );

CREATE POLICY rls_stock_batches ON stock_batches
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR current_setting('app.is_master', TRUE) = 'true'
  );

CREATE POLICY rls_sale_products ON sale_products
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR current_setting('app.is_master', TRUE) = 'true'
  );

CREATE POLICY rls_wms_warehouses ON wms_warehouses
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR current_setting('app.is_master', TRUE) = 'true'
  );

CREATE POLICY rls_wms_zones ON wms_zones
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR current_setting('app.is_master', TRUE) = 'true'
  );

-- -----------------------------------------------------------------------------
-- 5.4 Políticas RLS — Tabelas novas com empresa_id
-- -----------------------------------------------------------------------------

CREATE POLICY rls_filiais ON filiais
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR current_setting('app.is_master', TRUE) = 'true'
  );

CREATE POLICY rls_empresa_modulos ON empresa_modulos
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR current_setting('app.is_master', TRUE) = 'true'
  );

CREATE POLICY rls_cobrancas ON cobrancas
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR current_setting('app.is_master', TRUE) = 'true'
  );

CREATE POLICY rls_licencas ON licencas
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR current_setting('app.is_master', TRUE) = 'true'
  );

CREATE POLICY rls_metricas_uso ON metricas_uso
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR current_setting('app.is_master', TRUE) = 'true'
  );

-- Impersonation: master vê tudo; empresa vê apenas as próprias sessões
CREATE POLICY rls_impersonation_sessions ON impersonation_sessions
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR current_setting('app.is_master', TRUE) = 'true'
  );

-- Audit log: empresa vê apenas seu próprio log; master vê tudo
CREATE POLICY rls_audit_log ON audit_log
  AS PERMISSIVE
  FOR ALL
  USING (
    empresa_id::TEXT = current_setting('app.empresa_id', TRUE)
    OR empresa_id IS NULL  -- logs de sistema sem empresa vinculada
    OR current_setting('app.is_master', TRUE) = 'true'
  );


-- =============================================================================
-- SEÇÃO 6: FUNÇÕES HELPER
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 6.1 set_tenant_context — Define o contexto de sessão para o tenant
-- Deve ser chamada no início de cada transação/request da aplicação.
--
-- Uso (na aplicação Node/Python/etc.):
--   SELECT set_tenant_context('UUID-da-empresa');          -- usuário normal
--   SELECT set_tenant_context('UUID-da-empresa', TRUE);   -- modo master
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_tenant_context(
  p_empresa_id  TEXT,
  p_is_master   BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- TRUE como terceiro argumento = local para a transação atual
  PERFORM set_config('app.empresa_id', p_empresa_id,       TRUE);
  PERFORM set_config('app.is_master',  p_is_master::TEXT,  TRUE);
END;
$$;

COMMENT ON FUNCTION set_tenant_context IS
  'Define o contexto de tenant para a sessão/transação atual. '
  'Deve ser chamada antes de qualquer query em tabelas com RLS. '
  'p_is_master = TRUE concede visibilidade a todos os tenants (uso interno Corellux).';

-- -----------------------------------------------------------------------------
-- 6.2 get_current_empresa_id — Retorna o empresa_id da sessão atual
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_empresa_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN current_setting('app.empresa_id', TRUE)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION get_current_empresa_id IS
  'Retorna o empresa_id (UUID) configurado na sessão atual. Retorna NULL se não definido.';

-- -----------------------------------------------------------------------------
-- 6.3 is_master_session — Verifica se a sessão atual é de um usuário master
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_master_session()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN current_setting('app.is_master', TRUE) = 'true';
END;
$$;

COMMENT ON FUNCTION is_master_session IS
  'Retorna TRUE se a sessão atual for de um usuário master da plataforma.';

-- -----------------------------------------------------------------------------
-- 6.4 updated_at_trigger — Atualiza automaticamente updated_at nas empresas
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_empresas ON empresas;

CREATE TRIGGER set_updated_at_empresas
  BEFORE UPDATE ON empresas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

COMMENT ON TRIGGER set_updated_at_empresas ON empresas IS
  'Atualiza automaticamente o campo updated_at na tabela empresas a cada UPDATE.';


-- =============================================================================
-- SEÇÃO 7: VERIFICAÇÃO FINAL
-- Exibe um resumo das tabelas criadas/modificadas para confirmação visual.
-- =============================================================================

DO $$
DECLARE
  v_planos           INTEGER;
  v_modulos          INTEGER;
  v_empresas         INTEGER;
  v_filiais          INTEGER;
  v_master_usuarios  INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_planos           FROM planos;
  SELECT COUNT(*) INTO v_modulos          FROM modulos;
  SELECT COUNT(*) INTO v_empresas         FROM empresas;
  SELECT COUNT(*) INTO v_filiais          FROM filiais;
  SELECT COUNT(*) INTO v_master_usuarios  FROM master_usuarios;

  RAISE NOTICE '========================================================';
  RAISE NOTICE '  CORELLUX OS ERP — Schema Multi-Tenant Aplicado!';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '  Planos cadastrados   : %', v_planos;
  RAISE NOTICE '  Módulos cadastrados  : %', v_modulos;
  RAISE NOTICE '  Empresas (tenants)   : %', v_empresas;
  RAISE NOTICE '  Filiais cadastradas  : %', v_filiais;
  RAISE NOTICE '  Usuários master      : %', v_master_usuarios;
  RAISE NOTICE '========================================================';
  RAISE NOTICE '  RLS habilitado em 18 tabelas.';
  RAISE NOTICE '  Índices de performance criados.';
  RAISE NOTICE '  Funções helper registradas.';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '  ATENÇÃO: Atualize o senha_hash do master_usuarios';
  RAISE NOTICE '  antes de ir para produção!';
  RAISE NOTICE '========================================================';
END;
$$;

-- =============================================================================
-- FIM DO SCRIPT — CORELLUX OS ERP MULTI-TENANT SCHEMA
-- =============================================================================
