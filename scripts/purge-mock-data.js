const { Client } = require('pg');
require('dotenv').config();

async function purge() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('[Purge] Connected to database.');
    
    // Purge mock data tables
    const tablesToPurge = [
      'foreclosure_leads',
      'cash_buyers',
      'county_discovery_registry',
      'heatmap_metrics',
      'investor_feedback',
      'scrapers_log'
    ];
    
    for (const tbl of tablesToPurge) {
      console.log(`[Purge] Truncating table: ${tbl}...`);
      await client.query(`TRUNCATE TABLE ${tbl} CASCADE;`);
    }
    
    console.log('[Purge] Mock data successfully deleted from database.');
  } catch (err) {
    console.error('❌ [Purge] Error cleaning up database:', err.message);
  } finally {
    await client.end();
  }
}

purge();
