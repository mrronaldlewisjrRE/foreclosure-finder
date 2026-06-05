const { Pool } = require('pg');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const allCounties = [
  // TENNESSEE
  { code: 'TN_DAVIDSON', name: 'Davidson County', state: 'TN', city: 'Nashville', lat: 36.1627, lng: -86.7816 },
  { code: 'TN_RUTHERFORD', name: 'Rutherford County', state: 'TN', city: 'Murfreesboro', lat: 35.8456, lng: -86.3903 },
  { code: 'TN_WILLIAMSON', name: 'Williamson County', state: 'TN', city: 'Franklin', lat: 35.9251, lng: -86.8689 },
  { code: 'TN_WILSON', name: 'Wilson County', state: 'TN', city: 'Lebanon', lat: 36.2081, lng: -86.2911 },
  { code: 'TN_SHELBY', name: 'Shelby County', state: 'TN', city: 'Memphis', lat: 35.1495, lng: -90.0490 },
  
  // TEXAS
  { code: 'TX_HARRIS', name: 'Harris County', state: 'TX', city: 'Houston', lat: 29.7604, lng: -95.3698 },
  { code: 'TX_FORTBEND', name: 'Fort Bend County', state: 'TX', city: 'Sugar Land', lat: 29.5980, lng: -95.6208 },
  { code: 'TX_MONTGOMERY', name: 'Montgomery County', state: 'TX', city: 'Conroe', lat: 30.3119, lng: -95.4560 },
  { code: 'TX_BRAZORIA', name: 'Brazoria County', state: 'TX', city: 'Angleton', lat: 29.1697, lng: -95.4320 },
  { code: 'TX_DALLAS', name: 'Dallas County', state: 'TX', city: 'Dallas', lat: 32.7767, lng: -96.7970 },
  { code: 'TX_TARRANT', name: 'Tarrant County', state: 'TX', city: 'Fort Worth', lat: 32.7555, lng: -97.3308 },
  
  // LOUISIANA
  { code: 'LA_ORLEANS', name: 'Orleans Parish', state: 'LA', city: 'New Orleans', lat: 29.9511, lng: -90.0715 },
  { code: 'LA_JEFFERSON', name: 'Jefferson Parish', state: 'LA', city: 'Metairie', lat: 30.0023, lng: -90.1529 },
  { code: 'LA_STTAMMANY', name: 'St Tammany Parish', state: 'LA', city: 'Covington', lat: 30.4755, lng: -90.1009 },
  
  // GEORGIA
  { code: 'GA_FULTON', name: 'Fulton County', state: 'GA', city: 'Atlanta', lat: 33.7490, lng: -84.3880 },
  { code: 'GA_COBB', name: 'Cobb County', state: 'GA', city: 'Marietta', lat: 33.9526, lng: -84.5499 },
  { code: 'GA_DEKALB', name: 'DeKalb County', state: 'GA', city: 'Decatur', lat: 33.7748, lng: -84.2963 },
  { code: 'GA_GWINNETT', name: 'Gwinnett County', state: 'GA', city: 'Lawrenceville', lat: 33.9568, lng: -83.9880 },
  
  // FLORIDA
  { code: 'FL_MIAMIDADE', name: 'Miami-Dade County', state: 'FL', city: 'Miami', lat: 25.7617, lng: -80.1918 },
  { code: 'FL_HILLSBOROUGH', name: 'Hillsborough County', state: 'FL', city: 'Tampa', lat: 27.9506, lng: -82.4572 },
  { code: 'FL_PINELLAS', name: 'Pinellas County', state: 'FL', city: 'St. Petersburg', lat: 27.7676, lng: -82.6336 },
  { code: 'FL_PASCO', name: 'Pasco County', state: 'FL', city: 'Dade City', lat: 28.3647, lng: -82.1930 },
  { code: 'FL_ORANGE', name: 'Orange County', state: 'FL', city: 'Orlando', lat: 28.5383, lng: -81.3792 },
  
  // ALABAMA
  { code: 'AL_JEFFERSON', name: 'Jefferson County', state: 'AL', city: 'Birmingham', lat: 33.5186, lng: -86.8104 },
  { code: 'AL_MADISON', name: 'Madison County', state: 'AL', city: 'Huntsville', lat: 34.7304, lng: -86.5861 },
  
  // NORTH CAROLINA
  { code: 'NC_MECKLENBURG', name: 'Mecklenburg County', state: 'NC', city: 'Charlotte', lat: 35.2271, lng: -80.8431 },
  { code: 'NC_WAKE', name: 'Wake County', state: 'NC', city: 'Raleigh', lat: 35.7796, lng: -78.6382 },
  
  // SOUTH CAROLINA
  { code: 'SC_CHARLESTON', name: 'Charleston County', state: 'SC', city: 'Charleston', lat: 32.7765, lng: -79.9311 },
  { code: 'SC_RICHLAND', name: 'Richland County', state: 'SC', city: 'Columbia', lat: 34.0007, lng: -81.0348 },
  
  // OTHER SOUTHERN CENTER METROS
  { code: 'AR_PULASKI', name: 'Pulaski County', state: 'AR', city: 'Little Rock', lat: 34.7465, lng: -92.2896 },
  { code: 'KY_JEFFERSON', name: 'Jefferson County', state: 'KY', city: 'Louisville', lat: 38.2527, lng: -85.7585 }
];

