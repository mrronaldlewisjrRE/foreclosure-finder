const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query('SELECT * FROM scrapers_log ORDER BY start_time DESC LIMIT 100');
    console.log(`Total logs in DB: ${res.rows.length}`);
    res.rows.forEach(r => {
      console.log(`Time: ${r.start_time} | County: ${r.county_code} | Status: ${r.status} | Discovered: ${r.records_discovered}`);
      if (r.anomalies_detected) {
        console.log(`  Anomaly: ${r.anomalies_detected}`);
      }
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
