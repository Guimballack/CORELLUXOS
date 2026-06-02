import pg from 'pg';
import fs from 'fs';

// Parse .env
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const connectionString = env['DATABASE_DIRECT_URL'] || env['DATABASE_URL'];
if (!connectionString) {
  console.error('Error: Connection string not found in .env');
  process.exit(1);
}

const { Client } = pg;
const client = new Client({
  connectionString,
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to database. Running migration...');

    const query = `
      ALTER TABLE products ADD COLUMN IF NOT EXISTS gtin_unidade VARCHAR(50);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS gtin_fardo VARCHAR(50);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS itens_fardo NUMERIC(10,2) DEFAULT 1.00;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS gtin_caixa VARCHAR(50);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS itens_caixa NUMERIC(10,2) DEFAULT 1.00;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS gtin_pallet VARCHAR(50);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS itens_pallet NUMERIC(10,2) DEFAULT 1.00;

      UPDATE products SET 
        gtin_unidade = '7891234567890', 
        gtin_fardo = '7891234567891', 
        itens_fardo = 6.00, 
        gtin_caixa = '7891234567892', 
        itens_caixa = 12.00, 
        gtin_pallet = '7891234567893', 
        itens_pallet = 240.00 
      WHERE sku = 'BEB-001';
    `;

    await client.query(query);
    console.log('Migration complete: columns added successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