const filingTypes = [
  'NOTICE_OF_DEFAULT',
  'TAX_DELINQUENCY',
  'PROBATE',
  'SHERIFF_SALE',
  'LIS_PENDENS',
  'VACANT_PROPERTY'
];

const streetNames = [
  'Peachtree St', 'Magnolia Ave', 'Dogwood Lane', 'Oak St', 'Pine St', 
  'Maple Dr', 'Elm Court', 'Cedar Ave', 'River Road', 'Broad St', 
  'Dixie Highway', 'Sunset Blvd', 'Jefferson Ave', 'Jackson St', 'Lee Rd'
];

const lastNames = [
  'Smith', 'Davis', 'Jackson', 'Taylor', 'Miller', 'Jones', 'Williams', 
  'Brown', 'Wilson', 'Thomas', 'Carter', 'Harris', 'Martin', 'White',
  'Martinez', 'Hernandez', 'Gonzalez', 'Anderson', 'Thomas', 'Moore'
];

const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 
  'Elizabeth', 'William', 'Linda', 'David', 'Barbara', 'Richard', 'Susan',
  'Charles', 'Jessica', 'Joseph', 'Sarah', 'Thomas', 'Karen'
];

const propertyTypes = [
  'Single Family Residential',
  'Duplex',
  'Townhouse',
  'Multi-Family',
  'Condo'
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  console.log('=== SEEDING ALL EXPANDED COUNTIES AND DISTRESSED LEADS ===');
  const client = await pool.connect();

  try {
    // 1. Ensure all counties exist in registry
    console.log(`[Seeder] Ensuring all ${allCounties.length} Southern counties exist in registry...`);
    for (const c of allCounties) {
      await client.query(
        `INSERT INTO counties (county_code, county_name, state, is_active, data_quality_score)
         VALUES ($1, $2, $3, TRUE, 95) ON CONFLICT (county_code) DO NOTHING;`,
        [c.code, c.name, c.state]
      );
    }
    console.log('[Seeder] Counties ensured.');

    // 2. Clear existing leads to prevent overlaps
    console.log('[Seeder] Cleaning existing leads to build fresh dataset...');
    await client.query('DELETE FROM lead_scores');
    await client.query('DELETE FROM property_enrichments');
    await client.query('DELETE FROM foreclosure_leads');
    console.log('[Seeder] Cleanup complete.');

    // 3. Generate 3 leads per county (93 leads total)
    console.log(`[Seeder] Generating 3 leads per county across ${allCounties.length} counties (93 leads total)...`);
    
    let totalSeeded = 0;
    
    for (const county of allCounties) {
      for (let i = 1; i <= 3; i++) {
        const leadId = crypto.randomUUID();
        
        // Random offsets to scatter coordinates around the county center
        const latOffset = (Math.random() - 0.5) * 0.04;
        const lngOffset = (Math.random() - 0.5) * 0.04;
        const lat = parseFloat((county.lat + latOffset).toFixed(5));
        const lng = parseFloat((county.lng + lngOffset).toFixed(5));
        
        const ownerName = `${getRandomItem(firstNames)} ${getRandomItem(lastNames)}`;
        const street = `${Math.floor(Math.random() * 8800 + 100)} ${getRandomItem(streetNames)}`;
        const filingType = getRandomItem(filingTypes);
        const caseNumber = `2026-${filingType.slice(0, 2)}-${Math.floor(Math.random() * 8800 + 1000)}`;
        const parcelNumber = `${Math.floor(Math.random() * 800 + 100)}-${Math.floor(Math.random() * 80 + 10)}-${Math.floor(Math.random() * 8000 + 1000)}`;
        const zip = `${Math.floor(Math.random() * 80000 + 10000)}`;
        
        const estValue = Math.floor(Math.random() * 400000 + 150000); // $150k - $550k
        const mortgage = filingType === 'PROBATE' ? 0 : Math.floor(estValue * (Math.random() * 0.5 + 0.1)); // 10% - 60% loan to value
        const liens = filingType === 'TAX_DELINQUENCY' ? Math.floor(Math.random() * 25000 + 5000) : Math.floor(Math.random() * 5000);
        
        const hash_sig = crypto.createHash('sha256').update(`${county.code}-${caseNumber}-${street}`).digest('hex');
        const filingDate = new Date();
        filingDate.setDate(filingDate.getDate() - Math.floor(Math.random() * 30));

        // Insert lead
        await client.query(`
          INSERT INTO foreclosure_leads (
            id, county_code, case_number, filing_date, filing_type, owner_name, parcel_number, loan_amount,
            trustee_name, plaintiff_attorney, property_street, property_city, property_state, property_zip,
            latitude, longitude, raw_payload, hash_signature, claim_status, verification_status, verified_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, 'Southern Trustee Services', 'Adams & Associates LLC', 
            $9, $10, $11, $12, $13, $14, $15, $16, 'Available', 'VERIFIED', CURRENT_TIMESTAMP
          )
        `, [
          leadId, county.code, caseNumber, filingDate, filingType, ownerName, parcelNumber, mortgage,
          street, county.city, county.state, zip, lat, lng,
          JSON.stringify({ source: 'expanded_seed', original_record: { lat, lng } }), hash_sig
        ]);

        // Insert enrichment
        const equity = estValue - mortgage - liens;
        const equityPct = estValue > 0 ? (equity / estValue) * 100 : 0;
        const ownership = parseFloat((Math.random() * 12 + 3).toFixed(1));
        const isVacant = filingType === 'VACANT_PROPERTY' || (Math.random() < 0.25);
        
        await client.query(`
          INSERT INTO property_enrichments (
            lead_id, estimated_value, first_mortgage_amount, total_liens, estimated_equity, equity_percentage,
            ownership_length_years, is_absentee_owned, is_vacant, occupancy_probability, property_type,
            assessor_year_built, beds, baths, square_footage
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
          )
        `, [
          leadId, estValue, mortgage, liens, equity, equityPct, ownership, 
          isVacant || Math.random() < 0.4, isVacant, isVacant ? 0 : 95, 
          getRandomItem(propertyTypes), Math.floor(Math.random() * 60 + 1950),
          Math.floor(Math.random() * 3 + 2), Math.floor(Math.random() * 2 + 1), Math.floor(Math.random() * 1200 + 1000)
        ]);

        // Insert lead scores
        const opportunityScore = Math.min(100, Math.max(45, Math.floor(equityPct * 0.7 + (isVacant ? 30 : 0) + (filingType === 'PROBATE' ? 15 : 10))));
        let tier = 'B';
        if (opportunityScore >= 90) tier = 'A_PLUS';
        else if (opportunityScore >= 80) tier = 'A';
        else if (opportunityScore < 60) tier = 'C';

        await client.query(`
          INSERT INTO lead_scores (
            lead_id, equity_score, distress_score, tenure_score, tax_score, vacancy_score, opportunity_score, tier
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8
          )
        `, [
          leadId, 
          Math.min(100, Math.max(10, Math.floor(equityPct))),
          filingType === 'PROBATE' ? 70 : (isVacant ? 95 : 80),
          Math.min(100, Math.max(20, Math.floor(ownership * 7.5))),
          filingType === 'TAX_DELINQUENCY' ? 95 : 0,
          isVacant ? 95 : 0,
          opportunityScore,
          tier
        ]);

        // Insert contacts
        const phone = `(${county.state === 'TN' ? '615' : (county.state === 'FL' ? '305' : (county.state === 'TX' ? '713' : '800'))}) ${Math.floor(Math.random() * 800 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`;
        await client.query(`
          INSERT INTO phones (lead_id, phone_number, phone_type, is_verified, confidence_score)
          VALUES ($1, $2, 'Wireless', TRUE, $3)
        `, [leadId, phone, Math.floor(Math.random() * 30 + 70)]);

        const email = `${ownerName.toLowerCase().replace(/ /g, '.')}@gmail.com`;
        await client.query(`
          INSERT INTO emails (lead_id, email_address, is_verified, confidence_score)
          VALUES ($1, $2, TRUE, $3)
        `, [leadId, email, Math.floor(Math.random() * 30 + 70)]);

        totalSeeded++;
      }
    }

    console.log(`[Seeder] Successfully seeded ${totalSeeded} distressed leads across all ${allCounties.length} expanded counties!`);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    client.release();
    await pool.end();
    console.log('=== SEEDING PIPELINE COMPLETED SUCCESSFULLY ===');
  }
}

seed();
