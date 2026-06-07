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
DROP TABLE IF EXISTS sale_products CASCADE;

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

-- 3.5 CRIAR TABELA DE CATEGORIAS DE PRODUTOS DE VENDA
CREATE TABLE sale_product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(100) DEFAULT 'fa-tag',
    color VARCHAR(100) DEFAULT 'color-pink',
    description TEXT,
    status VARCHAR(50) DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. CRIAR TABELA DE FORNECEDORES
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

-- 5. CRIAR TABELA DE PRODUTOS
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
    controla_producao BOOLEAN DEFAULT FALSE,
    volume_ocupado NUMERIC(10,4) DEFAULT 0.0000,
    allowed_zones INTEGER[] DEFAULT '{}',
    pode_empilhar BOOLEAN DEFAULT FALSE,
    max_empilhamento INTEGER DEFAULT 1,
    allowed_cells TEXT[] DEFAULT '{}',
    primary_supplier_id INTEGER REFERENCES suppliers(id),
    secondary_supplier_id INTEGER REFERENCES suppliers(id),
    other_supplier_ids INTEGER[] DEFAULT '{}',
    recipe JSONB DEFAULT '[]'::jsonb,
    content_qty NUMERIC(10,2) DEFAULT 1.00,
    content_unit VARCHAR(50),
    gtin_unidade VARCHAR(50),
    gtin_fardo VARCHAR(50),
    itens_fardo NUMERIC(10,2) DEFAULT 1.00,
    gtin_caixa VARCHAR(50),
    itens_caixa NUMERIC(10,2) DEFAULT 1.00,
    gtin_pallet VARCHAR(50),
    itens_pallet NUMERIC(10,2) DEFAULT 1.00,
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
    price_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =============================================
-- INSERIR DADOS INICIAIS (SEED)
-- =============================================

