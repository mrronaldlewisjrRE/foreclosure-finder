const { Pool } = require('pg');
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

async function main() {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    // 1. Total records in database tables
    console.log('=== 1. TOTAL RECORDS IN DATABASE ===');
    const leadsRes = await pool.query('SELECT COUNT(*) FROM foreclosure_leads');
    console.log(`Total leads (foreclosure_leads): ${leadsRes.rows[0].count}`);
    const distressRes = await pool.query('SELECT COUNT(*) FROM verified_distress_records');
    console.log(`Total verified distress records (verified_distress_records): ${distressRes.rows[0].count}`);

    // 2. Total leads with verification_status = 'VERIFIED' or other status
    console.log('\n=== 2. LEADS VERIFICATION STATUS BREAKDOWN ===');
    const statusRes = await pool.query('SELECT verification_status, COUNT(*) FROM foreclosure_leads GROUP BY verification_status ORDER BY count DESC');
    statusRes.rows.forEach(r => {
      console.log(`${r.verification_status}: ${r.count}`);
    });

    // 3. Breakdown of ALL filing types and counts in foreclosure_leads
    console.log('\n=== 3. BREAKDOWN OF ALL FILING TYPES (foreclosure_leads) ===');
    const filingRes = await pool.query('SELECT filing_type, COUNT(*) FROM foreclosure_leads GROUP BY filing_type ORDER BY count DESC');
    filingRes.rows.forEach(r => {
      console.log(`${r.filing_type}: ${r.count}`);
    });

    // 4. Exact SQL query used to calculate verified distress records
    console.log('\n=== 4. EXACT SQL QUERY FOR VERIFIED DISTRESS RECORDS ===');
    console.log('SELECT COUNT(*) FROM verified_distress_records');

    // 5. Verified record counts by county (counties registry state code)
    console.log('\n=== 5. VERIFIED RECORD COUNTS BY COUNTY (foreclosure_leads where status is VERIFIED) ===');
    const countyRes = await pool.query(`
      SELECT county_code, COUNT(*) 
      FROM foreclosure_leads 
      WHERE verification_status = 'VERIFIED' 
      GROUP BY county_code 
      ORDER BY count DESC
    `);
    countyRes.rows.forEach(r => {
      console.log(`${r.county_code}: ${r.count}`);
    });

    // 6. Verified record counts by state
    console.log('\n=== 6. VERIFIED RECORD COUNTS BY STATE ===');
    const stateRes = await pool.query(`
      SELECT property_state, COUNT(*) 
      FROM foreclosure_leads 
      WHERE verification_status = 'VERIFIED' 
      GROUP BY property_state 
      ORDER BY count DESC
    `);
    stateRes.rows.forEach(r => {
      console.log(`${r.property_state}: ${r.count}`);
    });

    // 7. Top 20 counties by verified filing count
    console.log('\n=== 7. TOP 20 COUNTIES BY VERIFIED FILING COUNT ===');
    const top20Res = await pool.query(`
      SELECT county_code, COUNT(*) 
      FROM foreclosure_leads 
      WHERE verification_status = 'VERIFIED' 
      GROUP BY county_code 
      ORDER BY count DESC 
      LIMIT 20
    `);
    top20Res.rows.forEach((r, idx) => {
      console.log(`${idx + 1}. ${r.county_code}: ${r.count}`);
    });

  } catch (err) {
    console.error('Error during reconciliation audit:', err);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
