import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pg = require('pg');
const { Client } = pg;

const client = new Client({
  connectionString: "postgresql://postgres:kqQgRcv9CTbruRA2@db.wjejbsiuqyjwzepbzbwt.supabase.co:5432/postgres",
});

async function run() {
  await client.connect();
  console.log("Connected to database.");

  try {
    console.log("Creating sale_product_categories table...");
    
    // Check if table already exists
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sale_product_categories'
      );
    `);
    
    const tableExists = checkTable.rows[0].exists;
    
    if (!tableExists) {
      await client.query(`
        CREATE TABLE sale_product_categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          icon VARCHAR(100) DEFAULT 'fa-tag',
          color VARCHAR(100) DEFAULT 'color-pink',
          description TEXT,
          status VARCHAR(50) DEFAULT 'Ativo',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );
      `);
      console.log("Created table sale_product_categories.");
      
      // Enable RLS
      await client.query("ALTER TABLE sale_product_categories ENABLE ROW LEVEL SECURITY;");
      console.log("Enabled RLS on sale_product_categories.");
      
      // Create RLS Policy
      await client.query(`
        CREATE POLICY "anon_all_sale_product_categories"
        ON sale_product_categories
        FOR ALL
        TO anon
        USING (true)
        WITH CHECK (true);
      `);
      console.log("Created RLS policy: anon_all_sale_product_categories");
      
      // Insert initial seed data
      const seeds = [
        { name: 'PIZZAS', icon: 'fa-pizza-slice', color: 'color-pink', description: 'Pizzas salgadas e doces.' },
        { name: 'BEBIDAS', icon: 'fa-wine-bottle', color: 'color-teal', description: 'Refrigerantes, sucos e cervejas.' },
        { name: 'SOBREMESAS', icon: 'fa-ice-cream', color: 'color-purple', description: 'Doces, sorvetes e sobremesas em geral.' }
      ];
      
      for (const s of seeds) {
        await client.query(
          "INSERT INTO sale_product_categories (name, icon, color, description, status) VALUES ($1, $2, $3, $4, 'Ativo') ON CONFLICT (name) DO NOTHING;",
          [s.name, s.icon, s.color, s.description]
        );
      }
      console.log("Inserted seed categories successfully.");
    } else {
      console.log("Table sale_product_categories already exists.");
    }

    console.log("Migration complete!");

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
