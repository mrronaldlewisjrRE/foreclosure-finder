const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/postgres' });

async function run() {
  const ft = await pool.query("SELECT filing_type, COUNT(*) as cnt FROM foreclosure_leads GROUP BY filing_type ORDER BY cnt DESC");
  console.log('=== FILING TYPE DISTRIBUTION ===');
  ft.rows.forEach(r => console.log(`  ${r.filing_type}: ${r.cnt}`));
  
  const total = await pool.query("SELECT COUNT(*) as total FROM foreclosure_leads");
  console.log(`\nTOTAL LEADS: ${total.rows[0].total}`);
  
  const vs = await pool.query("SELECT verification_status, COUNT(*) as cnt FROM foreclosure_leads GROUP BY verification_status ORDER BY cnt DESC");
  console.log('\n=== VERIFICATION STATUS ===');
  vs.rows.forEach(r => console.log(`  ${r.verification_status}: ${r.cnt}`));
  
  const counties = await pool.query("SELECT county_code, COUNT(*) as cnt FROM foreclosure_leads GROUP BY county_code ORDER BY cnt DESC LIMIT 15");
  console.log('\n=== TOP COUNTIES ===');
  counties.rows.forEach(r => console.log(`  ${r.county_code}: ${r.cnt}`));
  
  await pool.end();
}
run().catch(e => { console.error(e); process.exit(1); });
