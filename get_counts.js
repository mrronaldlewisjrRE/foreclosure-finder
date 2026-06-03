const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { seedPlatform } = require('./scripts/seed-platform');
const { runWorker } = require('./services/scrapers/worker');
const { fastify, pool: dbPool } = require('./services/api-gateway/server');
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

async function main() {
  console.log('=== POPULATING DATABASE AND QUERYING COUNTS ===');
  
  // 1. Seed
  await seedPlatform();
  
  // 2. Start Fastify Server on port 4004
  process.env.PORT = 4004;
  await fastify.listen({ port: 4004, host: '0.0.0.0' });
  console.log('[GetCounts] API Gateway online on port 4004.');

  // 3. Run Ingestion Worker
  await runWorker();
  
  // 4. Query Counts
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const totalLeads = await pool.query('SELECT COUNT(*) FROM foreclosure_leads');
    console.log(`TOTAL foreclosure_leads: ${totalLeads.rows[0].count}`);

    const verifiedDistress = await pool.query('SELECT COUNT(*) FROM verified_distress_records');
    console.log(`VERIFIED distress records: ${verifiedDistress.rows[0].count}`);

    const types = await pool.query('SELECT filing_type, COUNT(*) FROM foreclosure_leads GROUP BY filing_type ORDER BY filing_type ASC');
    console.log('\n--- Filing Types Breakdown ---');
    types.rows.forEach(r => {
      console.log(`${r.filing_type}: ${r.count}`);
    });
  } catch (err) {
    console.error('Error querying:', err);
  } finally {
    await pool.end();
    await fastify.close();
    await dbPool.end();
  }
}

main().catch(console.error);
