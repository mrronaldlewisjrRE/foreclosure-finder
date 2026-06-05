const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const tables = ['project_config', 'account', 'user', 'session'];
    for (const tbl of tables) {
      try {
        const res = await pool.query(`SELECT * FROM neon_auth."${tbl}" LIMIT 10`);
        console.log(`\nTable neon_auth.${tbl}:`);
        console.log(JSON.stringify(res.rows, null, 2));
      } catch (e) {
        console.log(`Error reading ${tbl}:`, e.message);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
