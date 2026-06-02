import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pg = require('pg');
const { Client } = pg;

const client = new Client({
  connectionString: "postgresql://postgres:kqQgRcv9CTbruRA2@db.wjejbsiuqyjwzepbzbwt.supabase.co:5432/postgres",
});

await client.connect();
try {
  console.log("Updating product other_supplier_ids...");
  // Postgres expects array syntax like '{1,2}' or using ARRAY[1,2] for raw SQL,
  // but let's check what value is accepted.
  const query = `
    UPDATE products 
    SET other_supplier_ids = $1, primary_supplier_id = $2, secondary_supplier_id = $3
    WHERE sku = 'PRT-001'
    RETURNING *;
  `;
  // JS arrays are passed as-is to pg client as postgres array type
  const values = [[1, 2], 1, null];
  const res = await client.query(query, values);
  console.log("SUCCESS!");
  console.log(JSON.stringify(res.rows[0], null, 2));
} catch (err) {
  console.error("Error updating product:", err.message || err);
} finally {
  await client.end();
}
