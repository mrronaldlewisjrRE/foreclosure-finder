const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log('Connected to DB to seed a test lead.');

    const check = await client.query('SELECT COUNT(*) FROM foreclosure_leads');
    if (parseInt(check.rows[0].count) > 0) {
      console.log('Database already has leads. No need to seed mock lead.');
      return;
    }

    const leadId = 'ab8c10fa-1234-5678-90ab-cdef12345678';
    
    // Check if county exists
    const countyCheck = await client.query('SELECT county_code FROM counties WHERE county_code = $1', ['TN_DAVIDSON']);
    if (countyCheck.rows.length === 0) {
      await client.query(`INSERT INTO counties (county_code, county_name, state, is_active, data_quality_score)
        VALUES ('TN_DAVIDSON', 'Davidson County', 'TN', TRUE, 95)`);
    }

    // Insert lead
    await client.query(`
      INSERT INTO foreclosure_leads (
        id, county_code, case_number, filing_date, filing_type, owner_name, parcel_number, loan_amount,
        property_street, property_city, property_state, property_zip, raw_payload, hash_signature, claim_status
      ) VALUES (
        $1, 'TN_DAVIDSON', '2026-CH-1234', '2026-06-01', 'TAX_DELINQUENCY', 'John Doe', '123-45-678', 150000.00,
        '123 Main St', 'Nashville', 'TN', '37203', '{}', 'test_hash_signature_12345', 'Available'
      ) ON CONFLICT (hash_signature) DO NOTHING
    `, [leadId]);

    // Insert enrichment
    await client.query(`
      INSERT INTO property_enrichments (
        lead_id, estimated_value, first_mortgage_amount, total_liens, estimated_equity, equity_percentage,
        ownership_length_years, is_absentee_owned, is_vacant, occupancy_probability, property_type
      ) VALUES (
        $1, 350000.00, 150000.00, 10000.00, 190000.00, 54.29, 7.5, FALSE, FALSE, 95, 'Single Family Residential'
      ) ON CONFLICT (lead_id) DO NOTHING
    `, [leadId]);

    // Insert lead_scores
    await client.query(`
      INSERT INTO lead_scores (
        lead_id, equity_score, distress_score, tenure_score, total_score, lead_tier
      ) VALUES (
        $1, 85, 75, 60, 78, 'A'
      ) ON CONFLICT (lead_id) DO NOTHING
    `, [leadId]);

    console.log('Test lead successfully seeded!');
  } catch (err) {
    console.error('Error seeding test lead:', err);
  } finally {
    await client.end();
  }
}

main();
