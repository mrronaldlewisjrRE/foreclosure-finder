/**
 * Import ForeclosureFinder AI Database to Supabase (or any cloud PostgreSQL)
 * Reads schema_export.sql and data_export.sql and executes them against the target database.
 * 
 * Usage: 
 *   Set DATABASE_URL in .env to your Supabase connection string, then run:
 *   node scripts/import_to_supabase.js
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env. Please set your Supabase connection string first.');
  process.exit(1);
}

if (DATABASE_URL.includes('127.0.0.1') || DATABASE_URL.includes('localhost')) {
  console.error('❌ DATABASE_URL still points to localhost. Please update .env with your Supabase connection string.');
  process.exit(1);
}

const SCHEMA_FILE = path.join(__dirname, 'schema_export.sql');
const DATA_FILE = path.join(__dirname, 'data_export.sql');

// Cloud databases require SSL
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false },
});

async function executeSqlFile(client, filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    console.error(`   Run "node scripts/export_db.js" first to generate the export files.`);
    return false;
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = sql
    .split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('--'))
    .join('\n')
    .split(';\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`\n📦 Importing ${label}: ${statements.length} statements from ${path.basename(filePath)}`);

  let success = 0;
  let errors = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await client.query(stmt);
      success++;
      if (i % 500 === 0 && i > 0) {
        process.stdout.write(`  Progress: ${i}/${statements.length} (${Math.round(i/statements.length*100)}%)\r`);
      }
    } catch (err) {
      // Skip non-critical errors (e.g. already exists, duplicate key)
      const msg = err.message || '';
      if (msg.includes('already exists') || msg.includes('duplicate key') || msg.includes('does not exist')) {
        // Silently skip
      } else {
        if (errors < 10) {
          console.error(`  ⚠ Statement ${i+1} error: ${msg.slice(0, 120)}`);
        }
        errors++;
      }
    }
  }

  console.log(`  ✅ ${label}: ${success} successful, ${errors} errors (of ${statements.length} total)`);
  return true;
}

async function run() {
  console.log('═══════════════════════════════════════════');
  console.log('ForeclosureFinder AI → Supabase Import');
  console.log('═══════════════════════════════════════════');
  console.log(`Target: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);

  const client = await pool.connect();
  try {
    // Test connection
    const timeRes = await client.query('SELECT NOW() as now');
    console.log(`✅ Connected to cloud database at ${timeRes.rows[0].now}`);

    // Ensure uuid-ossp extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ uuid-ossp extension enabled');

    // Import schema
    const schemaOk = await executeSqlFile(client, SCHEMA_FILE, 'SCHEMA');
    if (!schemaOk) {
      console.error('\n❌ Schema import failed. Cannot continue.');
      return;
    }

    // Import data
    await executeSqlFile(client, DATA_FILE, 'DATA');

    // Verify import
    console.log('\n═══════════════════════════════════════════');
    console.log('VERIFICATION — Row Counts');
    console.log('═══════════════════════════════════════════');

    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    let totalRows = 0;
    for (const row of tablesRes.rows) {
      try {
        const countRes = await client.query(`SELECT COUNT(*) as cnt FROM "${row.table_name}"`);
        const cnt = parseInt(countRes.rows[0].cnt);
        totalRows += cnt;
        console.log(`  ${row.table_name}: ${cnt} rows`);
      } catch (err) {
        console.log(`  ${row.table_name}: ERROR (${err.message})`);
      }
    }

    console.log(`\n  TOTAL: ${totalRows} rows across ${tablesRes.rows.length} tables`);
    console.log('\n═══════════════════════════════════════════');
    console.log('✅ IMPORT COMPLETE');
    console.log('═══════════════════════════════════════════');
    console.log('\nNext steps:');
    console.log('  1. Start your API: cd services/api-gateway && npm start');
    console.log('  2. Test: curl http://localhost:4000/health');
    console.log('  3. Open: https://frontend-one-roan-93.vercel.app/');

  } catch (err) {
    console.error('Import failed:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
