const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function run() {
  try {
    const now = await pool.query('SELECT NOW() as now');
    console.log('✅ Connected to Neon at:', now.rows[0].now);

    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    if (tables.rows.length > 0) {
      console.log(`Found ${tables.rows.length} tables:`, tables.rows.map(r => r.table_name).join(', '));
    } else {
      console.log('Fresh database — no tables yet. Server migrations will create them.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
