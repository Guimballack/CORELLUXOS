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
    controla_producao BOOLEAN DEFAULT FALSE,
    volume_ocupado NUMERIC(10,4) DEFAULT 0.0000,
    allowed_zones INTEGER[] DEFAULT '{}',
    pode_empilhar BOOLEAN DEFAULT FALSE,
    max_empilhamento INTEGER DEFAULT 1,
    allowed_cells TEXT[] DEFAULT '{}',
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
INSERT INTO sectors (id, name, icon, color, description, status) VALUES
(1, 'ADMINISTRATIVO E FINANCEIRO', 'fa-briefcase', 'color-purple', 'Setor administrativo, recursos humanos, financeiro e gerência geral.', 'Ativo'),
(2, 'SALÃO E ATENDIMENTO', 'fa-utensils', 'color-teal', 'Setor de atendimento ao cliente no salão, recepção e coordenação de mesas.', 'Ativo'),
(3, 'DELIVERY', 'fa-motorcycle', 'color-orange', 'Setor de atendimento de pedidos externos e entregas rápidas.', 'Ativo'),
(4, 'PRODUÇÃO', 'fa-fire-burner', 'color-red', 'Setor de preparação de massas, pizzas, molhos e pratos da cozinha.', 'Ativo'),
(5, 'BAR', 'fa-wine-bottle', 'color-lightblue', 'Setor de preparo de drinks, coquetéis e bebidas em geral.', 'Ativo'),
(6, 'ESTOQUE E SUPRIMENTOS', 'fa-boxes-stacked', 'color-blue', 'Setor de recebimento, cotação, compras e controle de insumos.', 'Ativo'),
(7, 'SERVIÇOS GERAIS', 'fa-spray-can', 'color-green', 'Setor de higienização, limpeza e conservação das instalações.', 'Ativo');

-- Inserir áreas operacionais (Cargos)
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
    acronym VARCHAR(2) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de Zonas de Armazenamento
CREATE TABLE wms_zones (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES wms_warehouses(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(3) NOT NULL,
    acronym_description TEXT,
    type VARCHAR(50) DEFAULT 'Seco' CHECK (type IN ('Seco', 'Resfriado', 'Congelado', 'Climatizado')),
    description TEXT,
    status VARCHAR(50) DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    temp_min INTEGER,
    temp_max INTEGER,
    is_ambient BOOLEAN DEFAULT FALSE,
    ambient_type VARCHAR(50) CHECK (ambient_type IN ('fechada', 'externa_aberta', 'externa_coberta')),
    volume_cubico_padrao NUMERIC(10,4) DEFAULT 0.0000,
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
    volume_cubico NUMERIC(10,4) DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(zone_id, aisle, row, shelf, position)
);

-- Inserir dados iniciais do WMS para testes
INSERT INTO wms_warehouses (name, acronym, description, status) VALUES
('Armazém Central', 'AC', 'Centro de distribuição e estoque principal de insumos.', 'Ativo');

INSERT INTO wms_zones (warehouse_id, name, acronym_description, type, description, status, temp_min, temp_max, is_ambient, ambient_type) VALUES
(1, 'CFA', 'Câmara Fria A', 'Resfriado', 'Armazenamento de laticínios e verduras.', 'Ativo', 2, 8, false, null),
(1, 'CFB', 'Câmara Fria B', 'Congelado', 'Armazenamento de carnes e congelados.', 'Ativo', -18, -10, false, null),
(1, 'ESA', 'Estoque Seco A', 'Seco', 'Armazenamento de massas, grãos e enlatados.', 'Ativo', 15, 25, true, 'fechada'),
(1, 'ESB', 'Estoque Seco B', 'Seco', 'Armazenamento de temperos e embalagens.', 'Ativo', 15, 25, true, 'fechada');



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
