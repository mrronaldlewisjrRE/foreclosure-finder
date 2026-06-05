const { Pool } = require('pg');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const mockCounties = [
  { code: 'TN_DAVIDSON', name: 'Davidson County', state: 'TN', score: 96 },
  { code: 'FL_MIAMIDADE', name: 'Miami-Dade County', state: 'FL', score: 97 },
  { code: 'TX_HARRIS', name: 'Harris County', state: 'TX', score: 97 },
  { code: 'CA_LOSANGELES', name: 'Los Angeles County', state: 'CA', score: 99 },
  { code: 'GA_FULTON', name: 'Fulton County', state: 'GA', score: 96 },
  { code: 'IL_COOK', name: 'Cook County', state: 'IL', score: 98 },
  { code: 'AZ_MARICOPA', name: 'Maricopa County', state: 'AZ', score: 98 }
];

const mockLeadsData = [
  // Davidson County, TN (Nashville)
  {
    county_code: 'TN_DAVIDSON',
    case_number: '2026-CH-8839',
    filing_type: 'NOTICE_OF_DEFAULT',
    owner_name: 'William & Janet Henderson',
    parcel_number: '093-11-0-234.00',
    loan_amount: 245000.00,
    trustee_name: 'Rubin Lublin TN PLLC',
    plaintiff_attorney: 'Brock & Scott, PLLC',
    property_street: '1405 Ordway Place',
    property_city: 'Nashville',
    property_state: 'TN',
    property_zip: '37206',
    estimated_value: 485000.00,
    first_mortgage_amount: 245000.00,
    total_liens: 12500.00,
    is_absentee_owned: false,
    is_vacant: false,
    property_type: 'Single Family Residential',
    beds: 3,
    baths: 2,
    square_footage: 1850,
    assessor_year_built: 1945,
    opportunity_score: 87,
    tier: 'A',
    latitude: 36.1795,
    longitude: -86.7351
  },
  {
    county_code: 'TN_DAVIDSON',
    case_number: '2026-PB-1102',
    filing_type: 'PROBATE',
    owner_name: 'Estate of Eleanor Vance',
    parcel_number: '104-03-0-112.00',
    loan_amount: 0.00,
    trustee_name: '',
    plaintiff_attorney: 'Law Office of John R. Campbell',
    property_street: '3604 Richland Ave',
    property_city: 'Nashville',
    property_state: 'TN',
    property_zip: '37205',
    estimated_value: 750000.00,
    first_mortgage_amount: 0.00,
    total_liens: 0.00,
    is_absentee_owned: true,
    is_vacant: true,
    property_type: 'Single Family Residential',
    beds: 4,
    baths: 2.5,
    square_footage: 2600,
    assessor_year_built: 1928,
    opportunity_score: 95,
    tier: 'A_PLUS',
    latitude: 36.1308,
    longitude: -86.8322
  },
  {
    county_code: 'TN_DAVIDSON',
    case_number: '2026-TX-0453',
    filing_type: 'TAX_DELINQUENCY',
    owner_name: 'Thomas Miller',
    parcel_number: '081-15-0-044.00',
    loan_amount: 85000.00,
    trustee_name: 'Davidson County Clerk',
    plaintiff_attorney: 'Metropolitan Legal Dept',
    property_street: '1802 10th Ave N',
    property_city: 'Nashville',
    property_state: 'TN',
    property_zip: '37208',
    estimated_value: 395000.00,
    first_mortgage_amount: 85000.00,
    total_liens: 18450.00,
    is_absentee_owned: true,
    is_vacant: false,
    property_type: 'Single Family Residential',
    beds: 2,
    baths: 1,
    square_footage: 1100,
    assessor_year_built: 1930,
    opportunity_score: 89,
    tier: 'A',
    latitude: 36.1751,
    longitude: -86.8012
  },
  // Miami-Dade County, FL (Miami)
  {
    county_code: 'FL_MIAMIDADE',
    case_number: '2026-CA-011242',
    filing_type: 'LIS_PENDENS',
    owner_name: 'Roberto & Maria Gomez',
    parcel_number: '01-4109-006-1180',
    loan_amount: 320000.00,
    trustee_name: 'Miami-Dade Civil Division',
    plaintiff_attorney: 'Albertelli Law',
    property_street: '2840 SW 22nd Terrace',
    property_city: 'Miami',
    property_state: 'FL',
    property_zip: '33145',
    estimated_value: 620000.00,
    first_mortgage_amount: 320000.00,
    total_liens: 5200.00,
    is_absentee_owned: false,
    is_vacant: false,
    property_type: 'Single Family Residential',
    beds: 3,
    baths: 2,
    square_footage: 1650,
    assessor_year_built: 1952,
    opportunity_score: 84,
    tier: 'B',
    latitude: 25.7505,
    longitude: -80.2415
  },
  {
    county_code: 'FL_MIAMIDADE',
    case_number: '2026-PB-00941',
    filing_type: 'PROBATE',
    owner_name: 'Estate of Beatrice Sterling',
    parcel_number: '02-3136-009-0410',
    loan_amount: 110000.00,
    trustee_name: '',
    plaintiff_attorney: 'Sterling & Associates PA',
    property_street: '550 NE 55th St',
    property_city: 'Miami',
    property_state: 'FL',
    property_zip: '33137',
    estimated_value: 840000.00,
    first_mortgage_amount: 110000.00,
    total_liens: 0.00,
    is_absentee_owned: true,
    is_vacant: true,
    property_type: 'Single Family Residential',
    beds: 4,
    baths: 3,
    square_footage: 2400,
    assessor_year_built: 1938,
    opportunity_score: 93,
    tier: 'A_PLUS',
    latitude: 25.8258,
    longitude: -80.1865
  },
  {
    county_code: 'FL_MIAMIDADE',
    case_number: '2026-TX-1094',
    filing_type: 'TAX_DELINQUENCY',
    owner_name: 'Vantage Properties LLC',
    parcel_number: '30-3115-024-0090',
    loan_amount: 0.00,
    trustee_name: 'Tax Collector Division',
    plaintiff_attorney: 'County Attorney Office',
    property_street: '9420 NW 22nd Ave',
    property_city: 'Miami',
    property_state: 'FL',
    property_zip: '33147',
    estimated_value: 290000.00,
    first_mortgage_amount: 0.00,
    total_liens: 24500.00,
    is_absentee_owned: true,
    is_vacant: true,
    property_type: 'Duplex',
    beds: 4,
    baths: 2,
    square_footage: 2100,
    assessor_year_built: 1974,
    opportunity_score: 92,
    tier: 'A',
    latitude: 25.8601,
    longitude: -80.2341
  },
  // Harris County, TX (Houston)
  {
    county_code: 'TX_HARRIS',
    case_number: '2026-44102',
    filing_type: 'TRUSTEE_SALE',
    owner_name: 'Kevin & Brenda Washington',
    parcel_number: '118-243-002-0012',
    loan_amount: 195000.00,
    trustee_name: 'Robert Lamont, Substitute Trustee',
    plaintiff_attorney: 'Hughes, Watters & Askanase',
    property_street: '4318 Kashmere St',
    property_city: 'Houston',
    property_state: 'TX',
    property_zip: '77026',
    estimated_value: 265000.00,
    first_mortgage_amount: 195000.00,
    total_liens: 4800.00,
    is_absentee_owned: false,
    is_vacant: false,
    property_type: 'Single Family Residential',
    beds: 3,
    baths: 1.5,
    square_footage: 1420,
    assessor_year_built: 1955,
    opportunity_score: 79,
    tier: 'C',
    latitude: 29.8052,
    longitude: -95.3289
  },
  {
    county_code: 'TX_HARRIS',
    case_number: '2026-55092',
    filing_type: 'NOTICE_OF_DEFAULT',
    owner_name: 'Derrick Powell',
    parcel_number: '045-121-004-0018',
    loan_amount: 135000.00,
    trustee_name: 'Harris County Sheriff',
    plaintiff_attorney: 'Barrett Daffin Frappier Turner & Engel',
    property_street: '7911 Tierwester St',
    property_city: 'Houston',
    property_state: 'TX',
    property_zip: '77021',
    estimated_value: 320000.00,
    first_mortgage_amount: 135000.00,
    total_liens: 9100.00,
    is_absentee_owned: true,
    is_vacant: false,
    property_type: 'Single Family Residential',
    beds: 3,
    baths: 2,
    square_footage: 1750,
    assessor_year_built: 1968,
    opportunity_score: 86,
    tier: 'A',
    latitude: 29.6912,
    longitude: -95.3654
  },
  {
    county_code: 'TX_HARRIS',
    case_number: '2026-PB-1194',
    filing_type: 'PROBATE',
    owner_name: 'Estate of Henry W. Long',
    parcel_number: '083-092-005-0014',
    loan_amount: 45000.00,
    trustee_name: '',
    plaintiff_attorney: 'Houston Probate Law Group',
    property_street: '1214 Harvard St',
    property_city: 'Houston',
    property_state: 'TX',
    property_zip: '77008',
    estimated_value: 580000.00,
    first_mortgage_amount: 45000.00,
    total_liens: 0.00,
    is_absentee_owned: true,
    is_vacant: true,
    property_type: 'Single Family Residential',
    beds: 2,
    baths: 1,
    square_footage: 1300,
    assessor_year_built: 1920,
    opportunity_score: 94,
    tier: 'A_PLUS',
    latitude: 29.7924,
    longitude: -95.3982
  },
  // Los Angeles County, CA
  {
    county_code: 'CA_LOSANGELES',
    case_number: '26STCP00431',
    filing_type: 'NOTICE_OF_DEFAULT',
    owner_name: 'Arthur & Evelyn Pendelton',
    parcel_number: '5045-021-019',
    loan_amount: 620000.00,
    trustee_name: 'Quality Loan Service Corp',
    plaintiff_attorney: 'McCarthy & Holthus LLP',
    property_street: '1542 W 37th Place',
    property_city: 'Los Angeles',
    property_state: 'CA',
    property_zip: '90018',
    estimated_value: 950000.00,
    first_mortgage_amount: 620000.00,
    total_liens: 18000.00,
    is_absentee_owned: false,
    is_vacant: false,
    property_type: 'Single Family Residential',
    beds: 3,
    baths: 2,
    square_footage: 1540,
    assessor_year_built: 1912,
    opportunity_score: 83,
    tier: 'B',
    latitude: 34.0205,
    longitude: -118.3045
  },
  {
    county_code: 'CA_LOSANGELES',
    case_number: '26STPB01124',
    filing_type: 'PROBATE',
    owner_name: 'Estate of Miriam Hopkins',
    parcel_number: '4335-012-004',
    loan_amount: 0.00,
    trustee_name: '',
    plaintiff_attorney: 'Beverly Hills Probate Law',
    property_street: '1240 S Beverly Glen Blvd',
    property_city: 'Los Angeles',
    property_state: 'CA',
    property_zip: '90024',
    estimated_value: 1650000.00,
    first_mortgage_amount: 0.00,
    total_liens: 15400.00,
    is_absentee_owned: true,
    is_vacant: true,
    property_type: 'Condo',
    beds: 2,
    baths: 2.5,
    square_footage: 1800,
    assessor_year_built: 1980,
    opportunity_score: 96,
    tier: 'A_PLUS',
    latitude: 34.0589,
    longitude: -118.4231
  },
  {
    county_code: 'CA_LOSANGELES',
    case_number: '26STCV00214',
    filing_type: 'SHERIFF_SALE',
    owner_name: 'Julius Vance',
    parcel_number: '6012-008-011',
    loan_amount: 410000.00,
    trustee_name: 'LA County Sheriff Civil Div',
    plaintiff_attorney: 'Zieve, Brodnax & Steele LLP',
    property_street: '8314 S Broadway',
    property_city: 'Los Angeles',
    property_state: 'CA',
    property_zip: '90003',
    estimated_value: 580000.00,
    first_mortgage_amount: 410000.00,
    total_liens: 32000.00,
    is_absentee_owned: true,
    is_vacant: false,
    property_type: 'Multi-Family',
    beds: 4,
    baths: 3,
    square_footage: 2200,
    assessor_year_built: 1924,
    opportunity_score: 81,
    tier: 'B',
    latitude: 33.9622,
    longitude: -118.2782
  },
  // Fulton County, GA (Atlanta)
  {
    county_code: 'GA_FULTON',
    case_number: '2026-CV-4421',
    filing_type: 'TRUSTEE_SALE',
    owner_name: 'Shirley Thompson',
    parcel_number: '14-0083-0002-044-8',
    loan_amount: 145000.00,
    trustee_name: 'McCurdy & Candler LLC',
    plaintiff_attorney: 'Pendergast & Associates',
    property_street: '915 Cascade Ave SW',
    property_city: 'Atlanta',
    property_state: 'GA',
    property_zip: '30311',
    estimated_value: 340000.00,
    first_mortgage_amount: 145000.00,
    total_liens: 8400.00,
    is_absentee_owned: false,
    is_vacant: false,
    property_type: 'Single Family Residential',
    beds: 3,
    baths: 2,
    square_footage: 1580,
    assessor_year_built: 1948,
    opportunity_score: 88,
    tier: 'A',
    latitude: 33.7289,
    longitude: -84.4421
  },
  {
    county_code: 'GA_FULTON',
    case_number: '2026-PB-0839',
    filing_type: 'PROBATE',
    owner_name: 'Estate of Lamar Willis',
    parcel_number: '14-0044-0008-012-0',
    loan_amount: 35000.00,
    trustee_name: '',
    plaintiff_attorney: 'Willis Estate Attorneys LLC',
    property_street: '624 Boulevard NE',
    property_city: 'Atlanta',
    property_state: 'GA',
    property_zip: '30308',
    estimated_value: 510000.00,
    first_mortgage_amount: 35000.00,
    total_liens: 0.00,
    is_absentee_owned: true,
    is_vacant: true,
    property_type: 'Single Family Residential',
    beds: 3,
    baths: 1.5,
    square_footage: 1650,
    assessor_year_built: 1925,
    opportunity_score: 93,
    tier: 'A_PLUS',
    latitude: 33.7719,
    longitude: -84.3688
  },
  {
    county_code: 'GA_FULTON',
    case_number: '2026-CV-00938',
    filing_type: 'VACANT_PROPERTY',
    owner_name: 'Legacy Wealth Builders LLC',
    parcel_number: '14-0112-0004-098-1',
    loan_amount: 0.00,
    trustee_name: '',
    plaintiff_attorney: '',
    property_street: '883 Joseph E Lowery Blvd NW',
    property_city: 'Atlanta',
    property_state: 'GA',
    property_zip: '30318',
    estimated_value: 280000.00,
    first_mortgage_amount: 0.00,
    total_liens: 14500.00,
    is_absentee_owned: true,
    is_vacant: true,
    property_type: 'Single Family Residential',
    beds: 2,
    baths: 1,
    square_footage: 1050,
    assessor_year_built: 1940,
    opportunity_score: 90,
    tier: 'A',
    latitude: 33.7788,
    longitude: -84.4172
  },
  // Cook County, IL (Chicago)
  {
    county_code: 'IL_COOK',
    case_number: '2026-CH-00189',
    filing_type: 'LIS_PENDENS',
    owner_name: 'Demetrius & Alice Jackson',
    parcel_number: '16-15-204-023-0000',
    loan_amount: 180000.00,
    trustee_name: 'Cook County Chancery Div',
    plaintiff_attorney: 'Codilis & Associates, P.C.',
    property_street: '4922 W Ferdinand St',
    property_city: 'Chicago',
    property_state: 'IL',
    property_zip: '60644',
    estimated_value: 240000.00,
    first_mortgage_amount: 180000.00,
    total_liens: 6400.00,
    is_absentee_owned: false,
    is_vacant: false,
    property_type: 'Two Flat',
    beds: 4,
    baths: 2,
    square_footage: 2100,
    assessor_year_built: 1910,
    opportunity_score: 75,
    tier: 'C',
    latitude: 41.8885,
    longitude: -87.7485
  },
  {
    county_code: 'IL_COOK',
    case_number: '2026-CH-01140',
    filing_type: 'SHERIFF_SALE',
    owner_name: 'Yvonne Sterling',
    parcel_number: '20-14-118-009-0000',
    loan_amount: 95000.00,
    trustee_name: 'Cook County Sheriff Auction',
    plaintiff_attorney: 'Anselmo Lindberg & Associates',
    property_street: '6524 S Woodlawn Ave',
    property_city: 'Chicago',
    property_state: 'IL',
    property_zip: '60637',
    estimated_value: 380000.00,
    first_mortgage_amount: 95000.00,
    total_liens: 12100.00,
    is_absentee_owned: true,
    is_vacant: true,
    property_type: 'Single Family Residential',
    beds: 3,
    baths: 2,
    square_footage: 1850,
    assessor_year_built: 1898,
    opportunity_score: 91,
    tier: 'A',
    latitude: 41.7761,
    longitude: -87.5968
  },
  {
    county_code: 'IL_COOK',
    case_number: '2026-PB-1849',
    filing_type: 'PROBATE',
    owner_name: 'Estate of Richard Henderson',
    parcel_number: '14-32-409-012-0000',
    loan_amount: 0.00,
    trustee_name: '',
    plaintiff_attorney: 'Law Offices of Mary M. O\'Connor',
    property_street: '2240 N Bosworth Ave',
    property_city: 'Chicago',
    property_state: 'IL',
    property_zip: '60614',
    estimated_value: 980000.00,
    first_mortgage_amount: 0.00,
    total_liens: 0.00,
    is_absentee_owned: true,
    is_vacant: false,
    property_type: 'Three Flat',
    beds: 6,
    baths: 3.5,
    square_footage: 3200,
    assessor_year_built: 1888,
    opportunity_score: 97,
    tier: 'A_PLUS',
    latitude: 41.9228,
    longitude: -87.6659
  }
];

