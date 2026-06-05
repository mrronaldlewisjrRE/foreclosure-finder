const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

async function runMigration() {
  console.log('=== RUNNING DATABASE MIGRATION SCRIPT FOR PHASE 3 ===');
  const client = new Client({ connectionString: databaseUrl });
  
  try {
    await client.connect();
    console.log('[Migration] Connected to PostgreSQL.');

    const sqlPath = path.join(__dirname, 'migration-phase3-expansion.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration SQL file not found at: ${sqlPath}`);
    }

    const sqlFile = fs.readFileSync(sqlPath, 'utf8');
    
    // Split statements, keeping comments clean
    const statements = sqlFile
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`\n--- STATEMENT ${i + 1}/${statements.length} ---`);
      console.log(stmt);
      try {
        await client.query(stmt);
        console.log('>> SUCCESS');
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log(`>> IGNORED: ${err.message}`);
        } else {
          console.error(`>> FAILED: ${err.message}`);
          throw err;
        }
      }
    }
    console.log('[Migration] Migration SQL statements executed successfully!');

  } catch (err) {
    console.error('❌ [Migration] Fatal migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('=== MIGRATION COMPLETED ===');
  }
}

runMigration();
