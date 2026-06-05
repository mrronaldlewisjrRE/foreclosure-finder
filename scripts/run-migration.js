const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

async function runMigration() {
  console.log('=== RUNNING DATABASE MIGRATION SCRIPT ===');
  const client = new Client({ connectionString: databaseUrl });
  
  try {
    await client.connect();
    console.log('[Migration] Connected to PostgreSQL.');

    const sqlPath = path.join(__dirname, 'migration-phase2-evolution.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration SQL file not found at: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('[Migration] Executing DDL script...');
    await client.query(sql);
    console.log('[Migration] Migration DDL executed successfully!');

  } catch (err) {
    console.error('❌ [Migration] Fatal migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('=== MIGRATION COMPLETED ===');
  }
}

runMigration();
