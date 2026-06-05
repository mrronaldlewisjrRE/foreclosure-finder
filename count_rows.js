const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    for (const row of tablesRes.rows) {
      const countRes = await pool.query(`SELECT COUNT(*) FROM "${row.table_name}"`);
      console.log(`Table: ${row.table_name} | Rows: ${countRes.rows[0].count}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