-- 1. Inserir usuários/colaboradores padrão (30 Funcionários)
INSERT INTO app_users (name, display_name, role, img, avatar_fallback, status, access_level, pin, password, phone, email, permissions) VALUES
('ADMINISTRADOR', 'Admin', 'Administrador', 'profile/default-avatar.png', 'A', 'Ativo', 'Administrador', '0000', 'admin', '', 'admin@bellaitalia.com.br', '{"entrada": true, "saida": true, "perdas": true, "editar": true, "relatorios": true, "config": true, "excluir": true, "sendMsg": true, "sendNotif": true, "receiveNotif": true, "sendAlert": true, "approveRequests": true, "requestItems": true, "sendDocs": true, "viewDocs": true, "supplierView": true, "supplierCreate": true, "supplierEdit": true, "supplierBlock": true, "supplierDelete": true, "chkCreate": true, "chkAnswer": true, "chkApprove": true, "chkReports": true}'),
('Rafael Mendes', 'Rafael', 'Gerente de Pizzaria', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80', 'R', 'Ativo', 'Colaborador', '1001', '', '(11) 98765-1111', 'rafael@bellaitalia.com.br', '{"entrada": true, "saida": true, "perdas": true, "editar": true, "relatorios": true, "config": true, "excluir": true, "sendMsg": true, "sendNotif": true, "receiveNotif": true, "sendAlert": true, "approveRequests": true, "requestItems": true, "sendDocs": true, "viewDocs": true, "supplierView": true, "supplierCreate": true, "supplierEdit": true, "supplierBlock": true, "supplierDelete": true, "chkCreate": true, "chkAnswer": true, "chkApprove": true, "chkReports": true}'),
('Gustavo Santos', 'Gustavo', 'Gerente de Pizzaria', 'profile/default-avatar.png', 'G', 'Ativo', 'Colaborador', '1002', '', '(11) 98765-2222', 'gustavo@bellaitalia.com.br', '{"entrada": true, "saida": true, "perdas": true, "editar": true, "relatorios": true, "config": true, "excluir": true, "sendMsg": true, "sendNotif": true, "receiveNotif": true, "sendAlert": true, "approveRequests": true, "requestItems": true, "sendDocs": true, "viewDocs": true, "supplierView": true, "supplierCreate": true, "supplierEdit": true, "supplierBlock": true, "supplierDelete": true, "chkCreate": true, "chkAnswer": true, "chkApprove": true, "chkReports": true}'),
('Bruno Silva', 'Bruno', 'Supervisor de Turno', 'profile/default-avatar.png', 'B', 'Ativo', 'Colaborador', '1003', '', '(11) 98765-3333', 'bruno@bellaitalia.com.br', '{"entrada": true, "saida": true, "perdas": true, "editar": true, "relatorios": true, "config": false, "excluir": false, "sendMsg": true, "sendNotif": true, "receiveNotif": true, "sendAlert": true, "approveRequests": true, "requestItems": true, "sendDocs": true, "viewDocs": true, "supplierView": true, "supplierCreate": true, "supplierEdit": true, "supplierBlock": false, "supplierDelete": false, "chkCreate": true, "chkAnswer": true, "chkApprove": true, "chkReports": true}'),
('Camila Costa', 'Camila', 'Supervisor de Turno', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80', 'Ca', 'Ativo', 'Colaborador', '1004', '', '(11) 98765-4444', 'camila@bellaitalia.com.br', '{"entrada": true, "saida": true, "perdas": true, "editar": true, "relatorios": true, "config": false, "excluir": false, "sendMsg": true, "sendNotif": true, "receiveNotif": true, "sendAlert": true, "approveRequests": true, "requestItems": true, "sendDocs": true, "viewDocs": true, "supplierView": true, "supplierCreate": true, "supplierEdit": true, "supplierBlock": false, "supplierDelete": false, "chkCreate": true, "chkAnswer": true, "chkApprove": true, "chkReports": true}'),
('Anderson Silva', 'Anderson', 'Pizzaiolo', 'profile/default-avatar.png', 'An', 'Ativo', 'Colaborador', '1005', '', '', '', '{"entrada": false, "saida": true, "perdas": true, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": true, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Leandro Souza', 'Leandro', 'Pizzaiolo', 'profile/default-avatar.png', 'L', 'Ativo', 'Colaborador', '1006', '', '', '', '{"entrada": false, "saida": true, "perdas": true, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": true, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Thiago Santos', 'Thiago', 'Pizzaiolo', 'profile/default-avatar.png', 'T', 'Ativo', 'Colaborador', '1007', '', '', '', '{"entrada": false, "saida": true, "perdas": true, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": true, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Rodrigo Lima', 'Rodrigo', 'Auxiliar de Pizzaiolo', 'profile/default-avatar.png', 'Ro', 'Ativo', 'Colaborador', '1008', '', '', '', '{"entrada": false, "saida": true, "perdas": true, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": true, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Douglas Costa', 'Douglas', 'Auxiliar de Pizzaiolo', 'profile/default-avatar.png', 'D', 'Ativo', 'Colaborador', '1009', '', '', '', '{"entrada": false, "saida": true, "perdas": true, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": true, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Fernanda Dias', 'Fernanda', 'Cozinheiro', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80', 'Fe', 'Ativo', 'Colaborador', '1010', '', '', '', '{"entrada": false, "saida": true, "perdas": true, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": true, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Juliana Ramos', 'Juliana', 'Cozinheiro', 'profile/default-avatar.png', 'Ju', 'Ativo', 'Colaborador', '1011', '', '', '', '{"entrada": false, "saida": true, "perdas": true, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": true, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('João Silva', 'João', 'Auxiliar de Cozinha', 'profile/default-avatar.png', 'J', 'Ativo', 'Colaborador', '1012', '', '', '', '{"entrada": false, "saida": true, "perdas": false, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": true, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Felipe Santos', 'Felipe', 'Auxiliar de Cozinha', 'profile/default-avatar.png', 'Fl', 'Ativo', 'Colaborador', '1013', '', '', '', '{"entrada": false, "saida": true, "perdas": false, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": true, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Daniel Costa', 'Daniel', 'Auxiliar de Cozinha', 'profile/default-avatar.png', 'Da', 'Ativo', 'Colaborador', '1014', '', '', '', '{"entrada": false, "saida": true, "perdas": false, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": true, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('André Costa', 'André', 'Maître', 'profile/default-avatar.png', 'Ad', 'Ativo', 'Colaborador', '1015', '', '', '', '{"entrada": false, "saida": true, "perdas": false, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": true, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": false, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Ricardo Alves', 'Ricardo', 'Garçom', 'profile/default-avatar.png', 'Ri', 'Ativo', 'Colaborador', '1016', '', '', '', '{"entrada": false, "saida": true, "perdas": false, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": true, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": false, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Pedro Santos', 'Pedro', 'Garçom', 'profile/default-avatar.png', 'P', 'Ativo', 'Colaborador', '1017', '', '', '', '{"entrada": false, "saida": true, "perdas": false, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": true, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": false, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Gabriel Lima', 'Gabriel', 'Garçom', 'profile/default-avatar.png', 'Gb', 'Ativo', 'Colaborador', '1018', '', '', '', '{"entrada": false, "saida": true, "perdas": false, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": true, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": false, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Vinícius Souza', 'Vinícius', 'Garçom', 'profile/default-avatar.png', 'V', 'Ativo', 'Colaborador', '1019', '', '', '', '{"entrada": false, "saida": true, "perdas": false, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": true, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": false, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Carlos Santos', 'Carlos', 'Cumim', 'profile/default-avatar.png', 'C', 'Ativo', 'Colaborador', '1020', '', '', '', '{"entrada": false, "saida": true, "perdas": false, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": false, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Sandra Xavier', 'Sandra', 'Atendente de Delivery', 'profile/default-avatar.png', 'S', 'Ativo', 'Colaborador', '1021', '', '', '', '{"entrada": false, "saida": true, "perdas": false, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": true, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": false, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Aline Ramos', 'Aline', 'Atendente de Delivery', 'profile/default-avatar.png', 'Al', 'Ativo', 'Colaborador', '1022', '', '', '', '{"entrada": false, "saida": true, "perdas": false, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": true, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": false, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Mateus Silva', 'Mateus', 'Entregador', 'profile/default-avatar.png', 'M', 'Ativo', 'Colaborador', '1023', '', '', '', '{"entrada": false, "saida": false, "perdas": false, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": false, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Lucas Mendes', 'Lucas', 'Entregador', 'profile/default-avatar.png', 'Lc', 'Ativo', 'Colaborador', '1024', '', '', '', '{"entrada": false, "saida": false, "perdas": false, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": false, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Rafael Oliveira', 'Rafael O.', 'Entregador', 'profile/default-avatar.png', 'Ro', 'Ativo', 'Colaborador', '1025', '', '', '', '{"entrada": false, "saida": false, "perdas": false, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": false, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Renato Oliveira', 'Renato', 'Estoquista', 'profile/default-avatar.png', 'Rn', 'Ativo', 'Colaborador', '1026', '', '', '', '{"entrada": true, "saida": true, "perdas": true, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": true, "sendDocs": true, "viewDocs": false, "supplierView": true, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Roberto Lima', 'Roberto', 'Comprador', 'profile/default-avatar.png', 'Rb', 'Ativo', 'Colaborador', '1027', '', '', '', '{"entrada": true, "saida": true, "perdas": true, "editar": true, "relatorios": false, "config": false, "excluir": false, "sendMsg": true, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": true, "sendDocs": true, "viewDocs": true, "supplierView": true, "supplierCreate": true, "supplierEdit": true, "supplierBlock": false, "supplierDelete": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Maria Santos', 'Maria', 'Auxiliar de Limpeza', 'profile/default-avatar.png', 'Ma', 'Ativo', 'Colaborador', '1028', '', '', '', '{"entrada": false, "saida": false, "perdas": false, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": false, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Luciana Costa', 'Luciana', 'Auxiliar de Limpeza', 'profile/default-avatar.png', 'Lu', 'Ativo', 'Colaborador', '1029', '', '', '', '{"entrada": false, "saida": false, "perdas": false, "editar": false, "relatorios": false, "config": false, "excluir": false, "sendMsg": false, "sendNotif": false, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": false, "sendDocs": true, "viewDocs": false, "supplierView": false, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}'),
('Patrícia Melo', 'Patrícia', 'Analista Administrativo', 'profile/default-avatar.png', 'Pt', 'Ativo', 'Colaborador', '1030', '', '', '', '{"entrada": true, "saida": true, "perdas": false, "editar": true, "relatorios": true, "config": false, "excluir": false, "sendMsg": true, "sendNotif": true, "receiveNotif": true, "sendAlert": false, "approveRequests": false, "requestItems": true, "sendDocs": true, "viewDocs": true, "supplierView": true, "chkCreate": false, "chkAnswer": true, "chkApprove": false, "chkReports": false}');

-- 2. Inserir categorias padrão (Pizzaria)
INSERT INTO categories (name, icon, color, description, status) VALUES
('FARINHAS E MASSAS', 'fa-wheat-awn', 'color-yellow', 'Farinhas, fermentos e bases de massa.', 'Ativo'),
('LATICÍNIOS', 'fa-cheese', 'color-blue', 'Queijos, requeijão, creme de leite e derivados.', 'Ativo'),
('MOLHOS E CONDIMENTOS', 'fa-bottle-droplet', 'color-orange', 'Molho de tomate pelati, azeites e conservas.', 'Ativo'),
('CARNES E FRIOS', 'fa-drumstick-bite', 'color-red', 'Calabresa, presunto, bacon, frango e embutidos.', 'Ativo'),
('VEGETAIS E HORTIFRUTI', 'fa-carrot', 'color-green', 'Tomates, cebolas, rúcula, manjericão e frescos.', 'Ativo'),
('BEBIDAS', 'fa-wine-bottle', 'color-teal', 'Água, refrigerantes e cervejas geladas.', 'Ativo'),
('EMBALAGENS', 'fa-box', 'color-brown', 'Caixas de pizza 35cm/40cm e sacolas delivery.', 'Ativo'),
('HIGIENE E OPERACIONAL', 'fa-spray-can', 'color-indigo', 'Produtos de limpeza, sanitizantes e descartáveis.', 'Ativo');

-- 2.5 Inserir categorias de produtos de venda
INSERT INTO sale_product_categories (name, icon, color, description, status) VALUES
('PIZZAS', 'fa-pizza-slice', 'color-pink', 'Pizzas salgadas e doces assadas no forno a lenha.', 'Ativo'),
('BEBIDAS', 'fa-wine-bottle', 'color-teal', 'Refrigerantes gelados, sucos e cervejas.', 'Ativo'),
('SOBREMESAS', 'fa-ice-cream', 'color-purple', 'Pizzas doces e sobremesas em geral.', 'Ativo');

-- 3. Inserir fornecedores padrão (Pizzaria)
INSERT INTO suppliers (id, razao_social, nome_fantasia, cnpj, ie, im, tipo_fornecedor, situacao, data_cadastro, contato, endereco, financeiro, logistica, linked_products, ratings, notes, history, block_info) VALUES
(1, 'MOINHO CENTRAL IMPORTADORA LTDA', 'MOINHO CENTRAL', '12.345.678/0001-90', '123.456.789.000', '12345678', 'Distribuidor', 'Ativo', '2025-01-15', '{"responsavelComercial":"Giovanni Rossi","telefone":"(11) 3456-7890","whatsapp":"(11) 98765-4321","emailComercial":"vendas@moinhocentral.com.br","emailFinanceiro":"financeiro@moinhocentral.com.br","site":"www.moinhocentral.com.br"}'::jsonb, '{"cep":"01001-000","rua":"Rua da Itália","numero":"100","complemento":"Galpão A","bairro":"Brás","cidade":"São Paulo","estado":"SP","pais":"Brasil"}'::jsonb, '{"formaPagamento":"Boleto Bancário","prazoPagamento":"30","limiteCredito":80000,"banco":"Itaú","agencia":"1234","conta":"98765-0","pix":"financeiro@moinhocentral.com.br","tipoChavePix":"E-mail"}'::jsonb, '{"prazoEntrega":"3","diasEntrega":"Ter, Sex","transportadora":"TransItalian","pedidoMinimo":1000,"freteMinimo":100,"regiaoAtendimento":"Sudeste"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":10,"prazo":9,"atendimento":9,"preco":8}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(2, 'LATICÍNIOS MANTIQUEIRA LTDA', 'LATICÍNIO MANTIQUEIRA', '98.765.432/0001-10', '987.654.321.000', '87654321', 'Indústria', 'Ativo', '2025-01-20', '{"responsavelComercial":"Claudio Lima","telefone":"(35) 3211-5000","whatsapp":"(35) 99111-2233","emailComercial":"vendas@latmantiqueira.com.br","emailFinanceiro":"financeiro@latmantiqueira.com.br","site":"www.latmantiqueira.com.br"}'::jsonb, '{"cep":"37130-000","rua":"Rodovia das Pias","numero":"KM 12","complemento":"","bairro":"Zona Rural","cidade":"Alfenas","estado":"MG","pais":"Brasil"}'::jsonb, '{"formaPagamento":"Boleto Bancário","prazoPagamento":"15","limiteCredito":60000,"banco":"Bradesco","agencia":"3211","conta":"12345-0","pix":"98765432000110","tipoChavePix":"CNPJ"}'::jsonb, '{"prazoEntrega":"2","diasEntrega":"Seg, Qui","transportadora":"Própria","pedidoMinimo":1500,"freteMinimo":0,"regiaoAtendimento":"Minas Gerais e São Paulo"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":9,"prazo":9,"atendimento":8,"preco":8}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(3, 'DISTRIBUIDORA HORTI-PIZZA LTDA', 'HORTI-PIZZA', '45.678.901/0001-23', '456.789.012.000', '45678901', 'Distribuidor', 'Ativo', '2025-02-10', '{"responsavelComercial":"Maurício Verde","telefone":"(11) 2712-3000","whatsapp":"(11) 98455-6677","emailComercial":"comercial@hortipizza.com.br","emailFinanceiro":"financeiro@hortipizza.com.br","site":""}'::jsonb, '{"cep":"03010-000","rua":"Rua do Pomar","numero":"400","complemento":"Box 12","bairro":"Vila Maria","cidade":"São Paulo","estado":"SP","pais":"Brasil"}'::jsonb, '{"formaPagamento":"Boleto Bancário","prazoPagamento":"7","limiteCredito":20000,"banco":"Banco do Brasil","agencia":"1200","conta":"99887-1","pix":"comercial@hortipizza.com.br","tipoChavePix":"E-mail"}'::jsonb, '{"prazoEntrega":"1","diasEntrega":"Diariamente","transportadora":"Própria","pedidoMinimo":300,"freteMinimo":0,"regiaoAtendimento":"Grande São Paulo"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":9,"prazo":10,"atendimento":9,"preco":9}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(4, 'BEBIDAS PAULISTA S/A', 'BEBIDAS PAULISTA', '33.222.111/0001-55', '332.221.110.000', '33222111', 'Distribuidor', 'Ativo', '2025-01-10', '{"responsavelComercial":"Fernanda Rocha","telefone":"(11) 4004-9090","whatsapp":"(11) 98122-3344","emailComercial":"vendas@bebidaspaulista.com.br","emailFinanceiro":"financeiro@bebidaspaulista.com.br","site":"www.bebidaspaulista.com.br"}'::jsonb, '{"cep":"07190-100","rua":"Av. das Indústrias","numero":"500","complemento":"Galpão 2","bairro":"Cumbica","cidade":"Guarulhos","estado":"SP","pais":"Brasil"}'::jsonb, '{"formaPagamento":"Boleto Bancário","prazoPagamento":"28","limiteCredito":40000,"banco":"Itaú","agencia":"0530","conta":"77665-4","pix":"33222111000155","tipoChavePix":"CNPJ"}'::jsonb, '{"prazoEntrega":"2","diasEntrega":"Seg, Qua, Sex","transportadora":"Própria","pedidoMinimo":500,"freteMinimo":0,"regiaoAtendimento":"Sudeste"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":9,"prazo":9,"atendimento":9,"preco":7}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(5, 'EMBALAGENS BRASIL LTDA', 'EMBALAGENS BRASIL', '23.456.789/0001-01', '234.567.890.111', '23456789', 'Fabricante', 'Ativo', '2025-01-30', '{"responsavelComercial":"Roberto Martins","telefone":"(19) 3880-9000","whatsapp":"(19) 98711-2233","emailComercial":"vendas@embalagensbrasil.com.br","emailFinanceiro":"financeiro@embalagensbrasil.com.br","site":"www.embalagensbrasil.com.br"}'::jsonb, '{"cep":"13040-050","rua":"Rua do Papelão","numero":"850","complemento":"","bairro":"Distrito Industrial","cidade":"Campinas","estado":"SP","pais":"Brasil"}'::jsonb, '{"formaPagamento":"Boleto Bancário","prazoPagamento":"45","limiteCredito":30000,"banco":"Santander","agencia":"3211","conta":"12345-0","pix":"23456789000101","tipoChavePix":"CNPJ"}'::jsonb, '{"prazoEntrega":"4","diasEntrega":"Qua, Sex","transportadora":"Jadlog","pedidoMinimo":800,"freteMinimo":80,"regiaoAtendimento":"Sudeste"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":9,"prazo":8,"atendimento":8,"preco":9}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb);

-- 4. Inserir produtos de estoque (30 insumos)
INSERT INTO products (sku, name, brand, description, unit, stock, category, status, min_stock, avg_stock, max_stock, gtin_unidade, gtin_fardo, itens_fardo, gtin_caixa, itens_caixa, gtin_pallet, itens_pallet, primary_supplier_id) VALUES
('MAS-001', 'Farinha de Trigo Especial 00', 'Le 5 Stagioni', 'Farinha de trigo italiana tipo 00 para pizzas.', 'KG', 150.00, 'FARINHAS E MASSAS', 'Ativo', 50.00, 200.00, 400.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 1),
('MAS-002', 'Fermento Biológico Seco', 'Fermipan', 'Fermento biológico seco instantâneo.', 'KG', 8.00, 'FARINHAS E MASSAS', 'Ativo', 2.00, 10.00, 20.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 1),
('LAC-001', 'Queijo Muçarela Barra', 'Mantiqueira', 'Queijo muçarela em barra para fatiar/ralar.', 'KG', 120.00, 'LATICÍNIOS', 'Ativo', 30.00, 120.00, 250.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 2),
('MOL-001', 'Molho de Tomate Pelati', 'La Molisana', 'Tomate pelati italiano em conserva para molhos.', 'KG', 65.00, 'MOLHOS E CONDIMENTOS', 'Ativo', 20.00, 80.00, 160.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 3),
('PRO-001', 'Calabresa Defumada Inteira', 'Sadia', 'Linguiça calabresa defumada reta.', 'KG', 45.00, 'CARNES E FRIOS', 'Ativo', 15.00, 60.00, 120.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 2),
('PRO-002', 'Presunto Cozido Peça', 'Perdigão', 'Presunto cozido sem capa de gordura.', 'KG', 30.00, 'CARNES E FRIOS', 'Ativo', 10.00, 40.00, 80.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 2),
('PRO-003', 'Bacon Manta Defumado', 'Seara', 'Bacon manta defumado especial.', 'KG', 25.00, 'CARNES E FRIOS', 'Ativo', 10.00, 30.00, 60.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 2),
('PRO-004', 'Peito de Frango Desfiado', 'Copacol', 'Peito de frango cozido e desfiado IQF.', 'KG', 35.00, 'CARNES E FRIOS', 'Ativo', 10.00, 50.00, 100.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 2),
('LAC-002', 'Requeijão Culinário Scala', 'Scala', 'Requeijão cremoso tipo catupiry balde 1.5kg.', 'UN', 25.00, 'LATICÍNIOS', 'Ativo', 5.00, 20.00, 40.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 2),
('LAC-003', 'Queijo Parmesão Peça', 'Faixa Azul', 'Queijo parmesão tipo grana peça inteira.', 'KG', 15.00, 'LATICÍNIOS', 'Ativo', 5.00, 20.00, 40.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 2),
('LAC-004', 'Queijo Gorgonzola Peça', 'Cruzilia', 'Queijo azul tipo gorgonzola peça.', 'KG', 12.00, 'LATICÍNIOS', 'Ativo', 4.00, 15.00, 30.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 2),
('LAC-005', 'Queijo Provolone Defumado', 'President', 'Queijo provolone defumado peça.', 'KG', 15.00, 'LATICÍNIOS', 'Ativo', 5.00, 20.00, 40.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 2),
('HOR-001', 'Tomate Carmem Fresco', 'Horti-Pizza', 'Tomate carmem maduro selecionado.', 'KG', 40.00, 'VEGETAIS E HORTIFRUTI', 'Ativo', 15.00, 50.00, 100.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 3),
('HOR-002', 'Cebola Roxa', 'Horti-Pizza', 'Cebola roxa média especial.', 'KG', 20.00, 'VEGETAIS E HORTIFRUTI', 'Ativo', 5.00, 30.00, 60.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 3),
('HOR-003', 'Cebola Branca', 'Horti-Pizza', 'Cebola branca média especial.', 'KG', 30.00, 'VEGETAIS E HORTIFRUTI', 'Ativo', 10.00, 40.00, 80.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 3),
('HOR-004', 'Manjericão Fresco Maço', 'Horti-Pizza', 'Folhas de manjericão fresco maço.', 'UN', 15.00, 'VEGETAIS E HORTIFRUTI', 'Ativo', 5.00, 20.00, 40.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 3),
('HOR-005', 'Rúcula Fresca Maço', 'Horti-Pizza', 'Rúcula em folhas fresca maço.', 'UN', 18.00, 'VEGETAIS E HORTIFRUTI', 'Ativo', 5.00, 25.00, 50.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 3),
('HOR-006', 'Alho Roxo Cabeça', 'Horti-Pizza', 'Alho roxo nacional especial.', 'KG', 10.00, 'VEGETAIS E HORTIFRUTI', 'Ativo', 3.00, 15.00, 30.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 3),
('HOR-007', 'Azeitona Preta Inteira', 'Vale Fértil', 'Azeitona preta com caroço em balde.', 'KG', 25.00, 'VEGETAIS E HORTIFRUTI', 'Ativo', 8.00, 30.00, 60.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 3),
('TMP-001', 'Azeite de Oliva Extra Virgem 500ml', 'Andorinha', 'Azeite de oliva extra virgem de mesa.', 'UN', 24.00, 'MOLHOS E CONDIMENTOS', 'Ativo', 8.00, 30.00, 60.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 1),
('TMP-002', 'Orégano Desidratado', 'Kitano', 'Orégano em folhas secas desidratadas.', 'KG', 5.00, 'MOLHOS E CONDIMENTOS', 'Ativo', 1.00, 6.00, 12.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 1),
('TMP-003', 'Sal Refinado 1kg', 'Cisne', 'Sal refinado iodado culinário.', 'UN', 10.00, 'MOLHOS E CONDIMENTOS', 'Ativo', 3.00, 15.00, 30.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 1),
('BEB-001', 'Refrigerante Coca-Cola 2L', 'Coca-Cola', 'Refrigerante de cola garrafa 2 litros.', 'UN', 60.00, 'BEBIDAS', 'Ativo', 20.00, 80.00, 160.00, '7891234567890', '7891234567891', 6.00, NULL, 12.00, NULL, 240.00, 4),
('BEB-002', 'Refrigerante Guaraná Antarctica 2L', 'Antarctica', 'Refrigerante de guaraná garrafa 2 litros.', 'UN', 50.00, 'BEBIDAS', 'Ativo', 15.00, 60.00, 120.00, '7891234567894', '7891234567895', 6.00, NULL, 12.00, NULL, 240.00, 4),
('BEB-003', 'Cerveja Stella Artois Long Neck', 'Ambev', 'Cerveja long neck lager 330ml.', 'UN', 120.00, 'BEBIDAS', 'Ativo', 40.00, 150.00, 300.00, '7891234567898', '7891234567899', 24.00, NULL, 24.00, NULL, 1440.00, 4),
('BEB-004', 'Água Mineral Sem Gás 500ml', 'Crystal', 'Água mineral sem gás garrafa 500ml.', 'UN', 80.00, 'BEBIDAS', 'Ativo', 20.00, 100.00, 200.00, NULL, NULL, 12.00, NULL, 12.00, NULL, 1200.00, 4),
('EMB-001', 'Caixa de Pizza Oitavada 35cm', 'Embalagens Brasil', 'Caixa de pizza papelão oitavada 35cm.', 'UN', 300.00, 'EMBALAGENS', 'Ativo', 100.00, 500.00, 1000.00, NULL, NULL, 100.00, NULL, 100.00, NULL, 5000.00, 5),
('EMB-002', 'Sacola Kraft Delivery', 'Embalagens Brasil', 'Sacola de papel kraft reforçada para delivery.', 'UN', 250.00, 'EMBALAGENS', 'Ativo', 80.00, 400.00, 800.00, NULL, NULL, 100.00, NULL, 100.00, NULL, 4000.00, 5),
('LIM-001', 'Detergente Neutro Concentrado 5L', 'Clean Química', 'Detergente neutro galão 5 litros.', 'UN', 15.00, 'HIGIENE E OPERACIONAL', 'Ativo', 5.00, 20.00, 40.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 5),
('LIM-002', 'Cloro Ativo Sanitizante 5L', 'Clean Química', 'Sanitizante de cloro active galão 5 litros.', 'UN', 8.00, 'HIGIENE E OPERACIONAL', 'Ativo', 2.00, 10.00, 20.00, NULL, NULL, 1.00, NULL, 1.00, NULL, 1.00, 5);

-- 5. Inserir setores operacionais (Pizzaria)
INSERT INTO sectors (id, name, icon, color, description, status) VALUES
(1, 'ADMINISTRATIVO E FINANCEIRO', 'fa-briefcase', 'color-purple', 'Setor administrativo, recursos humanos, financeiro e gerência geral.', 'Ativo'),
(2, 'SALÃO E ATENDIMENTO', 'fa-utensils', 'color-teal', 'Setor de atendimento ao cliente no salão, recepção e coordenação de mesas.', 'Ativo'),
(3, 'DELIVERY', 'fa-motorcycle', 'color-orange', 'Setor de atendimento de pedidos externos e entregas rápidas.', 'Ativo'),
(4, 'PRODUÇÃO', 'fa-fire-burner', 'color-red', 'Setor de preparação de massas, pizzas, molhos e pratos da cozinha.', 'Ativo'),
(5, 'BAR', 'fa-wine-bottle', 'color-lightblue', 'Setor de preparo de drinks, coquetéis e bebidas em geral.', 'Ativo'),
(6, 'ESTOQUE E SUPRIMENTOS', 'fa-boxes-stacked', 'color-blue', 'Setor de recebimento, cotação, compras e controle de insumos.', 'Ativo'),
(7, 'SERVIÇOS GERAIS', 'fa-spray-can', 'color-green', 'Setor de higienização, limpeza e conservação das instalações.', 'Ativo');

-- 6. Inserir áreas operacionais (Cargos - Pizzaria)
INSERT INTO areas (id, name, description, sector_id, status) VALUES
(1, 'Gerente de Pizzaria', 'Responsável pela administração geral da pizzaria, coordenando equipes, recursos e resultados.', 1, 'Ativo'),
(2, 'Supervisor de Turno', 'Responsável por supervisionar as operações durante seu turno de trabalho.', 1, 'Ativo'),
(3, 'Analista Administrativo', 'Responsável por atividades administrativas e suporte à gestão.', 1, 'Ativo'),
(4, 'Assistente Financeiro', 'Responsável pelo apoio às rotinas financeiras da empresa.', 1, 'Ativo'),
(5, 'Maître', 'Responsável pela coordenação do salão e supervisão da equipe de atendimento.', 2, 'Ativo'),
(6, 'Recepcionista', 'Responsável pela recepção e organização da entrada dos clientes.', 2, 'Ativo'),
(7, 'Garçom', 'Responsável pelo atendimento direto aos clientes nas mesas.', 2, 'Ativo'),
(8, 'Cumim', 'Auxilia os garçons e apoia a organização do salão.', 2, 'Ativo'),
(9, 'Operador de Caixa', 'Responsável pelo controle das vendas e recebimentos da pizzaria.', 2, 'Ativo'),
(10, 'Atendente de Delivery', 'Responsável pelo recebimento e acompanhamento dos pedidos de entrega.', 3, 'Ativo'),
(11, 'Entregador', 'Responsável pela entrega dos pedidos aos clientes.', 3, 'Ativo'),
(12, 'Pizzaiolo', 'Responsável pela preparação e finalização das pizzas.', 4, 'Ativo'),
(13, 'Auxiliar de Pizzaiolo', 'Auxilia o pizzaiolo na produção das pizzas.', 4, 'Ativo'),
(14, 'Cozinheiro', 'Responsável pelo preparo dos pratos e produtos da cozinha.', 4, 'Ativo'),
(15, 'Auxiliar de Cozinha', 'Presta apoio às atividades da cozinha.', 4, 'Ativo'),
(16, 'Barman', 'Responsável pela preparação e serviço de bebidas.', 5, 'Ativo'),
(17, 'Auxiliar de Bar', 'Auxilia as atividades operacionais do bar.', 5, 'Ativo'),
(18, 'Estoquista', 'Responsável pelo controle e armazenamento de materiais e insumos.', 6, 'Ativo'),
(19, 'Comprador', 'Responsável pelas aquisições da empresa.', 6, 'Ativo'),
(20, 'Auxiliar de Limpeza', 'Responsável pela limpeza e conservação das instalações.', 7, 'Ativo');

-- 7. Inserir lotes de estoque iniciais (WMS)
INSERT INTO stock_batches (item_sku, lot, brand, supplier, manufacturing_date, expiration_date, address, quantity, unit) VALUES
('MAS-001', 'LT-1001', 'Le 5 Stagioni', 'MOINHO CENTRAL', '2026-05-10', '2026-11-10', 'ESA-01-01', 100, 'KG'),
('MAS-001', 'LT-1002', 'Le 5 Stagioni', 'MOINHO CENTRAL', '2026-05-20', '2026-11-20', 'ESA-01-02', 50, 'KG'),
('MAS-002', 'LT-1003', 'Fermipan', 'MOINHO CENTRAL', '2026-05-01', '2026-11-01', 'ESB-01-01', 8, 'KG'),
('LAC-001', 'LT-2001', 'Mantiqueira', 'LATICÍNIO MANTIQUEIRA', '2026-05-15', '2026-07-15', 'CFA-01-01', 80, 'KG'),
('LAC-001', 'LT-2002', 'Mantiqueira', 'LATICÍNIO MANTIQUEIRA', '2026-05-25', '2026-07-25', 'CFA-01-02', 40, 'KG'),
('MOL-001', 'LT-3001', 'La Molisana', 'HORTI-PIZZA', '2026-04-10', '2027-04-10', 'ESA-02-01', 65, 'KG'),
('PRO-001', 'LT-4001', 'Sadia', 'LATICÍNIO MANTIQUEIRA', '2026-05-01', '2026-08-01', 'CFA-02-01', 45, 'KG'),
('PRO-002', 'LT-4002', 'Perdigão', 'LATICÍNIO MANTIQUEIRA', '2026-05-05', '2026-08-05', 'CFA-02-02', 30, 'KG'),
('PRO-003', 'LT-4003', 'Seara', 'LATICÍNIO MANTIQUEIRA', '2026-05-10', '2026-09-10', 'CFA-02-03', 25, 'KG'),
('PRO-004', 'LT-4004', 'Copacol', 'LATICÍNIO MANTIQUEIRA', '2026-05-12', '2026-09-12', 'CFA-02-04', 35, 'KG');

-- 8. Inserir produtos de venda (Cardápio)
INSERT INTO sale_products (code, name, category, description, price, unit, status, controla_producao, recipe) VALUES
('PIZ-001', 'Pizza Calabresa G', 'PIZZAS', 'Molho de tomate, queijo muçarela, calabresa fatiada, cebola e orégano.', 52.90, 'UN', 'Ativo', true, '[{"ingredientSku": "MAS-001", "quantity": 0.25, "unit": "KG"}, {"ingredientSku": "MAS-002", "quantity": 0.005, "unit": "KG"}, {"ingredientSku": "LAC-001", "quantity": 0.25, "unit": "KG"}, {"ingredientSku": "MOL-001", "quantity": 0.08, "unit": "KG"}, {"ingredientSku": "PRO-001", "quantity": 0.15, "unit": "KG"}, {"ingredientSku": "HOR-003", "quantity": 0.05, "unit": "KG"}, {"ingredientSku": "TMP-002", "quantity": 0.005, "unit": "KG"}, {"ingredientSku": "EMB-001", "quantity": 1, "unit": "UN"}]'::jsonb),
('PIZ-002', 'Pizza Margherita G', 'PIZZAS', 'Molho de tomate, queijo muçarela, rodelas de tomate fresco, manjericão e azeite.', 49.90, 'UN', 'Ativo', true, '[{"ingredientSku": "MAS-001", "quantity": 0.25, "unit": "KG"}, {"ingredientSku": "MAS-002", "quantity": 0.005, "unit": "KG"}, {"ingredientSku": "LAC-001", "quantity": 0.25, "unit": "KG"}, {"ingredientSku": "MOL-001", "quantity": 0.08, "unit": "KG"}, {"ingredientSku": "HOR-001", "quantity": 0.1, "unit": "KG"}, {"ingredientSku": "HOR-004", "quantity": 0.05, "unit": "UN"}, {"ingredientSku": "EMB-001", "quantity": 1, "unit": "UN"}]'::jsonb),
('PIZ-003', 'Pizza Frango com Catupiry G', 'PIZZAS', 'Molho de tomate, queijo muçarela, peito de frango desfiado e requeijão culinário.', 56.90, 'UN', 'Ativo', true, '[{"ingredientSku": "MAS-001", "quantity": 0.25, "unit": "KG"}, {"ingredientSku": "MAS-002", "quantity": 0.005, "unit": "KG"}, {"ingredientSku": "LAC-001", "quantity": 0.2, "unit": "KG"}, {"ingredientSku": "MOL-001", "quantity": 0.08, "unit": "KG"}, {"ingredientSku": "PRO-004", "quantity": 0.2, "unit": "KG"}, {"ingredientSku": "LAC-002", "quantity": 0.15, "unit": "UN"}, {"ingredientSku": "EMB-001", "quantity": 1, "unit": "UN"}]'::jsonb),
('PIZ-004', 'Pizza Quatro Queijos G', 'PIZZAS', 'Molho de tomate, queijo muçarela, parmesão, provolone e gorgonzola.', 59.90, 'UN', 'Ativo', true, '[{"ingredientSku": "MAS-001", "quantity": 0.25, "unit": "KG"}, {"ingredientSku": "MAS-002", "quantity": 0.005, "unit": "KG"}, {"ingredientSku": "LAC-001", "quantity": 0.2, "unit": "KG"}, {"ingredientSku": "MOL-001", "quantity": 0.08, "unit": "KG"}, {"ingredientSku": "LAC-003", "quantity": 0.08, "unit": "KG"}, {"ingredientSku": "LAC-004", "quantity": 0.05, "unit": "KG"}, {"ingredientSku": "LAC-005", "quantity": 0.05, "unit": "KG"}, {"ingredientSku": "EMB-001", "quantity": 1, "unit": "UN"}]'::jsonb),
('PIZ-005', 'Pizza Portuguesa G', 'PIZZAS', 'Molho de tomate, muçarela, presunto cozido, cebola, azeitona preta e ovos.', 54.90, 'UN', 'Ativo', true, '[{"ingredientSku": "MAS-001", "quantity": 0.25, "unit": "KG"}, {"ingredientSku": "MAS-002", "quantity": 0.005, "unit": "KG"}, {"ingredientSku": "LAC-001", "quantity": 0.2, "unit": "KG"}, {"ingredientSku": "MOL-001", "quantity": 0.08, "unit": "KG"}, {"ingredientSku": "PRO-002", "quantity": 0.1, "unit": "KG"}, {"ingredientSku": "HOR-003", "quantity": 0.05, "unit": "KG"}, {"ingredientSku": "HOR-007", "quantity": 0.03, "unit": "KG"}, {"ingredientSku": "EMB-001", "quantity": 1, "unit": "UN"}]'::jsonb),
('PIZ-006', 'Pizza Pepperoni G', 'PIZZAS', 'Molho de tomate, queijo muçarela, pepperoni fatiado e orégano.', 62.90, 'UN', 'Ativo', true, '[{"ingredientSku": "MAS-001", "quantity": 0.25, "unit": "KG"}, {"ingredientSku": "MAS-002", "quantity": 0.005, "unit": "KG"}, {"ingredientSku": "LAC-001", "quantity": 0.25, "unit": "KG"}, {"ingredientSku": "MOL-001", "quantity": 0.08, "unit": "KG"}, {"ingredientSku": "PRO-001", "quantity": 0.12, "unit": "KG"}, {"ingredientSku": "EMB-001", "quantity": 1, "unit": "UN"}]'::jsonb),
('PIZ-007', 'Pizza Rúcula com Tomate Seco G', 'PIZZAS', 'Molho de tomate, queijo muçarela, tomate seco fresco, rúcula e azeite.', 58.90, 'UN', 'Ativo', true, '[{"ingredientSku": "MAS-001", "quantity": 0.25, "unit": "KG"}, {"ingredientSku": "MAS-002", "quantity": 0.005, "unit": "KG"}, {"ingredientSku": "LAC-001", "quantity": 0.2, "unit": "KG"}, {"ingredientSku": "MOL-001", "quantity": 0.08, "unit": "KG"}, {"ingredientSku": "HOR-001", "quantity": 0.1, "unit": "KG"}, {"ingredientSku": "HOR-005", "quantity": 0.1, "unit": "UN"}, {"ingredientSku": "EMB-001", "quantity": 1, "unit": "UN"}]'::jsonb),
('PIZ-008', 'Pizza Brigadeiro G', 'SOBREMESAS', 'Chocolate ao leite cremoso espalhado e granulado de chocolate.', 48.90, 'UN', 'Ativo', true, '[{"ingredientSku": "MAS-001", "quantity": 0.25, "unit": "KG"}, {"ingredientSku": "MAS-002", "quantity": 0.005, "unit": "KG"}, {"ingredientSku": "EMB-001", "quantity": 1, "unit": "UN"}]'::jsonb),
('BEB-001', 'Refrigerante Coca-Cola 2L', 'BEBIDAS', 'Refrigerante garrafa gelada 2 litros.', 12.00, 'UN', 'Ativo', false, '[{"ingredientSku": "BEB-001", "quantity": 1, "unit": "UN"}, {"ingredientSku": "EMB-002", "quantity": 1, "unit": "UN"}]'::jsonb),
('BEB-002', 'Refrigerante Guaraná Antarctica 2L', 'BEBIDAS', 'Refrigerante garrafa gelada 2 litros.', 10.00, 'UN', 'Ativo', false, '[{"ingredientSku": "BEB-002", "quantity": 1, "unit": "UN"}, {"ingredientSku": "EMB-002", "quantity": 1, "unit": "UN"}]'::jsonb),
('BEB-003', 'Cerveja Stella Artois Long Neck', 'BEBIDAS', 'Cerveja long neck Stella Artois 330ml.', 9.00, 'UN', 'Ativo', false, '[{"ingredientSku": "BEB-003", "quantity": 1, "unit": "UN"}]'::jsonb),
('BEB-004', 'Água Mineral Sem Gás 500ml', 'BEBIDAS', 'Água mineral sem gás 500ml gelada.', 4.00, 'UN', 'Ativo', false, '[{"ingredientSku": "BEB-004", "quantity": 1, "unit": "UN"}]'::jsonb);

-- 9. Inserir estrutura WMS (Pizzaria)
INSERT INTO wms_warehouses (id, name, acronym, description, status) VALUES
(1, 'Armazém Central AC', 'AC', 'CD principal de insumos e embalagens da pizzaria.', 'Ativo');

INSERT INTO wms_zones (warehouse_id, name, acronym_description, type, description, status, temp_min, temp_max, is_ambient, ambient_type) VALUES
(1, 'CFA', 'Câmara Fria A', 'Resfriado', 'Armazenamento de laticínios e frios.', 'Ativo', 2, 8, false, null),
(1, 'CFB', 'Câmara Fria B', 'Congelado', 'Armazenamento de carnes e congelados.', 'Ativo', -18, -10, false, null),
(1, 'ESA', 'Estoque Seco A', 'Seco', 'Armazenamento de farinhas, molhos e grãos.', 'Ativo', 15, 25, true, 'fechada'),
(1, 'ESB', 'Estoque Seco B', 'Seco', 'Armazenamento de temperos, embalagens e descartáveis.', 'Ativo', 15, 25, true, 'fechada');



-- Inserir fornecedores padrão
INSERT INTO suppliers (id, razao_social, nome_fantasia, cnpj, ie, im, tipo_fornecedor, situacao, data_cadastro, contato, endereco, financeiro, logistica, linked_products, ratings, notes, history, block_info) VALUES
(1, 'DISTRIBUIDORA MASTER ALIMENTOS LTDA', 'MASTER ALIMENTOS', '12.345.678/0001-90', '123.456.789.000', '12345678', 'Distribuidor', 'Ativo', '2024-03-15', '{"responsavel_comercial":"Carlos Souza","responsavel_financeiro":"Maria Oliveira","telefone":"(11) 3456-7890","whatsapp":"(11) 98765-4321","email_comercial":"comercial@masteralimentos.com.br","email_financeiro":"financeiro@masteralimentos.com.br","site":"www.masteralimentos.com.br"}'::jsonb, '{"cep":"01001-000","rua":"Rua das Flores","numero":"1500","complemento":"Galpão 3","bairro":"Centro","cidade":"São Paulo","estado":"SP","pais":"Brasil"}'::jsonb, '{"forma_pagamento":"Boleto Bancário","prazo_pagamento":"30","limite_credito":50000,"banco":"Banco do Brasil","agencia":"1234-5","conta":"98765-0","pix":"comercial@masteralimentos.com.br","tipo_chave_pix":"E-mail"}'::jsonb, '{"prazo_entrega":"2","dias_entrega":"Seg, Qua, Sex","transportadora":"TransLog Express","pedido_minimo":500,"frete_minimo":50,"regiao_atendimento":"Grande São Paulo"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":9,"prazo":8,"atendimento":9,"preco":7}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(2, 'HORTIFRUTI VALE VERDE LTDA', 'VALE VERDE', '98.765.432/0001-10', '987.654.321.000', '87654321', 'Produtor Rural', 'Ativo', '2024-06-20', '{"responsavel_comercial":"Ana Paula Mendes","responsavel_financeiro":"José Carlos","telefone":"(21) 2345-6789","whatsapp":"(21) 99988-7766","email_comercial":"vendas@valeverde.com.br","email_financeiro":"financeiro@valeverde.com.br","site":"www.valeverde.com.br"}'::jsonb, '{"cep":"20040-020","rua":"Av. Brasil","numero":"800","complemento":"","bairro":"Penha","cidade":"Rio de Janeiro","estado":"RJ","pais":"Brasil"}'::jsonb, '{"forma_pagamento":"Transferência Bancária","prazo_pagamento":"15","limite_credito":25000,"banco":"Itaú","agencia":"4321-0","conta":"12345-6","pix":"98765432000110","tipo_chave_pix":"CNPJ"}'::jsonb, '{"prazo_entrega":"1","dias_entrega":"Seg a Sáb","transportadora":"Própria","pedido_minimo":200,"frete_minimo":0,"regiao_atendimento":"Rio de Janeiro e Niterói"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":10,"prazo":9,"atendimento":8,"preco":9}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(3, 'EMBALAGENS EXPRESS DO BRASIL LTDA', 'EMB EXPRESS', '45.678.901/0001-23', '456.789.012.000', '45678901', 'Fabricante', 'Ativo', '2024-01-10', '{"responsavel_comercial":"Roberto Lima","responsavel_financeiro":"Sandra Alves","telefone":"(19) 3456-0000","whatsapp":"(19) 97654-3210","email_comercial":"vendas@embexpress.com.br","email_financeiro":"contas@embexpress.com.br","site":"www.embexpress.com.br"}'::jsonb, '{"cep":"13040-050","rua":"Rua Industrial","numero":"250","complemento":"Bloco B","bairro":"Distrito Industrial","cidade":"Campinas","estado":"SP","pais":"Brasil"}'::jsonb, '{"forma_pagamento":"Boleto Bancário","prazo_pagamento":"45","limite_credito":35000,"banco":"Bradesco","agencia":"5678-9","conta":"45678-1","pix":"45678901000123","tipo_chave_pix":"CNPJ"}'::jsonb, '{"prazo_entrega":"3","dias_entrega":"Seg a Sex","transportadora":"Jadlog","pedido_minimo":300,"frete_minimo":80,"regiao_atendimento":"Estado de São Paulo"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":8,"prazo":7,"atendimento":8,"preco":8}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(4, 'LATICÍNIOS UNIÃO S/A', 'LAT UNIÃO', '33.222.111/0001-55', '332.221.110.000', '33222111', 'Indústria', 'Ativo', '2023-11-05', '{"responsavel_comercial":"Juliana Costa","responsavel_financeiro":"Pedro Henrique","telefone":"(31) 3222-1100","whatsapp":"(31) 98888-2233","email_comercial":"vendas@latuniao.com.br","email_financeiro":"financeiro@latuniao.com.br","site":""}'::jsonb, '{"cep":"30130-000","rua":"Av. Amazonas","numero":"3500","complemento":"Sala 12","bairro":"Funcionários","cidade":"Belo Horizonte","estado":"MG","pais":"Brasil"}'::jsonb, '{"forma_pagamento":"Boleto Bancário","prazo_pagamento":"30","limite_credito":15000,"banco":"Caixa","agencia":"0001-0","conta":"99887-7","pix":"33222111000155","tipo_chave_pix":"CNPJ"}'::jsonb, '{"prazo_entrega":"2","dias_entrega":"Ter, Qui","transportadora":"Total Express","pedido_minimo":1000,"frete_minimo":120,"regiao_atendimento":"Minas Gerais"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":8,"prazo":8,"atendimento":7,"preco":8}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(5, 'FRIGORÍFICO BOI GORDO LTDA', 'BOI GORDO', '23.456.789/0001-01', '234.567.890.111', '23456789', 'Indústria', 'Ativo', '2024-02-18', '{"responsavel_comercial":"Roberto Martins","responsavel_financeiro":"Fernanda Lima","telefone":"(17) 3211-5000","whatsapp":"(17) 99111-2233","email_comercial":"vendas@boigordo.com.br","email_financeiro":"financeiro@boigordo.com.br","site":"www.boigordo.com.br"}'::jsonb, '{"cep":"15035-000","rua":"Rodovia Assis Chateaubriand","numero":"KM 55","complemento":"","bairro":"Distrito Agroindustrial","cidade":"São José do Rio Preto","estado":"SP","pais":"Brasil"}'::jsonb, '{"forma_pagamento":"Boleto Bancário","prazo_pagamento":"21","limite_credito":60000,"banco":"Santander","agencia":"3211-9","conta":"12345-0","pix":"vendas@boigordo.com.br","tipo_chave_pix":"E-mail"}'::jsonb, '{"prazo_entrega":"2","dias_entrega":"Ter, Qui, Sáb","transportadora":"Friolog Transportes","pedido_minimo":1500,"frete_minimo":100,"regiao_atendimento":"Sul e Sudeste"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":9,"prazo":9,"atendimento":8,"preco":7}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(6, 'DISTRIBUIDORA DE BEBIDAS GOLIAS LTDA', 'BEBIDAS GOLIAS', '34.567.890/0001-12', '345.678.901.222', '34567890', 'Distribuidor', 'Ativo', '2024-04-10', '{"responsavel_comercial":"Julio Cesar","responsavel_financeiro":"Amanda Xavier","telefone":"(11) 4004-9090","whatsapp":"(11) 98122-3344","email_comercial":"contato@bebidasgolias.com.br","email_financeiro":"cobranca@bebidasgolias.com.br","site":"www.bebidasgolias.com.br"}'::jsonb, '{"cep":"07190-100","rua":"Av. Jamil João Zarif","numero":"680","complemento":"Galpão A","bairro":"Jardim Arapongas","cidade":"Guarulhos","estado":"SP","pais":"Brasil"}'::jsonb, '{"forma_pagamento":"Boleto Bancário","prazo_pagamento":"28","limite_credito":40000,"banco":"Itaú","agencia":"0530-1","conta":"77665-4","pix":"34567890000112","tipo_chave_pix":"CNPJ"}'::jsonb, '{"prazo_entrega":"1","dias_entrega":"Seg a Sáb","transportadora":"Própria","pedido_minimo":400,"frete_minimo":0,"regiao_atendimento":"Grande São Paulo e Campinas"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":9,"prazo":10,"atendimento":9,"preco":8}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(7, 'CIA INDUSTRIAL DO CAFÉ E CHÁ S/A', 'CIA DO CAFÉ', '76.543.210/0001-09', '456.789.012.333', '45678901', 'Indústria', 'Ativo', '2024-05-12', '{"responsavel_comercial":"Rodrigo Silva","responsavel_financeiro":"Patrícia Melo","telefone":"(35) 3290-4000","whatsapp":"(35) 99222-3344","email_comercial":"vendas@ciadocafe.com.br","email_financeiro":"faturamento@ciadocafe.com.br","site":"www.ciadocafe.com.br"}'::jsonb, '{"cep":"37130-000","rua":"Rua das Lavouras","numero":"10","complemento":"","bairro":"Distrito Industrial","cidade":"Alfenas","estado":"MG","pais":"Brasil"}'::jsonb, '{"forma_pagamento":"Boleto Bancário","prazo_pagamento":"30","limite_credito":30000,"banco":"Banco do Brasil","agencia":"0185-6","conta":"22334-5","pix":"vendas@ciadocafe.com.br","tipo_chave_pix":"E-mail"}'::jsonb, '{"prazo_entrega":"3","dias_entrega":"Ter, Sex","transportadora":"Minas Cargo","pedido_minimo":600,"frete_minimo":50,"regiao_atendimento":"Nacional"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":10,"prazo":8,"atendimento":9,"preco":8}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(8, 'COMPANHIA NACIONAL DE DESCARTÁVEIS LTDA', 'DESCARTÁVEIS CIA', '56.789.012/0001-34', '567.890.123.444', '56789012', 'Distribuidor', 'Ativo', '2024-01-20', '{"responsavel_comercial":"Fabio Dias","responsavel_financeiro":"Gisele Rocha","telefone":"(11) 2712-3000","whatsapp":"(11) 98455-6677","email_comercial":"fabio@descartaveiscia.com.br","email_financeiro":"financeiro@descartaveiscia.com.br","site":"www.descartaveiscia.com.br"}'::jsonb, '{"cep":"03010-000","rua":"Rua da Mooca","numero":"850","complemento":"Andar 1","bairro":"Mooca","cidade":"São Paulo","estado":"SP","pais":"Brasil"}'::jsonb, '{"forma_pagamento":"Boleto Bancário","prazo_pagamento":"45","limite_credito":20000,"banco":"Bradesco","agencia":"1200-9","conta":"99887-1","pix":"56789012000134","tipo_chave_pix":"CNPJ"}'::jsonb, '{"prazo_entrega":"2","dias_entrega":"Seg, Qui","transportadora":"Própria","pedido_minimo":300,"frete_minimo":0,"regiao_atendimento":"São Paulo Metropolitano"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":8,"prazo":9,"atendimento":8,"preco":9}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(9, 'QUÍMICA CLEAN SANITIZANTES LTDA', 'CLEAN QUÍMICA', '67.890.123/0001-45', '678.901.234.555', '67890123', 'Fabricante', 'Ativo', '2024-03-02', '{"responsavel_comercial":"Marcos Bastos","responsavel_financeiro":"Eliane Lima","telefone":"(19) 3880-9000","whatsapp":"(19) 98711-2233","email_comercial":"vendas@cleanquimica.com.br","email_financeiro":"faturamento@cleanquimica.com.br","site":"www.cleanquimica.com.br"}'::jsonb, '{"cep":"13280-000","rua":"Av. das Indústrias","numero":"2100","complemento":"","bairro":"Distrito Industrial","cidade":"Vinhedo","estado":"SP","pais":"Brasil"}'::jsonb, '{"forma_pagamento":"Boleto Bancário","prazo_pagamento":"30","limite_credito":35000,"banco":"Itaú","agencia":"3120-4","conta":"44332-9","pix":"67890123000145","tipo_chave_pix":"CNPJ"}'::jsonb, '{"prazo_entrega":"3","dias_entrega":"Qua, Sex","transportadora":"Expresso Anhanguera","pedido_minimo":800,"frete_minimo":80,"regiao_atendimento":"Sudeste"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":9,"prazo":8,"atendimento":8,"preco":8}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(10, 'UNIFORMES PROFISSIONAIS DO BRASIL LTDA', 'UNIFORMES BRASIL', '78.901.234/0001-56', '789.012.345.666', '78901234', 'Fabricante', 'Ativo', '2024-05-18', '{"responsavel_comercial":"Simone Reis","responsavel_financeiro":"Geraldo Santos","telefone":"(47) 3331-4000","whatsapp":"(47) 99122-8899","email_comercial":"comercial@uniformesbrasil.com.br","email_financeiro":"financeiro@uniformesbrasil.com.br","site":"www.uniformesbrasil.com.br"}'::jsonb, '{"cep":"89010-000","rua":"Rua XV de Novembro","numero":"1200","complemento":"Sala 4","bairro":"Centro","cidade":"Blumenau","estado":"SC","pais":"Brasil"}'::jsonb, '{"forma_pagamento":"Boleto Bancário","prazo_pagamento":"30","limite_credito":15000,"banco":"Banco cooperativo Viacredi","agencia":"0101-2","conta":"88776-6","pix":"comercial@uniformesbrasil.com.br","tipo_chave_pix":"E-mail"}'::jsonb, '{"prazo_entrega":"10","dias_entrega":"Seg a Sex","transportadora":"Correios/Jadlog","pedido_minimo":500,"frete_minimo":40,"regiao_atendimento":"Nacional"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":9,"prazo":8,"atendimento":9,"preco":8}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(11, 'PESCADOS E FRUTOS DO MAR ATLÂNTICO LTDA', 'PESCADOS ATLÂNTICO', '89.012.345/0001-67', '890.123.456.777', '89012345', 'Distribuidor', 'Ativo', '2024-02-10', '{"responsavel_comercial":"Ricardo Marinho","responsavel_financeiro":"Clara Campos","telefone":"(13) 3219-5000","whatsapp":"(13) 99188-4455","email_comercial":"vendas@pescadosatlantico.com.br","email_financeiro":"financeiro@pescadosatlantico.com.br","site":"www.pescadosatlantico.com.br"}'::jsonb, '{"cep":"11030-000","rua":"Av. Mário Covas","numero":"450","complemento":"Galpão Frio 2","bairro":"Estuário","cidade":"Santos","estado":"SP","pais":"Brasil"}'::jsonb, '{"forma_pagamento":"Boleto Bancário","prazo_pagamento":"15","limite_credito":30000,"banco":"Santander","agencia":"0120-1","conta":"11223-9","pix":"89012345000167","tipo_chave_pix":"CNPJ"}'::jsonb, '{"prazo_entrega":"1","dias_entrega":"Ter, Qui, Sáb","transportadora":"Própria (Refrigerada)","pedido_minimo":1000,"frete_minimo":0,"regiao_atendimento":"Estado de São Paulo"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":10,"prazo":9,"atendimento":8,"preco":7}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(12, 'COOPERATIVA DE CEREAIS E GRÃOS DO SUL S/A', 'GRÃOS DO SUL', '90.123.456/0001-78', '901.234.567.888', '90123456', 'Produtor Rural', 'Ativo', '2024-04-05', '{"responsavel_comercial":"Lauro Vargas","responsavel_financeiro":"Eliane Souza","telefone":"(51) 3712-4000","whatsapp":"(51) 98744-1122","email_comercial":"lauro.vargas@graosdosul.coop.br","email_financeiro":"financeiro@graosdosul.coop.br","site":"www.graosdosul.coop.br"}'::jsonb, '{"cep":"95010-000","rua":"Av. Sertório","numero":"9800","complemento":"","bairro":"Sarandi","cidade":"Porto Alegre","estado":"RS","pais":"Brasil"}'::jsonb, '{"forma_pagamento":"Boleto Bancário","prazo_pagamento":"30","limite_credito":50000,"banco":"Banco do Estado do RS","agencia":"0100-3","conta":"110022-3","pix":"90123456000178","tipo_chave_pix":"CNPJ"}'::jsonb, '{"prazo_entrega":"5","dias_entrega":"Seg, Qua","transportadora":"Rápido Sul","pedido_minimo":1200,"frete_minimo":150,"regiao_atendimento":"Sul e Sudeste"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":9,"prazo":8,"atendimento":8,"preco":9}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(13, 'COMPANHIA DE PÃES E PADARIA CENTRAL DA CIDADE', 'PADARIA CENTRAL', '01.234.567/0001-89', '012.345.678.999', '01234567', 'Distribuidor', 'Ativo', '2024-06-01', '{"responsavel_comercial":"Juliano Pires","responsavel_financeiro":"Renata Bastos","telefone":"(11) 3662-4040","whatsapp":"(11) 97755-1122","email_comercial":"comercial@padariacentral.com.br","email_financeiro":"faturamento@padariacentral.com.br","site":""}'::jsonb, '{"cep":"01222-000","rua":"Rua Augusta","numero":"140","complemento":"","bairro":"Consolação","cidade":"São Paulo","estado":"SP","pais":"Brasil"}'::jsonb, '{"forma_pagamento":"Boleto Bancário","prazo_pagamento":"15","limite_credito":10000,"banco":"Bradesco","agencia":"0125-9","conta":"44332-1","pix":"01234567000189","tipo_chave_pix":"CNPJ"}'::jsonb, '{"prazo_entrega":"1","dias_entrega":"Diariamente","transportadora":"Própria","pedido_minimo":100,"frete_minimo":0,"regiao_atendimento":"São Paulo Centro-Expandido"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":9,"prazo":10,"atendimento":9,"preco":8}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(14, 'PAPELARIA E ESCRITÓRIO INTEGRADO LTDA', 'PAPELARIA INTEGRADA', '02.345.678/0001-90', '023.456.789.001', '02345678', 'Distribuidor', 'Ativo', '2024-05-02', '{"responsavel_comercial":"Luiz Fernando","responsavel_financeiro":"Carolina Ramos","telefone":"(11) 3330-8000","whatsapp":"(11) 98844-3322","email_comercial":"vendas@papelariaintegrada.com.br","email_financeiro":"financeiro@papelariaintegrada.com.br","site":"www.papelariaintegrada.com.br"}'::jsonb, '{"cep":"02010-000","rua":"Av. Cruzeiro do Sul","numero":"2500","complemento":"","bairro":"Santana","cidade":"São Paulo","estado":"SP","pais":"Brasil"}'::jsonb, '{"forma_pagamento":"Boleto Bancário","prazo_pagamento":"30","limite_credito":12000,"banco":"Itaú","agencia":"1600-4","conta":"88776-5","pix":"02345678000190","tipo_chave_pix":"CNPJ"}'::jsonb, '{"prazo_entrega":"2","dias_entrega":"Ter, Qui","transportadora":"Própria","pedido_minimo":200,"frete_minimo":20,"regiao_atendimento":"Grande São Paulo"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":8,"prazo":9,"atendimento":8,"preco":8}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb),
(15, 'COMERCIAL DE MANUTENÇÃO E FERRAGENS FENIX LTDA', 'FERRAGENS FENIX', '03.456.789/0001-01', '034.567.890.112', '03456789', 'Comércio', 'Ativo', '2024-03-20', '{"responsavel_comercial":"Augusto Cesar","responsavel_financeiro":"Beatriz Martins","telefone":"(11) 2990-1010","whatsapp":"(11) 97722-6655","email_comercial":"augusto@ferragensfenix.com.br","email_financeiro":"contato@ferragensfenix.com.br","site":"www.ferragensfenix.com.br"}'::jsonb, '{"cep":"03102-010","rua":"Av. Celso Garcia","numero":"1800","complemento":"","bairro":"Brás","cidade":"São Paulo","estado":"SP","pais":"Brasil"}'::jsonb, '{"forma_pagamento":"Boleto Bancário","prazo_pagamento":"30","limite_credito":15000,"banco":"Banco do Brasil","agencia":"3200-2","conta":"55443-1","pix":"03456789000101","tipo_chave_pix":"CNPJ"}'::jsonb, '{"prazo_entrega":"1","dias_entrega":"Seg a Sáb","transportadora":"Própria","pedido_minimo":150,"frete_minimo":0,"regiao_atendimento":"Grande São Paulo"}'::jsonb, ARRAY[]::varchar[], '{"qualidade":9,"prazo":9,"atendimento":9,"preco":8}'::jsonb, ARRAY[]::jsonb[], ARRAY[]::jsonb[], '{"status":"Ativo","motivo":""}'::jsonb);
