-- Corellux OS ERP - Supabase Database Schema & Initial Seed
-- Copie e cole este script no Editor SQL (SQL Editor) do seu painel do Supabase e clique em RUN.

-- 1. LIMPAR TABELAS EXISTENTES (OPCIONAL, SE ESTIVER RECOMEÇANDO)
DROP TABLE IF EXISTS stock_batches CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS areas CASCADE;
DROP TABLE IF EXISTS sectors CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;

-- 2. CRIAR TABELA DE USUÁRIOS (Funcionários)
CREATE TABLE app_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    role VARCHAR(100) NOT NULL,
    img TEXT,
    avatar_fallback VARCHAR(5) NOT NULL,
    status VARCHAR(50) DEFAULT 'Ativo',
    access_level VARCHAR(100) NOT NULL,
    pin VARCHAR(4) NOT NULL,
    password VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    permissions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. CRIAR TABELA DE CATEGORIAS
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(100),
    color VARCHAR(100),
    description TEXT,
    status VARCHAR(50) DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. CRIAR TABELA DE PRODUTOS
CREATE TABLE products (
    sku VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    brand VARCHAR(100),
    description TEXT,
    unit VARCHAR(50) NOT NULL,
    stock NUMERIC(10,2) DEFAULT 0.00,
    category VARCHAR(100) REFERENCES categories(name) ON UPDATE CASCADE,
    status VARCHAR(50) DEFAULT 'Ativo',
    min_stock NUMERIC(10,2) DEFAULT 0.00,
    avg_stock NUMERIC(10,2) DEFAULT 0.00,
    max_stock NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. CRIAR TABELA DE FORNECEDORES
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    razao_social VARCHAR(200) NOT NULL,
    nome_fantasia VARCHAR(150),
    cnpj VARCHAR(20) UNIQUE,
    ie VARCHAR(50),
    im VARCHAR(50),
    tipo_fornecedor VARCHAR(100),
    situacao VARCHAR(50) DEFAULT 'Ativo',
    data_cadastro DATE DEFAULT CURRENT_DATE,
    contato JSONB, -- telefone, whatsapp, emails, site
    endereco JSONB, -- cep, rua, numero, bairro, cidade, etc
    financeiro JSONB, -- formaPagamento, limiteCredito, pix, etc
    logistica JSONB, -- prazoEntrega, diasEntrega, pedidoMinimo, etc
    linked_products TEXT[], -- SKUs vinculados
    ratings JSONB, -- qualidade, prazo, etc
    notes JSONB[], -- anotações
    history JSONB[], -- histórico de compras/atrasos
    block_info JSONB, -- status de bloqueio, motivo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. CRIAR TABELA DE SETORES
CREATE TABLE sectors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(100),
    color VARCHAR(100),
    description TEXT,
    status VARCHAR(50) DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. CRIAR TABELA DE ÁREAS
CREATE TABLE areas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    sector_id INTEGER REFERENCES sectors(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Ativo',
    user_ids INTEGER[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. CRIAR TABELA DE LOTES DE ESTOQUE (WMS)
CREATE TABLE stock_batches (
    id SERIAL PRIMARY KEY,
    item_sku VARCHAR(50) REFERENCES products(sku) ON UPDATE CASCADE ON DELETE CASCADE,
    lot VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    supplier VARCHAR(150),
    manufacturing_date DATE,
    expiration_date DATE,
    address VARCHAR(100),
    quantity NUMERIC(10,2) DEFAULT 0.00,
    unit VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =============================================
-- INSERIR DADOS INICIAIS (SEED)
-- =============================================

-- Inserir usuários/colaboradores padrão
INSERT INTO app_users (name, display_name, role, img, avatar_fallback, status, access_level, pin, password, phone, email, permissions) VALUES
('ADMINISTRADOR', 'Admin', 'Administrador', 'profile/default-avatar.png', 'A', 'Ativo', 'Administrador', '0000', 'admin', '', '', '{"entrada": true, "saida": true, "perdas": true, "editar": true, "relatorios": true, "config": true, "excluir": true, "sendMsg": true, "sendNotif": true, "receiveNotif": true, "sendAlert": true, "approveRequests": true, "requestItems": true, "sendDocs": true, "viewDocs": true, "supplierView": true, "supplierCreate": true, "supplierEdit": true, "supplierBlock": true, "supplierDelete": true, "chkCreate": true, "chkAnswer": true, "chkApprove": true, "chkReports": true}'),
('Rafael', 'Rafael', 'Gerente', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80', 'R', 'Ativo', 'Colaborador', '1234', '', '', '', '{"entrada": true, "saida": true, "perdas": true, "editar": true, "relatorios": true, "config": true, "excluir": true, "sendMsg": true, "sendNotif": true, "receiveNotif": true, "sendAlert": true, "approveRequests": true, "requestItems": true, "sendDocs": true, "viewDocs": false, "supplierView": true, "supplierCreate": true, "supplierEdit": true, "supplierBlock": true, "supplierDelete": true, "chkCreate": true, "chkAnswer": true, "chkApprove": true, "chkReports": true}'),
('Carlos', 'Carlos', 'Estoquista', 'profile/default-avatar.png', 'C', 'Ativo', 'Colaborador', '1234', '', '', '', '{"entrada": true, "saida": true, "perdas": true, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": true, "sendDocs": true, "viewDocs": false, "supplierView": true, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Fernanda', 'Fernanda', 'Cozinha', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80', 'F', 'Ativo', 'Colaborador', '1234', '', '', '', '{"entrada": false, "saida": true, "perdas": true, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": true, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}');

-- Inserir categorias padrão
INSERT INTO categories (name, icon, color, description, status) VALUES
('LACTÍCIOS', 'fa-cheese', 'color-blue', 'Leite, queijo, iogurte e derivados.', 'Ativo'),
('PROTEÍNAS', 'fa-drumstick-bite', 'color-red', 'Carnes, frango, peixe e ovos.', 'Ativo'),
('HORTIFRUTTI', 'fa-carrot', 'color-green', 'Frutas, verduras e legumes.', 'Ativo'),
('BEBIDAS', 'fa-wine-bottle', 'color-teal', 'Sucos, águas, refrigerantes e afins.', 'Ativo'),
('MASSAS E FARINÁCEOS', 'fa-bowl-rice', 'color-yellow', 'Farinhas, massas, arroz e cereais.', 'Ativo'),
('MOLHOS E CONDIMENTOS', 'fa-bottle-droplet', 'color-orange', 'Molhos prontos, ketchup, mostarda.', 'Ativo'),
('TEMPEROS', 'fa-pepper-hot', 'color-purple', 'Sal, pimenta, ervas e especiarias.', 'Ativo'),
('CONGELADOS', 'fa-snowflake', 'color-lightblue', 'Produtos que necessitam de congelamento.', 'Ativo'),
('DOCES E SOBREMESAS', 'fa-ice-cream', 'color-pink', 'Sobremesas, chocolates e doces.', 'Ativo'),
('PRODUTOS DE LIMPEZA', 'fa-spray-can', 'color-indigo', 'Detergentes, desinfetantes e similar.', 'Ativo');

-- Inserir produtos padrão
INSERT INTO products (sku, name, brand, description, unit, stock, category, status, min_stock, avg_stock, max_stock) VALUES
('PRT-001', 'Filé de Peito de Frango (Sassami)', 'Sadia', 'Peito de Frango (sassami) congelado.', 'KG', 120, 'PROTEÍNAS', 'Ativo', 20, 80, 150),
('PRT-002', 'Filé de Peito de Frango', 'Perdigão', 'Peito de frango resfriado.', 'KG', 100, 'PROTEÍNAS', 'Ativo', 15, 60, 120),
('LAC-001', 'Leite Integral 1L', 'Itambé', 'Leite tipo A integral.', 'Unidade', 50, 'LACTÍCIOS', 'Ativo', 10, 30, 60),
('HRT-001', 'Alface Crespa', 'Horta Viva', 'Alface crespa higienizada.', 'Bandeja', 30, 'HORTIFRUTTI', 'Ativo', 5, 20, 40),
('BEB-001', 'Coca-Cola 2L', 'Coca-Cola', 'Refrigerante de cola 2 litros.', 'Unidade', 80, 'BEBIDAS', 'Ativo', 12, 50, 100),
('MAS-001', 'Arroz Agulhinha T1 5kg', 'Prato Fino', 'Arroz branco tipo 1.', 'Pacote', 200, 'MASSAS E FARINÁCEOS', 'Ativo', 50, 150, 300);

-- Inserir setores operacionais
INSERT INTO sectors (name, icon, color, description, status) VALUES
('COZINHA', 'fa-fire-burner', 'color-orange', 'Setor de produção, preparo de pratos e manipulação de alimentos.', 'Ativo'),
('SALÃO', 'fa-utensils', 'color-teal', 'Setor de atendimento ao cliente, mesas e delivery.', 'Ativo'),
('ESTOQUE', 'fa-boxes-stacked', 'color-blue', 'Setor de recebimento, armazenamento de insumos e expedição.', 'Ativo'),
('ADMINISTRAÇÃO', 'fa-briefcase', 'color-purple', 'Setor administrativo, recursos humanos e financeiro.', 'Ativo');

-- Inserir áreas operacionais
INSERT INTO areas (name, description, sector_id, status) VALUES
('Grelha e Fogões', 'Área de cocção quente de carnes e guarnições.', 1, 'Ativo'),
('Pia e Higienização', 'Área de lavagem de louças, talheres e panelas.', 1, 'Ativo'),
('Balcão e Copa', 'Preparo de bebidas, cafés e entrega de pedidos rápidos.', 2, 'Ativo'),
('Câmara Resfriada', 'Armazenamento refrigerado de laticínios e hortifruti.', 3, 'Ativo'),
('Escritório Geral', 'Área de gerência, RH, compras e faturamento.', 4, 'Ativo');

-- Inserir lotes de estoque (WMS)
INSERT INTO stock_batches (item_sku, lot, brand, supplier, manufacturing_date, expiration_date, address, quantity, unit) VALUES
('PRT-001', 'LT-5243', 'Sadia', 'VALE VERDE', '2026-04-27', '2026-06-24', 'B-04-07', 33, 'KG'),
('PRT-001', 'LT-8491', 'Sadia', 'VALE VERDE', '2026-03-05', '2026-07-14', 'A-08-07', 35, 'KG'),
('LAC-001', 'LT-9485', 'Itambé', 'MASTER ALIMENTOS', '2026-03-05', '2026-11-15', 'B-02-06', 8, 'Unidade'),
('BEB-001', 'LT-5757', 'Coca-Cola', 'VALE VERDE', '2026-04-13', '2026-08-21', 'A-06-01', 28, 'Unidade'),
('MAS-001', 'LT-2918', 'Prato Fino', 'MASTER ALIMENTOS', '2026-03-05', '2026-11-26', 'B-05-01', 16, 'Pacote');

-- 9. TABELAS DE ESTRUTURA DO WMS (ARMAZÉNS, ZONAS E ENDEREÇAMENTOS)
DROP TABLE IF EXISTS wms_locations CASCADE;
DROP TABLE IF EXISTS wms_zones CASCADE;
DROP TABLE IF EXISTS wms_warehouses CASCADE;

-- Tabela de Armazéns
CREATE TABLE wms_warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de Zonas de Armazenamento
CREATE TABLE wms_zones (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES wms_warehouses(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'Seco' CHECK (type IN ('Seco', 'Resfriado', 'Congelado', 'Climatizado', 'Área Externa')),
    description TEXT,
    status VARCHAR(50) DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    address_mask VARCHAR(100) DEFAULT '{zone}-{aisle}-{row}-{shelf}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(warehouse_id, name)
);

-- Tabela de Endereçamentos Físicos
CREATE TABLE wms_locations (
    id SERIAL PRIMARY KEY,
    zone_id INTEGER REFERENCES wms_zones(id) ON DELETE CASCADE NOT NULL,
    aisle VARCHAR(50) NOT NULL,
    row VARCHAR(50) NOT NULL,
    shelf VARCHAR(50) NOT NULL,
    position VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Bloqueado', 'Manutenção')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(zone_id, aisle, row, shelf, position)
);

-- Inserir dados iniciais do WMS para testes
INSERT INTO wms_warehouses (name, description, status) VALUES
('Armazém Central', 'Centro de distribuição e estoque principal de insumos.', 'Ativo');

INSERT INTO wms_zones (warehouse_id, name, type, description, status, address_mask) VALUES
(1, 'Câmara Fria A', 'Resfriado', 'Armazenamento de laticínios e verduras.', 'Ativo', '{zone}-{aisle}-{row}-{shelf}'),
(1, 'Câmara Fria B', 'Congelado', 'Armazenamento de carnes e congelados.', 'Ativo', '{zone}-{aisle}-{row}-{shelf}'),
(1, 'Estoque Seco A', 'Seco', 'Armazenamento de massas, grãos e enlatados.', 'Ativo', '{zone}/{aisle}{row}{shelf}'),
(1, 'Estoque Seco B', 'Seco', 'Armazenamento de temperos e embalagens.', 'Ativo', '{zone}-{aisle}.{row}.{shelf}');

