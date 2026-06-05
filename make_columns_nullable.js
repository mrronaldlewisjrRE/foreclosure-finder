const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('Altering foreclosure_leads columns to drop NOT NULL constraints...');
    await pool.query(`
      ALTER TABLE foreclosure_leads ALTER COLUMN property_street DROP NOT NULL;
      ALTER TABLE foreclosure_leads ALTER COLUMN property_city DROP NOT NULL;
      ALTER TABLE foreclosure_leads ALTER COLUMN property_state DROP NOT NULL;
    `);
    console.log('✅ Success: Columns are now nullable.');
  } catch (err) {
    console.error('❌ Error altering columns:', err.message);
  } finally {
    await pool.end();
  }
}

run();
