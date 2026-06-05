const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const schemas = await pool.query('SELECT schema_name FROM information_schema.schemata');
    console.log('Schemas:', schemas.rows.map(r => r.schema_name));
    
    const allTables = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    `);
    console.log('Tables in non-system schemas:');
    console.table(allTables.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
