const { Client } = require('pg');
const path = require('path');
const { seedMockCashBuyers } = require('../services/api-gateway/cash-buyer-engine');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;

async function run() {
  console.log('=== SEEDING CASH BUYERS ===');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    // Clear existing cash buyer records to ensure clean slate
    await client.query('DELETE FROM buyer_activity');
    await client.query('DELETE FROM buyer_transactions');
    await client.query('DELETE FROM cash_buyers');
    console.log('[Seeder] Cleared previous cash buyer data.');

    await seedMockCashBuyers(client);
    console.log('[Seeder] Cash buyers seeded successfully!');
  } catch (err) {
    console.error('❌ Seeding cash buyers failed:', err.message);
  } finally {
    await client.end();
    console.log('=== SEEDING PIPELINE ENDED ===');
  }
}

run();
