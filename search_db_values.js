const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('Fetching all tables and columns...');
    const columnsRes = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND data_type IN ('character varying', 'text', 'character')
    `);

    console.log(`Searching through ${columnsRes.rows.length} text columns...`);
    for (const col of columnsRes.rows) {
      const { table_name, column_name } = col;
      
      // Query non-null, non-empty values
      const query = `
        SELECT "${column_name}" 
        FROM "${table_name}" 
        WHERE "${column_name}" IS NOT NULL 
          AND "${column_name}" != ''
        LIMIT 10
      `;
      try {
        const dataRes = await pool.query(query);
        if (dataRes.rows.length > 0) {
          for (const row of dataRes.rows) {
            const val = row[column_name];
            // Check if value looks like a key or contains 'attom' or 'key'
            if (val.toLowerCase().includes('attom') || val.toLowerCase().includes('key') || val.length === 32 || val.length === 40) {
              console.log(`[FOUND MATCH] Table: ${table_name}, Column: ${column_name}`);
              console.log(`Value: "${val}"`);
            }
          }
        }
      } catch (err) {
        // Skip errors (e.g. system tables or view issues)
      }
    }
    console.log('Search completed.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
