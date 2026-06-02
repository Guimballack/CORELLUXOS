import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pg = require('pg');
const { Client } = pg;

const client = new Client({
  connectionString: "postgresql://postgres:kqQgRcv9CTbruRA2@db.wjejbsiuqyjwzepbzbwt.supabase.co:5432/postgres",
});

await client.connect();
try {
  const res = await client.query("SELECT sku, name, primary_supplier_id, secondary_supplier_id FROM products LIMIT 5;");
  console.log(JSON.stringify(res.rows, null, 2));
} catch (err) {
  console.error("Error:", err);
} finally {
  await client.end();
}