async function seed() {
  console.log('=== SEEDING DISTRESSED LEADS AND ENRICHMENTS ===');
  const client = await pool.connect();
  
  try {
    // 1. Seed Counties if missing
    console.log('[Seeder] Ensuring counties are registered...');
    for (const c of mockCounties) {
      await client.query(
        `INSERT INTO counties (county_code, county_name, state, is_active, data_quality_score)
         VALUES ($1, $2, $3, TRUE, $4) ON CONFLICT (county_code) DO NOTHING;`,
        [c.code, c.name, c.state, c.score]
      );
    }
    console.log('[Seeder] Counties ensuring done.');

    // 2. Seed Mock Admin User (Primary SUPER_ADMIN) if missing
    console.log('[Seeder] Ensuring SUPER_ADMIN user exists...');
    const adminId = '90bc410a-4fb4-81d3-92f7-f98212abcdef';
    await client.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_active, api_key)
       VALUES ($1, $2, $3, $4, 'SUPER_ADMIN', TRUE, $5) ON CONFLICT (email) DO NOTHING;`,
      [
        adminId,
        'mrronaldlewisjr@gmail.com',
        '$2b$12$securepasswordhashplaceholderhere',
        'Ronald Lewis Jr',
        'super-secret-mcp-scraper-key-token-rotation'
      ]
    );

    // 3. Clear existing leads to avoid duplication issues during seeding
    console.log('[Seeder] Cleaning up existing leads and enrichments...');
    await client.query('DELETE FROM lead_scores');
    await client.query('DELETE FROM property_enrichments');
    await client.query('DELETE FROM foreclosure_leads');
    console.log('[Seeder] Existing leads cleared.');

    // 4. Insert leads and sub-tables
    console.log(`[Seeder] Seeding ${mockLeadsData.length} premium distressed leads...`);
    
    for (const l of mockLeadsData) {
      const leadId = crypto.randomUUID();
      const hash_sig = crypto.createHash('sha256').update(`${l.county_code}-${l.case_number}-${l.property_street}`).digest('hex');
      const filingDate = new Date();
      filingDate.setDate(filingDate.getDate() - Math.floor(Math.random() * 20)); // random date in last 20 days

      // Insert core lead
      await client.query(`
        INSERT INTO foreclosure_leads (
          id, county_code, case_number, filing_date, filing_type, owner_name, parcel_number, loan_amount,
          trustee_name, plaintiff_attorney, property_street, property_city, property_state, property_zip,
          latitude, longitude, raw_payload, hash_signature, claim_status, verification_status, verified_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'Available', 'VERIFIED', CURRENT_TIMESTAMP
        )
      `, [
        leadId, l.county_code, l.case_number, filingDate, l.filing_type, l.owner_name, l.parcel_number, l.loan_amount,
        l.trustee_name, l.plaintiff_attorney, l.property_street, l.property_city, l.property_state, l.property_zip,
        l.latitude, l.longitude, JSON.stringify({ source: 'automation_seed', original_record: l }), hash_sig
      ]);

      // Calculate equity metrics
      const estValue = l.estimated_value;
      const mortgage = l.first_mortgage_amount;
      const liens = l.total_liens;
      const equity = estValue - mortgage - liens;
      const equityPct = estValue > 0 ? (equity / estValue) * 100 : 0.00;
      const ownershipLength = parseFloat((Math.random() * 15 + 2).toFixed(1)); // 2 to 17 years

      // Insert property enrichment
      await client.query(`
        INSERT INTO property_enrichments (
          lead_id, estimated_value, first_mortgage_amount, total_liens, estimated_equity, equity_percentage,
          ownership_length_years, is_absentee_owned, is_vacant, occupancy_probability, property_type,
          assessor_year_built, beds, baths, square_footage
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
      `, [
        leadId, estValue, mortgage, liens, equity, equityPct, ownershipLength, l.is_absentee_owned,
        l.is_vacant, l.is_vacant ? 0 : 95, l.property_type, l.assessor_year_built, l.beds, l.baths, l.square_footage
      ]);

      // Insert lead scores
      const equityScore = Math.min(100, Math.max(10, Math.floor(equityPct)));
      const distressScore = l.filing_type === 'PROBATE' ? 65 : (l.is_vacant ? 95 : 80);
      const tenureScore = Math.min(100, Math.max(20, Math.floor(ownershipLength * 6.5)));
      const taxScore = l.filing_type === 'TAX_DELINQUENCY' ? 95 : 0;
      const vacancyScore = l.is_vacant ? 95 : 0;
      const totalScore = l.opportunity_score;

      await client.query(`
        INSERT INTO lead_scores (
          lead_id, equity_score, distress_score, tenure_score, tax_score, vacancy_score, opportunity_score, tier
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        )
      `, [
        leadId, equityScore, distressScore, tenureScore, taxScore, vacancyScore, totalScore, l.tier
      ]);

      // Generate related contact info (phone/email/relative) for premium experience
      // Phone
      await client.query(`
        INSERT INTO phones (lead_id, phone_number, phone_type, is_verified, confidence_score)
        VALUES ($1, $2, 'Wireless', TRUE, $3)
      `, [
        leadId,
        `(${Math.floor(Math.random() * 800 + 200)}) ${Math.floor(Math.random() * 800 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        Math.floor(Math.random() * 30 + 70)
      ]);

      // Email
      if (l.owner_name) {
        const parts = l.owner_name.toLowerCase().replace(/[^a-z ]/g, '').split(' ');
        const emailAddr = parts.length >= 2 ? `${parts[0]}.${parts[parts.length-1]}@gmail.com` : 'info@propertyowner.net';
        await client.query(`
          INSERT INTO emails (lead_id, email_address, is_verified, confidence_score)
          VALUES ($1, $2, TRUE, $3)
        `, [
          leadId,
          emailAddr,
          Math.floor(Math.random() * 30 + 70)
        ]);
      }
    }

    console.log(`[Seeder] Seeded ${mockLeadsData.length} records successfully!`);

  } catch (err) {
    console.error('❌ Seeding distressed leads failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    console.log('=== SEEDER PIPELINE COMPLETED SUCCESSFULLY ===');
  }
}

seed();
