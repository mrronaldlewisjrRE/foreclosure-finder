const { Pool } = require('pg');
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

async function main() {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    // 1. Lead Freshness Report (all foreclosure_leads)
    console.log('=== 1. LEAD FRESHNESS REPORT (ALL LEADS) ===');
    const freshnessRes = await pool.query(`
      SELECT 
        COUNT(CASE WHEN filing_date >= CURRENT_DATE - 7 THEN 1 END) as "0_7_days",
        COUNT(CASE WHEN filing_date < CURRENT_DATE - 7 AND filing_date >= CURRENT_DATE - 30 THEN 1 END) as "8_30_days",
        COUNT(CASE WHEN filing_date < CURRENT_DATE - 30 AND filing_date >= CURRENT_DATE - 90 THEN 1 END) as "31_90_days",
        COUNT(CASE WHEN filing_date < CURRENT_DATE - 90 THEN 1 END) as "90_plus_days"
      FROM foreclosure_leads
    `);
    console.log(`0-7 days: ${freshnessRes.rows[0]['0_7_days']}`);
    console.log(`8-30 days: ${freshnessRes.rows[0]['8_30_days']}`);
    console.log(`31-90 days: ${freshnessRes.rows[0]['31_90_days']}`);
    console.log(`90+ days: ${freshnessRes.rows[0]['90_plus_days']}`);

    // 3. For every county: total source records, total imported records, and cap info
    console.log('\n=== 3. COUNTY METRICS (SOURCE vs IMPORTED) ===');
    const countyMetricsRes = await pool.query(`
      SELECT 
        c.county_code, 
        COUNT(DISTINCT l.id) as total_imported,
        COUNT(DISTINCT v.id) as total_source
      FROM counties c
      LEFT JOIN foreclosure_leads l ON c.county_code = l.county_code
      LEFT JOIN verified_distress_records v ON l.id = v.lead_id
      WHERE c.is_active = TRUE
      GROUP BY c.county_code
      ORDER BY total_imported DESC, c.county_code ASC
    `);
    
    countyMetricsRes.rows.forEach(r => {
      let capInfo = 'No Cap (Custom Scraper)';
      if (r.county_code !== 'TN_DAVIDSON' && r.county_code !== 'LA_ORLEANS' && r.county_code !== 'TN_SHELBY' && r.county_code !== 'TN_HAMILTON' && r.county_code !== 'TN_KNOX' && r.county_code !== 'TN_RUTHERFORD' && r.county_code !== 'TN_WILLIAMSON' && r.county_code !== 'TN_WILSON' && r.county_code !== 'TX_FORTBEND' && r.county_code !== 'LA_JEFFERSON' && r.county_code !== 'GA_FULTON' && r.county_code !== 'FL_HILLSBOROUGH') {
        capInfo = 'Cap: 50 (ATTOM API Pagesize)';
      } else if (r.county_code === 'TX_FORTBEND' || r.county_code === 'LA_JEFFERSON') {
        capInfo = 'Cap: 50 (ATTOM API Pagesize)';
      }
      console.log(`${r.county_code} | Source Records: ${r.total_source} | Imported Leads: ${r.total_imported} | ${capInfo}`);
    });

    // 4. Performance Metrics
    console.log('\n=== 4. PERFORMANCE & CONFLICT METRICS ===');
    
    // Newly discovered leads per day
    const leadsPerDay = await pool.query(`
      SELECT created_at::date as date, COUNT(*) as count 
      FROM foreclosure_leads 
      GROUP BY created_at::date 
      ORDER BY date DESC
    `);
    console.log('Newly discovered leads per day:');
    leadsPerDay.rows.forEach(r => {
      console.log(`  ${r.date.toISOString().split('T')[0]}: ${r.count}`);
    });

    // Duplicate suppression rate calculation
    const uniqueLeads = parseInt(freshnessRes.rows[0]['0_7_days'], 10) + 
                       parseInt(freshnessRes.rows[0]['8_30_days'], 10) + 
                       parseInt(freshnessRes.rows[0]['31_90_days'], 10) + 
                       parseInt(freshnessRes.rows[0]['90_plus_days'], 10);
    const totalDistress = await pool.query('SELECT COUNT(*) FROM verified_distress_records');
    const totalDistressCount = parseInt(totalDistress.rows[0].count, 10);
    const suppressionRate = totalDistressCount > 0 
      ? ((1 - (uniqueLeads / totalDistressCount)) * 100).toFixed(2)
      : '0.00';
    console.log(`Duplicate suppression rate: ${suppressionRate}%`);

    // Average provenance score
    const avgProv = await pool.query('SELECT AVG(provenance_score) as avg FROM verified_distress_records');
    console.log(`Average provenance score: ${parseFloat(avgProv.rows[0].avg || 0).toFixed(2)}`);

    // Average evidence completeness (source_confidence_score)
    const avgConf = await pool.query('SELECT AVG(source_confidence_score) as avg FROM verified_distress_records');
    console.log(`Average evidence completeness score: ${parseFloat(avgConf.rows[0].avg || 0).toFixed(2)}`);

    // 5. For the 1,022 verified leads: Breakdown
    console.log('\n=== 5. VERIFIED LEADS (1,022) BREAKDOWN ===');

    console.log('\n--- By Filing Type ---');
    const vFiling = await pool.query(`
      SELECT filing_type, COUNT(*) 
      FROM foreclosure_leads 
      WHERE verification_status = 'VERIFIED' 
      GROUP BY filing_type 
      ORDER BY count DESC
    `);
    vFiling.rows.forEach(r => console.log(`  ${r.filing_type}: ${r.count}`));

    console.log('\n--- By County ---');
    const vCounty = await pool.query(`
      SELECT county_code, COUNT(*) 
      FROM foreclosure_leads 
      WHERE verification_status = 'VERIFIED' 
      GROUP BY county_code 
      ORDER BY count DESC
    `);
    vCounty.rows.forEach(r => console.log(`  ${r.county_code}: ${r.count}`));

    console.log('\n--- By State ---');
    const vState = await pool.query(`
      SELECT property_state, COUNT(*) 
      FROM foreclosure_leads 
      WHERE verification_status = 'VERIFIED' 
      GROUP BY property_state 
      ORDER BY count DESC
    `);
    vState.rows.forEach(r => console.log(`  ${r.property_state}: ${r.count}`));

    console.log('\n--- By Age ---');
    const vAge = await pool.query(`
      SELECT 
        COUNT(CASE WHEN filing_date >= CURRENT_DATE - 7 THEN 1 END) as "0_7_days",
        COUNT(CASE WHEN filing_date < CURRENT_DATE - 7 AND filing_date >= CURRENT_DATE - 30 THEN 1 END) as "8_30_days",
        COUNT(CASE WHEN filing_date < CURRENT_DATE - 30 AND filing_date >= CURRENT_DATE - 90 THEN 1 END) as "31_90_days",
        COUNT(CASE WHEN filing_date < CURRENT_DATE - 90 THEN 1 END) as "90_plus_days"
      FROM foreclosure_leads
      WHERE verification_status = 'VERIFIED'
    `);
    console.log(`  0-7 days: ${vAge.rows[0]['0_7_days']}`);
    console.log(`  8-30 days: ${vAge.rows[0]['8_30_days']}`);
    console.log(`  31-90 days: ${vAge.rows[0]['31_90_days']}`);
    console.log(`  90+ days: ${vAge.rows[0]['90_plus_days']}`);

  } catch (err) {
    console.error('Error during inventory audit:', err);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
