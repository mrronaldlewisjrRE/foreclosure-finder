const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query('SELECT COUNT(*) FROM counties WHERE is_active = TRUE');
    console.log(`Active counties: ${res.rows[0].count}`);
    const activeList = await pool.query('SELECT county_code, county_name, state FROM counties WHERE is_active = TRUE ORDER BY county_code');
    console.log(activeList.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
