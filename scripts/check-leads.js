const { Client } = require('pg');
require('dotenv').config({ path: 'C:/Users/Ronald Lewis Jr/.gemini/antigravity-ide/scratch/foreclosure-finder-ai/.env' });

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query('SELECT owner_name, COUNT(*) FROM foreclosure_leads GROUP BY owner_name HAVING COUNT(*) > 1 ORDER BY COUNT(*) DESC LIMIT 20');
  console.log('Duplicated owner names in DB:', res.rows);
  
  const total = await client.query('SELECT COUNT(*) FROM foreclosure_leads');
  console.log('Total leads:', total.rows[0].count);
  await client.end();
}
check();
