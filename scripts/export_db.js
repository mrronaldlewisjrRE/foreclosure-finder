/**
 * Export ForeclosureFinder AI Database Schema + Data
 * Connects to local PostgreSQL, dumps full schema DDL and all table data as SQL INSERTs.
 * Output: scripts/schema_export.sql  +  scripts/data_export.sql
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
const pool = new Pool({ connectionString: DATABASE_URL, max: 5 });

const SCHEMA_OUT = path.join(__dirname, 'schema_export.sql');
const DATA_OUT = path.join(__dirname, 'data_export.sql');

async function run() {
  const client = await pool.connect();
  try {
    console.log('Connected to local PostgreSQL:', DATABASE_URL.replace(/:[^:@]+@/, ':***@'));

    // ── 1. Discover all user tables ──────────────────────
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`\nFound ${tables.length} tables:`, tables.join(', '));

    // ── 2. Export schema DDL ─────────────────────────────
    let schemaSql = '-- ForeclosureFinder AI Schema Export\n';
    schemaSql += `-- Exported at: ${new Date().toISOString()}\n`;
    schemaSql += '-- Source: ' + DATABASE_URL.replace(/:[^:@]+@/, ':***@') + '\n\n';
    schemaSql += 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n\n';

    for (const table of tables) {
      // Get columns
      const colsRes = await client.query(`
        SELECT column_name, data_type, udt_name, is_nullable, column_default,
               character_maximum_length, numeric_precision, numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      schemaSql += `-- ═══════════════════════════════════════\n`;
      schemaSql += `-- Table: ${table}\n`;
      schemaSql += `-- ═══════════════════════════════════════\n`;
      schemaSql += `CREATE TABLE IF NOT EXISTS "${table}" (\n`;

      const colDefs = colsRes.rows.map(col => {
        let type = col.data_type;
        if (col.data_type === 'USER-DEFINED') type = col.udt_name;
        if (col.data_type === 'character varying') type = col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'VARCHAR';
        if (col.data_type === 'numeric') type = col.numeric_precision ? `NUMERIC(${col.numeric_precision},${col.numeric_scale || 0})` : 'NUMERIC';
        if (col.data_type === 'integer') type = 'INTEGER';
        if (col.data_type === 'bigint') type = 'BIGINT';
        if (col.data_type === 'smallint') type = 'SMALLINT';
        if (col.data_type === 'boolean') type = 'BOOLEAN';
        if (col.data_type === 'text') type = 'TEXT';
        if (col.data_type === 'double precision') type = 'DOUBLE PRECISION';
        if (col.data_type === 'real') type = 'REAL';
        if (col.data_type === 'timestamp with time zone') type = 'TIMESTAMPTZ';
        if (col.data_type === 'timestamp without time zone') type = 'TIMESTAMP';
        if (col.data_type === 'date') type = 'DATE';
        if (col.data_type === 'jsonb') type = 'JSONB';
        if (col.data_type === 'json') type = 'JSON';
        if (col.data_type === 'ARRAY') type = col.udt_name.replace(/^_/, '') + '[]';

        let def = `  "${col.column_name}" ${type}`;
        if (col.column_default) def += ` DEFAULT ${col.column_default}`;
        if (col.is_nullable === 'NO') def += ' NOT NULL';
        return def;
      });

      schemaSql += colDefs.join(',\n');
      schemaSql += '\n);\n\n';
    }

    // Get indexes
    const idxRes = await client.query(`
      SELECT indexdef FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    if (idxRes.rows.length > 0) {
      schemaSql += '-- ═══════════════════════════════════════\n';
      schemaSql += '-- Indexes\n';
      schemaSql += '-- ═══════════════════════════════════════\n';
      for (const idx of idxRes.rows) {
        // Wrap in IF NOT EXISTS pattern
        schemaSql += idx.indexdef.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS').replace('CREATE UNIQUE INDEX', 'CREATE UNIQUE INDEX IF NOT EXISTS') + ';\n';
      }
      schemaSql += '\n';
    }

    fs.writeFileSync(SCHEMA_OUT, schemaSql);
    console.log(`\n✅ Schema exported to: ${SCHEMA_OUT} (${(schemaSql.length / 1024).toFixed(1)} KB)`);

    // ── 3. Export data ───────────────────────────────────
    let dataSql = '-- ForeclosureFinder AI Data Export\n';
    dataSql += `-- Exported at: ${new Date().toISOString()}\n\n`;

    let totalRows = 0;
    for (const table of tables) {
      const countRes = await client.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
      const count = parseInt(countRes.rows[0].cnt);
      console.log(`  ${table}: ${count} rows`);

      if (count === 0) continue;

      dataSql += `-- ═══ ${table} (${count} rows) ═══\n`;

      // Fetch all rows
      const dataRes = await client.query(`SELECT * FROM "${table}"`);
      const cols = dataRes.fields.map(f => `"${f.name}"`).join(', ');

      for (const row of dataRes.rows) {
        const vals = dataRes.fields.map(f => {
          const v = row[f.name];
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
          if (typeof v === 'number') return String(v);
          if (v instanceof Date) return `'${v.toISOString()}'`;
          if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
          return `'${String(v).replace(/'/g, "''")}'`;
        });
        dataSql += `INSERT INTO "${table}" (${cols}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING;\n`;
      }
      dataSql += '\n';
      totalRows += count;
    }

    fs.writeFileSync(DATA_OUT, dataSql);
    console.log(`\n✅ Data exported to: ${DATA_OUT} (${(dataSql.length / 1024 / 1024).toFixed(2)} MB, ${totalRows} total rows)`);

    // ── 4. Summary ───────────────────────────────────────
    console.log('\n════════════════════════════════════════');
    console.log('EXPORT COMPLETE');
    console.log(`  Tables: ${tables.length}`);
    console.log(`  Total rows: ${totalRows}`);
    console.log(`  Schema file: ${SCHEMA_OUT}`);
    console.log(`  Data file: ${DATA_OUT}`);
    console.log('════════════════════════════════════════\n');

  } catch (err) {
    console.error('Export failed:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
