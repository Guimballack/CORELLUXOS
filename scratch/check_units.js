import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pg = require('pg');
const { Client } = pg;

const client = new Client({
  connectionString: "postgresql://postgres:kqQgRcv9CTbruRA2@db.wjejbsiuqyjwzepbzbwt.supabase.co:5432/postgres",
});

await client.connect();
try {
  console.log("=== Unique units in products ===");
  const resProducts = await client.query("SELECT DISTINCT unit FROM products;");
  console.log(resProducts.rows);

  console.log("=== Unique units in stock_batches ===");
  const resBatches = await client.query("SELECT DISTINCT unit FROM stock_batches;");
  console.log(resBatches.rows);

  console.log("=== Unique units in sale_products ===");
  const resSaleProducts = await client.query("SELECT DISTINCT unit FROM sale_products;");
  console.log(resSaleProducts.rows);

  console.log("=== Product recipes (distinct unit field within jsonb array) ===");
  const resProdRecipes = await client.query(`
    SELECT DISTINCT elem->>'unit' as recipe_unit
    FROM products,
    jsonb_array_elements(CASE WHEN jsonb_typeof(recipe) = 'array' THEN recipe ELSE '[]'::jsonb END) elem;
  `);
  console.log(resProdRecipes.rows);

  console.log("=== Sale product recipes (distinct unit field within jsonb array) ===");
  const resSaleRecipes = await client.query(`
    SELECT DISTINCT elem->>'unit' as recipe_unit
    FROM sale_products,
    jsonb_array_elements(CASE WHEN jsonb_typeof(recipe) = 'array' THEN recipe ELSE '[]'::jsonb END) elem;
  `);
  console.log(resSaleRecipes.rows);

} catch (err) {
  console.error("Error:", err);
} finally {
  await client.end();
}
