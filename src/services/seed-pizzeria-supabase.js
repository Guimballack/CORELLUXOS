import fs from 'fs';
import pg from 'pg';
const { Client } = pg;
import * as mockData from '../utils/initial-data.js';

// Parse .env manually
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const databaseUrl = env['DATABASE_DIRECT_URL'] || env['DATABASE_URL'];
if (!databaseUrl) {
  console.error('[Error] DATABASE_DIRECT_URL or DATABASE_URL not found in .env');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
});

async function runSeed() {
  try {
    console.log('--- CONECTANDO AO SUPABASE POSTGRESQL ---');
    await client.connect();
    console.log('Conectado com sucesso.');

    console.log('\n--- 1. CRIANDO TABELAS ADICIONAIS SE NÃO EXISTIREM ---');
    
    // Checklist tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS checklist_models (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        sector VARCHAR(100) NOT NULL,
        frequency VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'Ativo',
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        last_modified VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS checklist_executions (
        id SERIAL PRIMARY KEY,
        model_id VARCHAR(100) REFERENCES checklist_models(id) ON UPDATE CASCADE ON DELETE SET NULL,
        model_name VARCHAR(150),
        "user" VARCHAR(100),
        start_time TIMESTAMP WITH TIME ZONE,
        end_time TIMESTAMP WITH TIME ZONE,
        answers JSONB NOT NULL DEFAULT '{}'::jsonb,
        score NUMERIC(5,2),
        latitude NUMERIC(10,8),
        longitude NUMERIC(11,8),
        status VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS checklist_non_conformities (
        id SERIAL PRIMARY KEY,
        checklist_execution_id INTEGER REFERENCES checklist_executions(id) ON DELETE CASCADE,
        item_id VARCHAR(100),
        item_label TEXT,
        description TEXT,
        reported_by VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Pendente',
        timestamp TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS checklist_action_plans (
        id SERIAL PRIMARY KEY,
        non_conformity_id INTEGER REFERENCES checklist_non_conformities(id) ON DELETE CASCADE,
        description TEXT,
        responsible VARCHAR(100),
        due_date DATE,
        status VARCHAR(50) DEFAULT 'Pendente',
        completed_at DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS checklist_audit_logs (
        id SERIAL PRIMARY KEY,
        execution_id INTEGER REFERENCES checklist_executions(id) ON DELETE SET NULL,
        "user" VARCHAR(100),
        action VARCHAR(100),
        timestamp TIMESTAMP WITH TIME ZONE,
        details TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        date DATE DEFAULT CURRENT_DATE,
        read_by JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        sku VARCHAR(50) NOT NULL,
        product_name VARCHAR(150) NOT NULL,
        type VARCHAR(50) NOT NULL,
        quantity NUMERIC(10,3) NOT NULL,
        user_name VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        details TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);
    console.log('Tabelas de checklist, avisos, configurações e WMS stock_movements verificadas/criadas.');

    // Patrimonio tables (from supabase_patrimonio_schema.sql)
    await client.query(`
      CREATE TABLE IF NOT EXISTS patrimonio_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        icon VARCHAR(50) DEFAULT 'fa-box',
        color VARCHAR(30) DEFAULT 'color-blue',
        status VARCHAR(30) DEFAULT 'Ativo',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

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
        status VARCHAR(30) DEFAULT 'Ativo',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS patrimonio_movements (
        id SERIAL PRIMARY KEY,
        item_sku VARCHAR(50) NOT NULL,
        item_name VARCHAR(200) NOT NULL,
        type VARCHAR(30) NOT NULL,
        subtype VARCHAR(50) NOT NULL,
        qty INT NOT NULL,
        responsible VARCHAR(100) NOT NULL,
        reason TEXT,
        notes TEXT,
        date DATE DEFAULT CURRENT_DATE,
        time TIME DEFAULT CURRENT_TIME,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

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
        status VARCHAR(30) DEFAULT 'Pendente',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS patrimonio_inventories (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        responsible VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL,
        status VARCHAR(30) DEFAULT 'Concluído',
        date DATE DEFAULT CURRENT_DATE,
        divergences JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS patrimonio_audits (
        id SERIAL PRIMARY KEY,
        responsible VARCHAR(100) NOT NULL,
        operation VARCHAR(200) NOT NULL,
        item_sku VARCHAR(50) NOT NULL,
        field VARCHAR(100) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Tabelas de patrimônio verificadas/criadas.');

    console.log('\n--- 2. HABILITANDO RLS E CRIANDO POLÍTICAS PERMISSIVAS PARA ANON ---');
    await client.query(`
      -- Habilitar RLS se necessário
      ALTER TABLE patrimonio_categories ENABLE ROW LEVEL SECURITY;
      ALTER TABLE patrimonio_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE patrimonio_movements ENABLE ROW LEVEL SECURITY;
      ALTER TABLE patrimonio_responsibility ENABLE ROW LEVEL SECURITY;
      ALTER TABLE patrimonio_inventories ENABLE ROW LEVEL SECURITY;
      ALTER TABLE patrimonio_audits ENABLE ROW LEVEL SECURITY;
      ALTER TABLE checklist_models ENABLE ROW LEVEL SECURITY;
      ALTER TABLE checklist_executions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE checklist_non_conformities ENABLE ROW LEVEL SECURITY;
      ALTER TABLE checklist_action_plans ENABLE ROW LEVEL SECURITY;
      ALTER TABLE checklist_audit_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
      ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

      -- Criar políticas se não existirem
      DROP POLICY IF EXISTS "anon_all_patrimonio_categories" ON patrimonio_categories;
      CREATE POLICY "anon_all_patrimonio_categories" ON patrimonio_categories FOR ALL TO anon USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "anon_all_patrimonio_items" ON patrimonio_items;
      CREATE POLICY "anon_all_patrimonio_items" ON patrimonio_items FOR ALL TO anon USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "anon_all_patrimonio_movements" ON patrimonio_movements;
      CREATE POLICY "anon_all_patrimonio_movements" ON patrimonio_movements FOR ALL TO anon USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "anon_all_patrimonio_responsibility" ON patrimonio_responsibility;
      CREATE POLICY "anon_all_patrimonio_responsibility" ON patrimonio_responsibility FOR ALL TO anon USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "anon_all_patrimonio_inventories" ON patrimonio_inventories;
      CREATE POLICY "anon_all_patrimonio_inventories" ON patrimonio_inventories FOR ALL TO anon USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "anon_all_patrimonio_audits" ON patrimonio_audits;
      CREATE POLICY "anon_all_patrimonio_audits" ON patrimonio_audits FOR ALL TO anon USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "anon_all_checklist_models" ON checklist_models;
      CREATE POLICY "anon_all_checklist_models" ON checklist_models FOR ALL TO anon USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "anon_all_checklist_executions" ON checklist_executions;
      CREATE POLICY "anon_all_checklist_executions" ON checklist_executions FOR ALL TO anon USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "anon_all_checklist_non_conformities" ON checklist_non_conformities;
      CREATE POLICY "anon_all_checklist_non_conformities" ON checklist_non_conformities FOR ALL TO anon USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "anon_all_checklist_action_plans" ON checklist_action_plans;
      CREATE POLICY "anon_all_checklist_action_plans" ON checklist_action_plans FOR ALL TO anon USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "anon_all_checklist_audit_logs" ON checklist_audit_logs;
      CREATE POLICY "anon_all_checklist_audit_logs" ON checklist_audit_logs FOR ALL TO anon USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "anon_all_notifications" ON notifications;
      CREATE POLICY "anon_all_notifications" ON notifications FOR ALL TO anon USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "anon_all_app_settings" ON app_settings;
      CREATE POLICY "anon_all_app_settings" ON app_settings FOR ALL TO anon USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "anon_all_stock_movements" ON stock_movements;
      CREATE POLICY "anon_all_stock_movements" ON stock_movements FOR ALL TO anon USING (true) WITH CHECK (true);
    `);
    console.log('Políticas de segurança RLS configuradas para acesso anônimo.');

    console.log('\n--- 3. LIMPANDO DADOS EXISTENTES (TRUNCATE CASCADE) ---');
    await client.query(`
      TRUNCATE TABLE 
        stock_batches,
        products,
        suppliers,
        categories,
        sale_products,
        sale_product_categories,
        areas,
        sectors,
        app_users,
        wms_locations,
        wms_zones,
        wms_warehouses,
        patrimonio_movements,
        patrimonio_responsibility,
        patrimonio_inventories,
        patrimonio_audits,
        patrimonio_items,
        patrimonio_categories,
        checklist_audit_logs,
        checklist_action_plans,
        checklist_non_conformities,
        checklist_executions,
        checklist_models,
        notifications,
        app_settings,
        stock_movements
      RESTART IDENTITY CASCADE;
    `);
    console.log('Tabelas limpas e sequências de IDs reiniciadas.');

    console.log('\n--- 4. SEMEANDO DADOS ESTÁTICOS ---');

    // 4.1 Sectors
    console.log('Semeando Setores (sectors)...');
    await bulkInsert(client, 'sectors', mockData.sectors);

    // 4.2 Areas (Cargos)
    console.log('Semeando Cargos (areas)...');
    await bulkInsert(client, 'areas', mockData.areas);

    // 4.3 Users (30 Funcionários)
    console.log('Semeando Funcionários (app_users)...');
    await bulkInsert(client, 'app_users', mockData.users);

    // 4.4 Categories (Materiais)
    console.log('Semeando Categorias de Materiais (categories)...');
    await bulkInsert(client, 'categories', mockData.categories);

    // 4.5 Sale Product Categories
    console.log('Semeando Categorias de Venda (sale_product_categories)...');
    await bulkInsert(client, 'sale_product_categories', mockData.saleProductCategories);

    // 4.6 Suppliers (Fornecedores)
    console.log('Semeando Fornecedores (suppliers)...');
    await bulkInsert(client, 'suppliers', mockData.suppliers);

    // 4.7 Products (Insumos)
    console.log('Semeando Insumos de Estoque (products)...');
    await bulkInsert(client, 'products', mockData.products);

    // 4.8 Sale Products (Cardápio)
    console.log('Semeando Cardápio de Venda (sale_products)...');
    const saleProducts = [
      { code: 'PIZ-001', name: 'Pizza Calabresa G', category: 'PIZZAS', description: 'Molho de tomate, queijo muçarela, calabresa fatiada, cebola e orégano.', price: 52.90, unit: 'UN', status: 'Ativo', controla_producao: true, recipe: [{ ingredientSku: 'MAS-001', quantity: 0.25, unit: 'KG' }, { ingredientSku: 'MAS-002', quantity: 0.005, unit: 'KG' }, { ingredientSku: 'LAC-001', quantity: 0.25, unit: 'KG' }, { ingredientSku: 'MOL-001', quantity: 0.08, unit: 'KG' }, { ingredientSku: 'PRO-001', quantity: 0.15, unit: 'KG' }, { ingredientSku: 'HOR-003', quantity: 0.05, unit: 'KG' }, { ingredientSku: 'TMP-002', quantity: 0.005, unit: 'KG' }, { ingredientSku: 'EMB-001', quantity: 1, unit: 'UN' }] },
      { code: 'PIZ-002', name: 'Pizza Margherita G', category: 'PIZZAS', description: 'Molho de tomate, queijo muçarela, rodelas de tomate fresco, manjericão e azeite.', price: 49.90, unit: 'UN', status: 'Ativo', controla_producao: true, recipe: [{ ingredientSku: 'MAS-001', quantity: 0.25, unit: 'KG' }, { ingredientSku: 'MAS-002', quantity: 0.005, unit: 'KG' }, { ingredientSku: 'LAC-001', quantity: 0.25, unit: 'KG' }, { ingredientSku: 'MOL-001', quantity: 0.08, unit: 'KG' }, { ingredientSku: 'HOR-001', quantity: 0.1, unit: 'KG' }, { ingredientSku: 'HOR-004', quantity: 0.05, unit: 'UN' }, { ingredientSku: 'EMB-001', quantity: 1, unit: 'UN' }] },
      { code: 'PIZ-003', name: 'Pizza Frango com Catupiry G', category: 'PIZZAS', description: 'Molho de tomate, queijo muçarela, peito de frango desfiado e requeijão culinário.', price: 56.90, unit: 'UN', status: 'Ativo', controla_producao: true, recipe: [{ ingredientSku: 'MAS-001', quantity: 0.25, unit: 'KG' }, { ingredientSku: 'MAS-002', quantity: 0.005, unit: 'KG' }, { ingredientSku: 'LAC-001', quantity: 0.2, unit: 'KG' }, { ingredientSku: 'MOL-001', quantity: 0.08, unit: 'KG' }, { ingredientSku: 'PRO-004', quantity: 0.2, unit: 'KG' }, { ingredientSku: 'LAC-002', quantity: 0.15, unit: 'UN' }, { ingredientSku: 'EMB-001', quantity: 1, unit: 'UN' }] },
      { code: 'PIZ-004', name: 'Pizza Quatro Queijos G', category: 'PIZZAS', description: 'Molho de tomate, queijo muçarela, parmesão, provolone e gorgonzola.', price: 59.90, unit: 'UN', status: 'Ativo', controla_producao: true, recipe: [{ ingredientSku: 'MAS-001', quantity: 0.25, unit: 'KG' }, { ingredientSku: 'MAS-002', quantity: 0.005, unit: 'KG' }, { ingredientSku: 'LAC-001', quantity: 0.2, unit: 'KG' }, { ingredientSku: 'MOL-001', quantity: 0.08, unit: 'KG' }, { ingredientSku: 'LAC-003', quantity: 0.08, unit: 'KG' }, { ingredientSku: 'LAC-004', quantity: 0.05, unit: 'KG' }, { ingredientSku: 'LAC-005', quantity: 0.05, unit: 'KG' }, { ingredientSku: 'EMB-001', quantity: 1, unit: 'UN' }] },
      { code: 'PIZ-005', name: 'Pizza Portuguesa G', category: 'PIZZAS', description: 'Molho de tomate, muçarela, presunto cozido, cebola, azeitona preta e ovos.', price: 54.90, unit: 'UN', status: 'Ativo', controla_producao: true, recipe: [{ ingredientSku: 'MAS-001', quantity: 0.25, unit: 'KG' }, { ingredientSku: 'MAS-002', quantity: 0.005, unit: 'KG' }, { ingredientSku: 'LAC-001', quantity: 0.2, unit: 'KG' }, { ingredientSku: 'MOL-001', quantity: 0.08, unit: 'KG' }, { ingredientSku: 'PRO-002', quantity: 0.1, unit: 'KG' }, { ingredientSku: 'HOR-003', quantity: 0.05, unit: 'KG' }, { ingredientSku: 'HOR-007', quantity: 0.03, unit: 'KG' }, { ingredientSku: 'EMB-001', quantity: 1, unit: 'UN' }] },
      { code: 'PIZ-006', name: 'Pizza Pepperoni G', category: 'PIZZAS', description: 'Molho de tomate, queijo muçarela, pepperoni fatiado e orégano.', price: 62.90, unit: 'UN', status: 'Ativo', controla_producao: true, recipe: [{ ingredientSku: 'MAS-001', quantity: 0.25, unit: 'KG' }, { ingredientSku: 'MAS-002', quantity: 0.005, unit: 'KG' }, { ingredientSku: 'LAC-001', quantity: 0.25, unit: 'KG' }, { ingredientSku: 'MOL-001', quantity: 0.08, unit: 'KG' }, { ingredientSku: 'PRO-001', quantity: 0.12, unit: 'KG' }, { ingredientSku: 'EMB-001', quantity: 1, unit: 'UN' }] },
      { code: 'PIZ-007', name: 'Pizza Rúcula com Tomate Seco G', category: 'PIZZAS', description: 'Molho de tomate, queijo muçarela, tomate seco fresco, rúcula e azeite.', price: 58.90, unit: 'UN', status: 'Ativo', controla_producao: true, recipe: [{ ingredientSku: 'MAS-001', quantity: 0.25, unit: 'KG' }, { ingredientSku: 'MAS-002', quantity: 0.005, unit: 'KG' }, { ingredientSku: 'LAC-001', quantity: 0.2, unit: 'KG' }, { ingredientSku: 'MOL-001', quantity: 0.08, unit: 'KG' }, { ingredientSku: 'HOR-001', quantity: 0.1, unit: 'KG' }, { ingredientSku: 'HOR-005', quantity: 0.1, unit: 'UN' }, { ingredientSku: 'EMB-001', quantity: 1, unit: 'UN' }] },
      { code: 'PIZ-008', name: 'Pizza Brigadeiro G', category: 'SOBREMESAS', description: 'Chocolate ao leite cremoso espalhado e granulado de chocolate.', price: 48.90, unit: 'UN', status: 'Ativo', controla_producao: true, recipe: [{ ingredientSku: 'MAS-001', quantity: 0.25, unit: 'KG' }, { ingredientSku: 'MAS-002', quantity: 0.005, unit: 'KG' }, { ingredientSku: 'EMB-001', quantity: 1, unit: 'UN' }] },
      { code: 'BEB-001', name: 'Refrigerante Coca-Cola 2L', category: 'BEBIDAS', description: 'Refrigerante garrafa gelada 2 litros.', price: 12.00, unit: 'UN', status: 'Ativo', controla_producao: false, recipe: [{ ingredientSku: 'BEB-001', quantity: 1, unit: 'UN' }, { ingredientSku: 'EMB-002', quantity: 1, unit: 'UN' }] },
      { code: 'BEB-002', name: 'Refrigerante Guaraná Antarctica 2L', category: 'BEBIDAS', description: 'Refrigerante garrafa gelada 2 litros.', price: 10.00, unit: 'UN', status: 'Ativo', controla_producao: false, recipe: [{ ingredientSku: 'BEB-002', quantity: 1, unit: 'UN' }, { ingredientSku: 'EMB-002', quantity: 1, unit: 'UN' }] },
      { code: 'BEB-003', name: 'Cerveja Stella Artois Long Neck', category: 'BEBIDAS', description: 'Cerveja long neck Stella Artois 330ml.', price: 9.00, unit: 'UN', status: 'Ativo', controla_producao: false, recipe: [{ ingredientSku: 'BEB-003', quantity: 1, unit: 'UN' }] },
      { code: 'BEB-004', name: 'Água Mineral Sem Gás 500ml', category: 'BEBIDAS', description: 'Água mineral sem gás 500ml gelada.', price: 4.00, unit: 'UN', status: 'Ativo', controla_producao: false, recipe: [{ ingredientSku: 'BEB-004', quantity: 1, unit: 'UN' }] }
    ];
    await bulkInsert(client, 'sale_products', saleProducts);

    // 4.9 WMS Structure
    console.log('Semeando Armazéns (wms_warehouses)...');
    const wmsWarehouses = [{ id: 1, name: 'Armazém Central AC', acronym: 'AC', description: 'CD principal de insumos e embalagens.', status: 'Ativo' }];
    await bulkInsert(client, 'wms_warehouses', wmsWarehouses);

    console.log('Semeando Zonas WMS (wms_zones)...');
    const wmsZones = [
      { id: 1, warehouseId: 1, name: 'CFA', acronymDescription: 'Câmara Fria A', type: 'Resfriado', description: 'Armazenamento de laticínios e frios.', status: 'Ativo', tempMin: 2, tempMax: 8, isAmbient: false },
      { id: 2, warehouseId: 1, name: 'CFB', acronymDescription: 'Câmara Fria B', type: 'Congelado', description: 'Armazenamento de carnes e congelados.', status: 'Ativo', tempMin: -18, tempMax: -10, isAmbient: false },
      { id: 3, warehouseId: 1, name: 'ESA', acronymDescription: 'Estoque Seco A', type: 'Seco', description: 'Armazenamento de farinhas, molhos e grãos.', status: 'Ativo', tempMin: 15, tempMax: 25, isAmbient: true, ambientType: 'fechada' },
      { id: 4, warehouseId: 1, name: 'ESB', acronymDescription: 'Estoque Seco B', type: 'Seco', description: 'Armazenamento de temperos, embalagens e descartáveis.', status: 'Ativo', tempMin: 15, tempMax: 25, isAmbient: true, ambientType: 'fechada' }
    ];
    await bulkInsert(client, 'wms_zones', wmsZones);

    console.log('Gerando e semeando Localizações WMS (wms_locations)...');
    const wmsLocations = [];
    wmsZones.forEach(zone => {
      for (let aisle = 1; aisle <= 2; aisle++) {
        for (let row = 1; row <= 4; row++) {
          for (let shelf = 1; shelf <= 3; shelf++) {
            wmsLocations.push({
              id: wmsLocations.length + 1,
              zoneId: zone.id,
              aisle: `Corredor ${aisle}`,
              row: `Fileira ${row}`,
              shelf: `Nível ${shelf}`,
              position: `Posição ${shelf}`,
              status: 'Ativo',
              volumeCubico: 2.5
            });
          }
        }
      }
    });
    await bulkInsert(client, 'wms_locations', wmsLocations);

    // 4.10 Batches (Lotes iniciais)
    console.log('Semeando Lotes de Estoque (stock_batches)...');
    await bulkInsert(client, 'stock_batches', mockData.stockBatches);

    // 4.11 Patrimonio Categories
    console.log('Semeando Categorias do Patrimônio...');
    const patrimonioCategories = [
      { name: 'Equipamentos', icon: 'fa-screwdriver-wrench', color: 'color-red', status: 'Ativo' },
      { name: 'Tecnologia', icon: 'fa-laptop', color: 'color-blue', status: 'Ativo' }
    ];
    await bulkInsert(client, 'patrimonio_categories', patrimonioCategories);

    // 4.12 Patrimonio Items
    console.log('Semeando Itens do Patrimônio...');
    const patrimonioItems = [
      { id: 1, code: 'FOR-001', name: 'Forno de Pizza Lenha/Gás DiVolcano', category: 'Equipamentos', subcategory: 'Forno', unit: 'Unidade', qtyActual: 1, qtyMin: 1, valueUnit: 18000.00, sectorActual: 'Produção', location: 'Cozinha Central', acquisitionDate: '2025-06-01', supplier: 'Fornos DiVolcano', notes: 'Forno híbrido rotativo profissional.', status: 'Ativo' },
      { id: 2, code: 'MAS-001', name: 'Masseira Espiral Industrial 25kg', category: 'Equipamentos', subcategory: 'Misturadores', unit: 'Unidade', qtyActual: 1, qtyMin: 1, valueUnit: 6500.00, sectorActual: 'Produção', location: 'Cozinha Preparação', acquisitionDate: '2025-06-01', supplier: 'Masseiras Premium', notes: 'Masseira de duas velocidades.', status: 'Ativo' },
      { id: 3, code: 'GEL-001', name: 'Geladeira Comercial Inox 4 Portas', category: 'Equipamentos', subcategory: 'Refrigeração', unit: 'Unidade', qtyActual: 2, qtyMin: 1, valueUnit: 4800.00, sectorActual: 'Produção', location: 'Despensa de Frios', acquisitionDate: '2025-06-15', supplier: 'Refrigeração Inox', notes: 'Utilizada para conservação diária.', status: 'Ativo' },
      { id: 4, code: 'PDV-001', name: 'Computador Caixa PDV Bematech', category: 'Tecnologia', subcategory: 'PDV', unit: 'Unidade', qtyActual: 1, qtyMin: 1, valueUnit: 3500.00, sectorActual: 'Salão', location: 'Caixa Entrada', acquisitionDate: '2025-06-01', supplier: 'BemaTech BR', notes: 'Computador integrado de atendimento.', status: 'Ativo' },
      { id: 5, code: 'TAB-001', name: 'Tablets Samsung Galaxy Tab A7', category: 'Tecnologia', subcategory: 'Comandas', unit: 'Unidade', qtyActual: 6, qtyMin: 2, valueUnit: 950.00, sectorActual: 'Salão', location: 'Armário Atendimento', acquisitionDate: '2025-07-10', supplier: 'Magazine Luiza', notes: 'Para lançamento de pedidos.', status: 'Ativo' },
      { id: 6, code: 'SPL-001', name: 'Ar Condicionado Split 24000 BTU', category: 'Equipamentos', subcategory: 'Climatização', unit: 'Unidade', qtyActual: 3, qtyMin: 1, valueUnit: 2900.00, sectorActual: 'Salão', location: 'Climatização Geral', acquisitionDate: '2025-06-10', supplier: 'FrioMax Split', notes: 'Split inverter econômico.', status: 'Ativo' }
    ];
    await bulkInsert(client, 'patrimonio_items', patrimonioItems);

    // 4.13 Patrimonio Movements
    console.log('Semeando Movimentações de Patrimônio...');
    const patrimonioMovements = [
      { itemSku: 'FOR-001', itemName: 'Forno de Pizza Lenha/Gás DiVolcano', type: 'Manutenção Preventiva', subtype: 'Preventiva', qty: 1, responsible: 'Rafael Mendes', reason: 'Limpeza anual das chaminés e calibração dos queimadores a gás.', notes: 'Limpeza e calibração efetuadas.', date: '2026-05-10', time: '15:00:00', timestamp: '2026-05-10T15:00:00Z' },
      { itemSku: 'GEL-001', itemName: 'Geladeira Comercial Inox 4 Portas', type: 'Manutenção Corretiva', subtype: 'Corretiva', qty: 1, responsible: 'Bruno Silva', reason: 'Troca do termostato digital que apresentava oscilação na leitura de graus.', notes: 'Termostato substituído.', date: '2026-03-12', time: '10:30:00', timestamp: '2026-03-12T10:30:00Z' }
    ];
    await bulkInsert(client, 'patrimonio_movements', patrimonioMovements);

    // 4.14 Checklist Models
    console.log('Semeando Modelos de Checklist (checklist_models)...');
    const checklistModels = [
      {
        id: 'mod_pizzaria_1',
        name: 'ABERTURA DA COZINHA (PIZZARIA)',
        sector: 'PRODUÇÃO',
        frequency: 'Diário',
        status: 'Ativo',
        items: [
          { id: 'ab_1', type: 'sim_nao', label: 'Todos os manipuladores de alimentos estão com uniforme completo e touca?', required: true, conditionalPhoto: true, conditionalObs: true },
          { id: 'ab_2', type: 'sim_nao', label: 'Câmara Fria A (Laticínios) está operando entre 2°C e 6°C?', required: true, conditionalPhoto: false, conditionalObs: true },
          { id: 'ab_3', type: 'sim_nao', label: 'Câmara Fria B (Carnes/Congelados) está operando abaixo de -10°C?', required: true, conditionalPhoto: false, conditionalObs: true },
          { id: 'ab_4', type: 'checkbox', label: 'Pré-aquecimento do forno iniciado.', required: true },
          { id: 'ab_5', type: 'checkbox', label: 'Bancadas de inox e masseira sanitizadas com álcool 70%.', required: true }
        ],
        last_modified: new Date().toLocaleString('pt-BR')
      },
      {
        id: 'mod_pizzaria_2',
        name: 'FECHAMENTO DO SALÃO E BAR',
        sector: 'SALÃO E ATENDIMENTO',
        frequency: 'Diário',
        status: 'Ativo',
        items: [
          { id: 'fc_1', type: 'sim_nao', label: 'Todas as mesas e cadeiras foram higienizadas e organizadas?', required: true, conditionalPhoto: false, conditionalObs: false },
          { id: 'fc_2', type: 'sim_nao', label: 'Maquininhas de cartão limpas e na base de carregamento?', required: true, conditionalPhoto: false, conditionalObs: true },
          { id: 'fc_3', type: 'sim_nao', label: 'Ar condicionados, luzes e som ambiente desligados?', required: true, conditionalPhoto: false, conditionalObs: false },
          { id: 'fc_4', type: 'checkbox', label: 'Lixos recolhidos e áreas varridas/passado pano.', required: true }
        ],
        last_modified: new Date().toLocaleString('pt-BR')
      },
      {
        id: 'mod_pizzaria_3',
        name: 'RECEBIMENTO DE INSUMOS (WMS)',
        sector: 'ESTOQUE E SUPRIMENTOS',
        frequency: 'Periódico',
        status: 'Ativo',
        items: [
          { id: 'rc_1', type: 'sim_nao', label: 'A temperatura do veículo de transporte de laticínios/frios estava adequada?', required: true, conditionalPhoto: true, conditionalObs: true },
          { id: 'rc_2', type: 'sim_nao', label: 'Os lotes entregues possuem validade superior a 30 dias?', required: true, conditionalPhoto: false, conditionalObs: true },
          { id: 'rc_3', type: 'checkbox', label: 'Conferência física das quantidades com a Nota Fiscal.', required: true }
        ],
        last_modified: new Date().toLocaleString('pt-BR')
      }
    ];
    await bulkInsert(client, 'checklist_models', checklistModels);

    // 4.15 Notifications
    console.log('Semeando Avisos/Notifications...');
    const today = new Date();
    const notifications = [
      { title: 'Inauguração do Forno Especial', message: 'Prezados, hoje iniciamos a operação com o novo queimador do forno a lenha/gás.', date: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], read_by: [] },
      { title: 'Uso Obrigatório de EPIs na Cozinha', message: 'Lembramos a todos os pizzaiolos e auxiliares a obrigatoriedade do uso de touca e avental em toda a área de produção.', date: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], read_by: [] },
      { title: 'Escala de Folgas Junho/2026', message: 'A escala mensal de folgas já está disponível no quadro administrativo. Favor conferir.', date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], read_by: [] }
    ];
    await bulkInsert(client, 'notifications', notifications);

    console.log('\n--- 5. GERANDO E SEMEANDO HISTÓRICO OPERACIONAL DE 1 ANO ---');
    const usersList = mockData.users || [];

    // Arrays to collect historical entries to insert in batch
    const checklistExecutionsToInsert = [];
    const stockMovementsToInsert = [];

    const productMap = {};
    mockData.products.forEach(p => {
      productMap[p.sku] = p.name;
    });

    for (let offset = 365; offset >= 1; offset--) {
      const currentDate = new Date(today.getTime() - offset * 24 * 60 * 60 * 1000);
      const dateStr = currentDate.toISOString().split('T')[0];
      const dow = currentDate.getDay();

      // Checklist Executions setup
      const abUser = usersList.find(u => u.role === 'Pizzaiolo' || u.role === 'Supervisor de Turno') || usersList[0];
      const isAbConform = Math.random() > 0.05;
      const abScore = isAbConform ? 100 : Math.round(60 + Math.random() * 25);
      const abAnswers = {
        'ab_1': { value: 'sim', comment: '' },
        'ab_2': { value: 'sim', comment: 'Geladeira em 4.5°C' },
        'ab_3': { value: 'sim', comment: 'Câmara Fria em -11.8°C' },
        'ab_4': { value: true },
        'ab_5': { value: true }
      };

      let pendingNC = null;
      let pendingPlan = null;

      if (!isAbConform) {
        const isTempFail = Math.random() > 0.5;
        if (isTempFail) {
          abAnswers['ab_2'] = { value: 'nao', comment: 'Registrando 9.2°C' };
          pendingNC = {
            item_id: 'ab_2',
            item_label: 'Câmara Fria A (Laticínios) está operando entre 2°C e 6°C?',
            description: 'Geladeira principal registrando 9.2°C devido a sobrecarga de insumos recém-recebidos.',
            reported_by: abUser.name,
            status: 'Resolvido',
            timestamp: `${dateStr}T08:45:00Z`
          };
          pendingPlan = {
            description: 'Ajustar fluxo de ar, redistribuir itens e reavaliar temperatura em 1 hora.',
            responsible: 'Rafael Mendes',
            due_date: new Date(currentDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'Concluído',
            completed_at: new Date(currentDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            notes: 'Ajustado. Temperatura estabilizada em 4.1°C após redistribuição.'
          };
        } else {
          abAnswers['ab_1'] = { value: 'nao', comment: 'Colaborador recém-admitido sem a touca de proteção.' };
          pendingNC = {
            item_id: 'ab_1',
            item_label: 'Todos os manipuladores de alimentos estão com uniforme completo e touca?',
            description: 'Flagrado colaborador sem o uso obrigatório de touca de barreira na produção.',
            reported_by: abUser.name,
            status: 'Resolvido',
            timestamp: `${dateStr}T08:15:00Z`
          };
          pendingPlan = {
            description: 'Fornecer touca descartável imediatamente e alertar sobre advertências.',
            responsible: 'Camila Costa',
            due_date: new Date(currentDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'Concluído',
            completed_at: new Date(currentDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            notes: 'Fornecida a touca. Colaborador reorientado sobre as Boas Práticas de Fabricação (BPF).'
          };
        }
      }

      checklistExecutionsToInsert.push({
        model_id: 'mod_pizzaria_1',
        model_name: 'ABERTURA DA COZINHA (PIZZARIA)',
        user: abUser.name,
        start_time: `${dateStr}T08:10:00Z`,
        end_time: `${dateStr}T08:25:00Z`,
        answers: abAnswers,
        score: abScore,
        latitude: -23.550520 + (Math.random() - 0.5) * 0.0008,
        longitude: -46.633308 + (Math.random() - 0.5) * 0.0008,
        status: 'Finalizado',
        _nc: pendingNC,
        _plan: pendingPlan
      });

      // Fechamento
      const fcUser = usersList.find(u => u.role === 'Supervisor de Turno' || u.role === 'Garçom') || usersList[1];
      const isFcConform = Math.random() > 0.04;
      const fcScore = isFcConform ? 100 : Math.round(75 + Math.random() * 20);
      const fcAnswers = {
        'fc_1': { value: 'sim', comment: '' },
        'fc_2': { value: 'sim', comment: 'Todas organizadas no suporte' },
        'fc_3': { value: 'sim', comment: '' },
        'fc_4': { value: true }
      };

      let pendingFcNC = null;
      let pendingFcPlan = null;

      if (!isFcConform) {
        fcAnswers['fc_3'] = { value: 'nao', comment: 'Ar condicionado do salão lateral foi deixado no modo automático.' };
        pendingFcNC = {
          item_id: 'fc_3',
          item_label: 'Ar condicionados, luzes e som ambiente desligados?',
          description: 'Evidenciado aparelho de ar condicionado central esquerdo ligado desnecessariamente após fechamento.',
          reported_by: fcUser.name,
          status: 'Resolvido',
          timestamp: `${dateStr}T23:50:00Z`
        };
        pendingFcPlan = {
          description: 'Desligar disjuntor geral da ala norte ou incluir aviso luminoso na saída.',
          responsible: 'Gustavo Santos',
          due_date: new Date(currentDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'Concluído',
          completed_at: new Date(currentDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: 'Placa de lembrete adicionada ao lado do interruptor geral de fechamento.'
        };
      }

      checklistExecutionsToInsert.push({
        model_id: 'mod_pizzaria_2',
        model_name: 'FECHAMENTO DO SALÃO E BAR',
        user: fcUser.name,
        start_time: `${dateStr}T23:35:00Z`,
        end_time: `${dateStr}T23:55:00Z`,
        answers: fcAnswers,
        score: fcScore,
        latitude: -23.550520 + (Math.random() - 0.5) * 0.0008,
        longitude: -46.633308 + (Math.random() - 0.5) * 0.0008,
        status: 'Finalizado',
        _nc: pendingFcNC,
        _plan: pendingFcPlan
      });

      // Recebimento periódico (a cada 3 dias)
      if (offset % 3 === 0) {
        const recUser = usersList.find(u => u.role === 'Estoquista' || u.role === 'Comprador') || usersList[2];
        checklistExecutionsToInsert.push({
          model_id: 'mod_pizzaria_3',
          model_name: 'RECEBIMENTO DE INSUMOS (WMS)',
          user: recUser.name,
          start_time: `${dateStr}T14:15:00Z`,
          end_time: `${dateStr}T14:40:00Z`,
          answers: {
            'rc_1': { value: 'sim', comment: 'Baú refrigerado em 3.9°C' },
            'rc_2': { value: 'sim', comment: 'Validades até novembro de 2026' },
            'rc_3': { value: true }
          },
          score: 100,
          latitude: -23.550520 + (Math.random() - 0.5) * 0.0008,
          longitude: -46.633308 + (Math.random() - 0.5) * 0.0008,
          status: 'Finalizado'
        });
      }

      // SIMULAÇÃO DE MOVIMENTAÇÃO DE ESTOQUE DIÁRIA
      let baseSales = 20; // segunda a quarta
      if (dow === 4) baseSales = 35; // quinta
      if (dow === 5 || dow === 6) baseSales = 85; // sexta e sábado
      if (dow === 0) baseSales = 75; // domingo

      const randomFactor = 0.8 + Math.random() * 0.4;
      let salesQty = Math.round(baseSales * randomFactor);

      const month = currentDate.getMonth();
      if (month === 11 || month === 0 || month === 6) {
        salesQty = Math.round(salesQty * 1.25);
      }
      
      if (offset === 45) salesQty = Math.round(salesQty * 3.5);
      if (offset === 150) salesQty = Math.round(salesQty * 3.0);

      const dayUsage = {};
      for (let s = 0; s < salesQty; s++) {
        const rand = Math.random();
        let code = 'PIZ-001';
        if (rand < 0.25) code = 'PIZ-001';
        else if (rand < 0.45) code = 'PIZ-002';
        else if (rand < 0.60) code = 'PIZ-003';
        else if (rand < 0.70) code = 'PIZ-004';
        else if (rand < 0.80) code = 'PIZ-005';
        else if (rand < 0.90) code = 'PIZ-006';
        else if (rand < 0.95) code = 'PIZ-007';
        else code = 'PIZ-008';

        const item = saleProducts.find(x => x.code === code);
        if (item && item.recipe) {
          item.recipe.forEach(rec => {
            dayUsage[rec.ingredientSku] = (dayUsage[rec.ingredientSku] || 0) + rec.quantity;
          });
        }
      }

      const drinkQty = Math.round(salesQty * 1.3);
      for (let s = 0; s < drinkQty; s++) {
        const rand = Math.random();
        let code = 'BEB-001';
        if (rand < 0.35) code = 'BEB-001';
        else if (rand < 0.65) code = 'BEB-002';
        else if (rand < 0.85) code = 'BEB-003';
        else code = 'BEB-004';

        const item = saleProducts.find(x => x.code === code);
        if (item && item.recipe) {
          item.recipe.forEach(rec => {
            dayUsage[rec.ingredientSku] = (dayUsage[rec.ingredientSku] || 0) + rec.quantity;
          });
        }
      }

      const operatorsList = usersList.filter(u => u.role === 'Pizzaiolo' || u.role === 'Estoquista' || u.role === 'Cozinha' || u.role === 'Auxiliar');
      const cozinheiros = operatorsList.length ? operatorsList : usersList;
      
      Object.entries(dayUsage).forEach(([sku, total]) => {
        const prodName = productMap[sku] || sku;
        const op = cozinheiros[Math.floor(Math.random() * cozinheiros.length)];
        
        stockMovementsToInsert.push({
          sku: sku,
          productName: prodName,
          type: 'Saída',
          quantity: parseFloat(total.toFixed(3)),
          userName: op.name,
          date: dateStr,
          time: '22:30:00',
          timestamp: `${dateStr}T22:30:00Z`,
          details: 'Baixa de estoque por consumo operacional de vendas (receitas de pizza)'
        });
      });

      if (offset % 3 === 0) {
        const estoquistas = usersList.filter(u => u.role === 'Estoquista' || u.role === 'Supervisor de Turno');
        const op = estoquistas.length ? estoquistas[Math.floor(Math.random() * estoquistas.length)] : usersList[0];
        
        const randomSkus = [];
        const allSkus = Object.keys(productMap);
        while (randomSkus.length < 3 && allSkus.length > 0) {
          const idx = Math.floor(Math.random() * allSkus.length);
          const sku = allSkus[idx];
          if (!randomSkus.includes(sku)) {
            randomSkus.push(sku);
          }
        }
        
        randomSkus.forEach(sku => {
          const prodName = productMap[sku];
          const qty = Math.round(20 + Math.random() * 50);
          stockMovementsToInsert.push({
            sku: sku,
            productName: prodName,
            type: 'Entrada',
            quantity: qty,
            userName: op.name,
            date: dateStr,
            time: '10:15:00',
            timestamp: `${dateStr}T10:15:00Z`,
            details: `Recebimento de lote de compras de insumo. Operador: ${op.name}`
          });
        });
      }

      if (offset % 15 === 0) {
        const supervisores = usersList.filter(u => u.role === 'Supervisor de Turno' || u.role === 'Gerente');
        const op = supervisores.length ? supervisores[Math.floor(Math.random() * supervisores.length)] : usersList[0];
        
        const allSkus = Object.keys(productMap);
        if (allSkus.length > 0) {
          const sku = allSkus[Math.floor(Math.random() * allSkus.length)];
          const prodName = productMap[sku];
          const qty = parseFloat((1 + Math.random() * 5).toFixed(2));
          const reasons = [
            'Produto vencido na câmara fria',
            'Embalagem danificada no transporte',
            'Problema de refrigeração',
            'Insumo impróprio para consumo (avaria física)'
          ];
          const reason = reasons[Math.floor(Math.random() * reasons.length)];
          stockMovementsToInsert.push({
            sku: sku,
            productName: prodName,
            type: 'Perda',
            quantity: qty,
            userName: op.name,
            date: dateStr,
            time: '16:45:00',
            timestamp: `${dateStr}T16:45:00Z`,
            details: `${reason}. Registrado por supervisor.`
          });
        }
      }
    }

    console.log(`Inserindo ${checklistExecutionsToInsert.length} execuções de checklist de forma sequencial com integridade relacional...`);
    for (const exec of checklistExecutionsToInsert) {
      const { _nc, _plan, ...execData } = exec;
      
      const insertExecQuery = `
        INSERT INTO checklist_executions (model_id, model_name, "user", start_time, end_time, answers, score, latitude, longitude, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id;
      `;
      
      const execRes = await client.query(insertExecQuery, [
        execData.model_id,
        execData.model_name,
        execData.user,
        execData.start_time,
        execData.end_time,
        JSON.stringify(execData.answers),
        execData.score,
        execData.latitude,
        execData.longitude,
        execData.status
      ]);
      
      const generatedExecId = execRes.rows[0].id;

      if (_nc) {
        const insertNCQuery = `
          INSERT INTO checklist_non_conformities (checklist_execution_id, item_id, item_label, description, reported_by, status, timestamp)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id;
        `;
        const ncRes = await client.query(insertNCQuery, [
          generatedExecId,
          _nc.item_id,
          _nc.item_label,
          _nc.description,
          _nc.reported_by,
          _nc.status,
          _nc.timestamp
        ]);
        
        const generatedNCId = ncRes.rows[0].id;

        if (_plan) {
          const insertPlanQuery = `
            INSERT INTO checklist_action_plans (non_conformity_id, description, responsible, due_date, status, completed_at, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7);
          `;
          await client.query(insertPlanQuery, [
            generatedNCId,
            _plan.description,
            _plan.responsible,
            _plan.due_date,
            _plan.status,
            _plan.completed_at,
            _plan.notes
          ]);
        }
      }
    }
    console.log('Execuções, Não Conformidades e Planos de Ação históricos inseridos com sucesso!');

    console.log(`Inserindo ${stockMovementsToInsert.length} movimentações de estoque em lote...`);
    await bulkInsert(client, 'stock_movements', stockMovementsToInsert);
    console.log('Movimentações de estoque semeadas com sucesso!');

    console.log('\n--- 6. RECONFIGURANDO SEQUÊNCIAS DO BANCO DE DADOS (setval) ---');
    const tablesWithSerials = [
      { table: 'app_users', idCol: 'id' },
      { table: 'sectors', idCol: 'id' },
      { table: 'areas', idCol: 'id' },
      { table: 'categories', idCol: 'id' },
      { table: 'sale_product_categories', idCol: 'id' },
      { table: 'suppliers', idCol: 'id' },
      { table: 'stock_batches', idCol: 'id' },
      { table: 'wms_warehouses', idCol: 'id' },
      { table: 'wms_zones', idCol: 'id' },
      { table: 'wms_locations', idCol: 'id' },
      { table: 'patrimonio_categories', idCol: 'id' },
      { table: 'patrimonio_items', idCol: 'id' },
      { table: 'patrimonio_movements', idCol: 'id' },
      { table: 'checklist_executions', idCol: 'id' },
      { table: 'checklist_non_conformities', idCol: 'id' },
      { table: 'checklist_action_plans', idCol: 'id' },
      { table: 'notifications', idCol: 'id' },
      { table: 'stock_movements', idCol: 'id' }
    ];

    for (const item of tablesWithSerials) {
      try {
        const seqRes = await client.query(`
          SELECT pg_get_serial_sequence('${item.table}', '${item.idCol}') as seq;
        `);
        const seqName = seqRes.rows[0]?.seq;
        if (seqName) {
          await client.query(`
            SELECT setval('${seqName}', COALESCE((SELECT MAX(${item.idCol}) FROM ${item.table}), 1));
          `);
        }
      } catch (err) {
        console.warn(`[Warning] Não foi possível resetar sequência para a tabela ${item.table}:`, err.message);
      }
    }
    console.log('Sequências de auto-incremento sincronizadas.');

    console.log('\n--- SEEDING COMPLETADO COM SUCESSO! ---');

  } catch (error) {
    console.error('\n[Fatal Error] Ocorreu um erro durante o seeding do Supabase:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Conexão encerrada.');
  }
}

// Helper generic bulk insert
async function bulkInsert(client, table, data) {
  if (!data || data.length === 0) return;

  const jsonbKeys = [
    'permissions', 'contato', 'endereco', 'financeiro', 'logistica', 
    'ratings', 'block_info', 'recipe', 
    'items', 'answers', 'divergences', 'read_by', 'value'
  ];
  
  const formattedData = data.map(item => {
    const newItem = {};
    for (const key of Object.keys(item)) {
      if (table === 'patrimonio_items' && key === 'valueTotal') {
        continue;
      }
      
      let snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      
      if (key === 'desc' || key === 'description') {
        snakeKey = 'description';
      }
      if (key === 'sectorId') snakeKey = 'sector_id';
      if (key === 'userIds') snakeKey = 'user_ids';
      if (key === 'itemSku') snakeKey = 'item_sku';
      if (key === 'manufacturingDate') snakeKey = 'manufacturing_date';
      if (key === 'expirationDate') snakeKey = 'expiration_date';
      if (key === 'warehouseId') snakeKey = 'warehouse_id';
      if (key === 'acronymDescription') snakeKey = 'acronym_description';
      if (key === 'tempMin') snakeKey = 'temp_min';
      if (key === 'tempMax') snakeKey = 'temp_max';
      if (key === 'isAmbient') snakeKey = 'is_ambient';
      if (key === 'ambientType') snakeKey = 'ambient_type';
      if (key === 'volumeCubicoPadrao') snakeKey = 'volume_cubico_padrao';
      if (key === 'zoneId') snakeKey = 'zone_id';
      if (key === 'volumeCubico') snakeKey = 'volume_cubico';
      if (key === 'qtyActual') snakeKey = 'qty_actual';
      if (key === 'qtyMin') snakeKey = 'qty_min';
      if (key === 'valueUnit') snakeKey = 'value_unit';
      if (key === 'sectorActual') snakeKey = 'sector_actual';
      if (key === 'acquisitionDate') snakeKey = 'acquisition_date';
      if (key === 'productName') snakeKey = 'product_name';
      if (key === 'userName') snakeKey = 'user_name';
      
      newItem[snakeKey] = item[key];
    }
    return newItem;
  });

  const columns = Object.keys(formattedData[0]);
  const batchSize = 100;
  
  for (let i = 0; i < formattedData.length; i += batchSize) {
    const batch = formattedData.slice(i, i + batchSize);
    
    const valuePlaceholders = [];
    const values = [];
    let paramIndex = 1;
    
    for (const row of batch) {
      const rowPlaceholders = [];
      for (const col of columns) {
        let val = row[col];
        if (val && typeof val === 'object' && !(val instanceof Date)) {
          if (jsonbKeys.includes(col)) {
            val = JSON.stringify(val);
          } else if (Array.isArray(val)) {
            if (val.length === 0) {
              val = '{}';
            } else {
              const escapedElements = val.map(item => {
                if (typeof item === 'object') {
                  const str = JSON.stringify(item);
                  return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
                } else {
                  const str = String(item);
                  return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
                }
              });
              val = '{' + escapedElements.join(',') + '}';
            }
          } else {
            val = JSON.stringify(val);
          }
        }
        values.push(val);
        rowPlaceholders.push(`$${paramIndex++}`);
      }
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    }
    
    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${valuePlaceholders.join(', ')}
    `;
    
    await client.query(query, values);
  }
}

runSeed();
