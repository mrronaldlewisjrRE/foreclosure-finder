const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const tablesRes = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    console.log(`Dumping database tables (${tablesRes.rows.length} total)...`);
    for (const row of tablesRes.rows) {
      const tbl = row.table_name;
      const countRes = await pool.query(`SELECT COUNT(*) as cnt FROM "${tbl}"`);
      const cnt = countRes.rows[0].cnt;
      console.log(`\nTable "${tbl}": ${cnt} rows`);
      if (cnt > 0) {
        const dataRes = await pool.query(`SELECT * FROM "${tbl}" LIMIT 3`);
        console.log(JSON.stringify(dataRes.rows, null, 2));
      }
    }
  } catch (err) {
    console.error('Error dumping database:', err.message);
  } finally {
    await pool.end();
  }
}
run();
