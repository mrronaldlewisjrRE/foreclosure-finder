const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

async function executeSqlFile(client, filePath) {
  console.log(`[Seeder] Applying migration: ${path.basename(filePath)}...`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration SQL file not found at: ${filePath}`);
  }
  const sqlFile = fs.readFileSync(filePath, 'utf8');
  
  const statements = sqlFile
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await client.query(stmt);
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        // Ignore duplicate errors
      } else {
        console.error(`>> FAILED: ${err.message} in statement: ${stmt}`);
        throw err;
      }
    }
  }
}

async function seedPlatform() {
  console.log('=== FORECLOSUREFINDER DATABASE SEEDER STARTING ===');

  const client = new Client({ connectionString: databaseUrl });
  
  try {
    await client.connect();
    console.log('[Seeder] Connected to PostgreSQL database.');

    // 1. Tear down existing tables to ensure clean, repeatable run (cascading deletes)
    console.log('[Seeder] Flushing existing tables...');
    const tablesToDrop = [
      'scrapers_log', 'crm_pipelines', 'user_saved_searches',
      'users', 'lead_scores', 'property_enrichments',
      'foreclosure_leads', 'counties',
      'connector_templates', 'county_discovery_registry',
      'seller_personas', 'heatmap_metrics', 'market_trends',
      'ocr_extractions', 'ocr_documents', 'phones',
      'emails', 'relatives', 'expansion_regions',
      'verified_distress_records', 'cash_buyers', 'buyer_transactions',
      'buyer_activity', 'lead_history', 'investor_feedback'
    ];
    for (const tbl of tablesToDrop) {
      await client.query(`DROP TABLE IF EXISTS ${tbl} CASCADE;`);
    }

    // Also drop custom enums if they exist
    const enumsToDrop = ['filing_type_enum', 'lead_tier_enum', 'pipeline_status_enum', 'user_role_enum'];
    for (const en of enumsToDrop) {
      await client.query(`DROP TYPE IF EXISTS ${en} CASCADE;`);
    }

    console.log('[Seeder] Tables flushed. Reading schema definition...');

    // 2. Load DDL Schema file
    const schemaSqlPath = path.join(__dirname, '../docs/database_schema.sql');
    if (!fs.existsSync(schemaSqlPath)) {
      throw new Error(`Schema file not found at: ${schemaSqlPath}`);
    }
    const ddlSchema = fs.readFileSync(schemaSqlPath, 'utf8');

    // 3. Execute DDL statements
    console.log('[Seeder] Applying schema DDL...');
    await client.query(ddlSchema);
    console.log('[Seeder] Schema successfully applied.');

    // 4. Seed Target counties registry (Primary Metropolitan County for all 50 States)
    console.log('[Seeder] Seeding counties registry for all 50 States...');
    const seedCounties = [
      { code: 'AL_JEFFERSON', name: 'Jefferson County', state: 'AL', score: 92 },
      { code: 'AK_ANCHORAGE', name: 'Anchorage Borough', state: 'AK', score: 90 },
      { code: 'AZ_MARICOPA', name: 'Maricopa County', state: 'AZ', score: 98 },
      { code: 'AR_PULASKI', name: 'Pulaski County', state: 'AR', score: 91 },
      { code: 'CA_LOSANGELES', name: 'Los Angeles County', state: 'CA', score: 99 },
      { code: 'CO_DENVER', name: 'Denver County', state: 'CO', score: 96 },
      { code: 'CT_HARTFORD', name: 'Hartford County', state: 'CT', score: 93 },
      { code: 'DE_NEWCASTLE', name: 'New Castle County', state: 'DE', score: 92 },
      { code: 'FL_MIAMIDADE', name: 'Miami-Dade County', state: 'FL', score: 97 },
      { code: 'GA_FULTON', name: 'Fulton County', state: 'GA', score: 96 },
      { code: 'HI_HONOLULU', name: 'Honolulu County', state: 'HI', score: 94 },
      { code: 'ID_ADA', name: 'Ada County', state: 'ID', score: 92 },
      { code: 'IL_COOK', name: 'Cook County', state: 'IL', score: 98 },
      { code: 'IN_MARION', name: 'Marion County', state: 'IN', score: 94 },
      { code: 'IA_POLK', name: 'Polk County', state: 'IA', score: 92 },
      { code: 'KS_SEDGWICK', name: 'Sedgwick County', state: 'KS', score: 91 },
      { code: 'KY_JEFFERSON', name: 'Jefferson County', state: 'KY', score: 92 },
      { code: 'LA_ORLEANS', name: 'Orleans Parish', state: 'LA', score: 93 },
      { code: 'ME_CUMBERLAND', name: 'Cumberland County', state: 'ME', score: 91 },
      { code: 'MD_BALTIMORE', name: 'Baltimore County', state: 'MD', score: 95 },
      { code: 'MA_SUFFOLK', name: 'Suffolk County', state: 'MA', score: 96 },
      { code: 'MI_WAYNE', name: 'Wayne County', state: 'MI', score: 96 },
      { code: 'MN_HENNEPIN', name: 'Hennepin County', state: 'MN', score: 97 },
      { code: 'MS_HINDS', name: 'Hinds County', state: 'MS', score: 90 },
      { code: 'MO_JACKSON', name: 'Jackson County', state: 'MO', score: 94 },
      { code: 'MT_YELLOWSTONE', name: 'Yellowstone County', state: 'MT', score: 90 },
      { code: 'NE_DOUGLAS', name: 'Douglas County', state: 'NE', score: 92 },
      { code: 'NV_CLARK', name: 'Clark County', state: 'NV', score: 97 },
      { code: 'NH_HILLSBOROUGH', name: 'Hillsborough County', state: 'NH', score: 92 },
      { code: 'NJ_ESSEX', name: 'Essex County', state: 'NJ', score: 95 },
      { code: 'NM_BERNALILLO', name: 'Bernalillo County', state: 'NM', score: 92 },
      { code: 'NY_NEWYORK', name: 'New York County', state: 'NY', score: 98 },
      { code: 'NC_MECKLENBURG', name: 'Mecklenburg County', state: 'NC', score: 96 },
      { code: 'ND_CASS', name: 'Cass County', state: 'ND', score: 90 },
      { code: 'OH_CUYAHOGA', name: 'Cuyahoga County', state: 'OH', score: 95 },
      { code: 'OK_OKLAHOMA', name: 'Oklahoma County', state: 'OK', score: 93 },
      { code: 'OR_MULTNOMAH', name: 'Multnomah County', state: 'OR', score: 95 },
      { code: 'PA_PHILADELPHIA', name: 'Philadelphia County', state: 'PA', score: 96 },
      { code: 'RI_PROVIDENCE', name: 'Providence County', state: 'RI', score: 92 },
      { code: 'SC_CHARLESTON', name: 'Charleston County', state: 'SC', score: 93 },
      { code: 'SD_MINNEHAHA', name: 'Minnehaha County', state: 'SD', score: 90 },
      { code: 'TN_DAVIDSON', name: 'Davidson County', state: 'TN', score: 96 },
      { code: 'TX_HARRIS', name: 'Harris County', state: 'TX', score: 97 },
      { code: 'UT_SALTLAKE', name: 'Salt Lake County', state: 'UT', score: 94 },
      { code: 'VT_CHITTENDEN', name: 'Chittenden County', state: 'VT', score: 91 },
      { code: 'VA_FAIRFAX', name: 'Fairfax County', state: 'VA', score: 96 },
      { code: 'WA_KING', name: 'King County', state: 'WA', score: 97 },
      { code: 'WV_KANAWHA', name: 'Kanawha County', state: 'WV', score: 90 },
      { code: 'WI_MILWAUKEE', name: 'Milwaukee County', state: 'WI', score: 94 },
      { code: 'WY_LARAMIE', name: 'Laramie County', state: 'WY', score: 90 }
    ];

    for (const c of seedCounties) {
      await client.query(
        `INSERT INTO counties (county_code, county_name, state, is_active, data_quality_score)
         VALUES ($1, $2, $3, TRUE, $4) ON CONFLICT (county_code) DO NOTHING;`,
        [c.code, c.name, c.state, c.score]
      );
    }
    console.log(`[Seeder] Seeded ${seedCounties.length} active metropolitan counties representing all 50 US States.`);

    // Run migrations
    const migrations = [
      path.join(__dirname, 'migration-phase2-evolution.sql'),
      path.join(__dirname, 'migration-phase3-expansion.sql'),
      path.join(__dirname, 'migration-phase3a-validation.sql'),
      path.join(__dirname, 'migration-phase3b-counties.sql'),
      path.join(__dirname, 'migration-phase4-dedup.sql')
    ];

    for (const migrationFile of migrations) {
      await executeSqlFile(client, migrationFile);
    }
    console.log('[Seeder] All database migration phases successfully executed.');

    // 5. Seed a Mock Admin User (Primary SUPER_ADMIN)
    console.log('[Seeder] Seeding default super admin user...');
    await client.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_active, api_key)
       VALUES ($1, $2, $3, $4, 'SUPER_ADMIN', TRUE, $5) ON CONFLICT (email) DO NOTHING;`,
      [
        '90bc410a-4fb4-81d3-92f7-f98212abcdef', // matches crm user_id in server.js default fallback
        'mrronaldlewisjr@gmail.com',
        '$2b$12$securepasswordhashplaceholderhere',
        'Ronald Lewis Jr',
        'super-secret-mcp-scraper-key-token-rotation'
      ]
    );
    console.log('[Seeder] Default user seeded successfully.');

    console.log('[Seeder] Skipping mock registry and mock heatmap seeding (mock data disabled).');

  } catch (err) {
    console.error('❌ [Seeder] Fatal error during execution:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('=== SEEDER PIPELINE COMPLETED SUCCESSFULLY ===');
  }
}

if (require.main === module) {
  seedPlatform();
}

module.exports = { seedPlatform };
