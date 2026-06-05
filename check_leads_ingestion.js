const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('=== LEAD INGESTION MONITOR ===');
    
    // Check total leads count
    const totalLeads = await pool.query('SELECT COUNT(*) FROM foreclosure_leads');
    console.log(`Total Leads Ingested: ${totalLeads.rows[0].count}`);

    // Check leads by state and county
    const leadsByCounty = await pool.query(`
      SELECT county_code, property_state as state, filing_type, COUNT(*) as cnt 
      FROM foreclosure_leads 
      GROUP BY county_code, property_state, filing_type 
      ORDER BY cnt DESC
    `);
    console.log('\nLeads distribution:');
    console.table(leadsByCounty.rows);

    // Check recent scraper logs
    const logs = await pool.query(`
      SELECT county_code, status, start_time, end_time, records_discovered, anomalies_detected 
      FROM scrapers_log 
      ORDER BY start_time DESC 
      LIMIT 20
    `);
    console.log('\nRecent Scraper Logs:');
    console.table(logs.rows.map(r => ({
      county: r.county_code,
      status: r.status,
      time: r.start_time,
      records: r.records_discovered,
      anomalies: r.anomalies_detected ? r.anomalies_detected.substring(0, 80) : 'None'
    })));
  } catch (err) {
    console.error('Error monitoring leads:', err.message);
  } finally {
    await pool.end();
  }
}
run();
