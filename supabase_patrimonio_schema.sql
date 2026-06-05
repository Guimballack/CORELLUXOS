-- TABELAS DO MÓDULO DE PATRIMÔNIO E MATERIAIS OPERACIONAIS

-- 1. CATEGORIAS DE PATRIMÔNIO
CREATE TABLE IF NOT EXISTS patrimonio_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50) DEFAULT 'fa-box',
    color VARCHAR(30) DEFAULT 'color-blue',
    status VARCHAR(30) DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ITENS DE PATRIMÔNIO
CREATE TABLE IF NOT EXISTS patrimonio_items (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    unit VARCHAR(30) DEFAULT 'Unidade',
    qty_actual INT NOT NULL DEFAULT 0,
    qty_min INT DEFAULT 0,
    value_unit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    value_total DECIMAL(12, 2) GENERATED ALWAYS AS (qty_actual * value_unit) STORED,
    sector_actual VARCHAR(100) DEFAULT 'Almoxarifado',
    location VARCHAR(200),
    acquisition_date DATE DEFAULT CURRENT_DATE,
    supplier VARCHAR(200),
    notes TEXT,
    status VARCHAR(30) DEFAULT 'Ativo', -- Ativo, Em uso, Em manutenção, Quebrado, Perdido, Baixado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MOVIMENTAÇÕES DE PATRIMÔNIO
CREATE TABLE IF NOT EXISTS patrimonio_movements (
    id SERIAL PRIMARY KEY,
    item_sku VARCHAR(50) NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    type VARCHAR(30) NOT NULL, -- Entrada, Saída
    subtype VARCHAR(50) NOT NULL, -- Compra, Inventário, Devolução, Transferência, Quebra, Perda, Furto, Descarte
    qty INT NOT NULL,
    responsible VARCHAR(100) NOT NULL,
    reason TEXT,
    notes TEXT,
    date DATE DEFAULT CURRENT_DATE,
    time TIME DEFAULT CURRENT_TIME,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RESPONSABILIDADE POR FUNCIONÁRIO (CAUTELAS)
CREATE TABLE IF NOT EXISTS patrimonio_responsibility (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL,
    employee_name VARCHAR(200) NOT NULL,
    item_sku VARCHAR(50) NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    delivery_date DATE DEFAULT CURRENT_DATE,
    return_date DATE,
    signature VARCHAR(200),
    status VARCHAR(30) DEFAULT 'Pendente', -- Pendente, Devolvido, Atrasado
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. INVENTÁRIOS DE PATRIMÔNIO
CREATE TABLE IF NOT EXISTS patrimonio_inventories (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- Diário, Semanal, Mensal, Trimestral, Anual
    responsible VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    status VARCHAR(30) DEFAULT 'Concluído',
    date DATE DEFAULT CURRENT_DATE,
    divergences JSONB, -- Detalhes das divergências encontradas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. AUDITORIA DE PATRIMÔNIO
CREATE TABLE IF NOT EXISTS patrimonio_audits (
    id SERIAL PRIMARY KEY,
    responsible VARCHAR(100) NOT NULL,
    operation VARCHAR(200) NOT NULL, -- Alteração de Status, Edição de Item, Novo Item, etc.
    item_sku VARCHAR(50) NOT NULL,
    field VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
