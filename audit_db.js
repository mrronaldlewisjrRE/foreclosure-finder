require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function audit() {
  try {
    // All counties
    const allCounties = await pool.query('SELECT county_code, county_name, state, is_active FROM counties ORDER BY state, county_name');
    console.log('=== ALL COUNTIES (' + allCounties.rows.length + ') ===');
    let activeCount = 0;
    allCounties.rows.forEach(r => {
      if (r.is_active) activeCount++;
      console.log('  ' + r.state + ' - ' + r.county_name + ' (active: ' + r.is_active + ', code: ' + r.county_code + ')');
    });
    console.log('Active: ' + activeCount + '/' + allCounties.rows.length);

    // Leads by state
    const byState = await pool.query("SELECT property_state, COUNT(*) as cnt FROM foreclosure_leads GROUP BY property_state ORDER BY cnt DESC");
    console.log('\n=== LEADS BY STATE (total: ' + byState.rows.reduce((s,r) => s + parseInt(r.cnt), 0) + ') ===');
    byState.rows.forEach(r => console.log('  ' + r.property_state + ': ' + r.cnt));

    // Leads by county
    const byCounty = await pool.query("SELECT county_code, COUNT(*) as cnt FROM foreclosure_leads GROUP BY county_code ORDER BY cnt DESC");
    console.log('\n=== LEADS BY COUNTY CODE ===');
    byCounty.rows.forEach(r => console.log('  ' + r.county_code + ': ' + r.cnt));

    // Leads by filing type
    const byType = await pool.query("SELECT filing_type, COUNT(*) as cnt FROM foreclosure_leads GROUP BY filing_type ORDER BY cnt DESC");
    console.log('\n=== LEADS BY FILING TYPE ===');
    byType.rows.forEach(r => console.log('  ' + r.filing_type + ': ' + r.cnt));

    // Sample leads
    const sample = await pool.query('SELECT property_street, property_city, property_state, county_code, filing_type, case_number, owner_name FROM foreclosure_leads ORDER BY created_at DESC LIMIT 10');
    console.log('\n=== MOST RECENT 10 LEADS ===');
    sample.rows.forEach(r => console.log('  ' + r.property_street + ', ' + r.property_city + ', ' + r.property_state + ' | ' + r.county_code + ' | ' + r.filing_type + ' | ' + r.owner_name));

    // Check for fake-looking data
    const fakeCheck = await pool.query("SELECT COUNT(*) as cnt FROM foreclosure_leads WHERE property_street LIKE '%Test%' OR property_street LIKE '%Fake%' OR property_street LIKE '%Sample%' OR owner_name LIKE '%Test%' OR case_number LIKE '%TEST%'");
    console.log('\n=== POTENTIALLY FAKE LEADS: ' + fakeCheck.rows[0].cnt + ' ===');

  } finally {
    await pool.end();
  }
}

audit();
