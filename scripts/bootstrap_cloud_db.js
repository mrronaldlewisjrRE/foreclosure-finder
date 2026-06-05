/**
 * Bootstrap ForeclosureFinder AI Schema on Neon Cloud Database
 * Executes individual CREATE statements in correct dependency order.
 */
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function q(client, sql, label) {
  try {
    await client.query(sql);
    console.log(`  ✅ ${label}`);
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log(`  ⏭  ${label} (already exists)`);
    } else {
      console.error(`  ❌ ${label}: ${err.message.slice(0, 120)}`);
    }
  }
}

async function run() {
  console.log('═══════════════════════════════════════════');
  console.log('ForeclosureFinder AI — Cloud Schema Bootstrap');
  console.log('═══════════════════════════════════════════\n');

  const client = await pool.connect();
  try {
    // ── Extensions ──
    await q(client, 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"', 'uuid-ossp extension');

    // ── Enums ──
    console.log('\n── Enums ──');
    await q(client, `DO $$ BEGIN CREATE TYPE filing_type_enum AS ENUM ('LIS_PENDENS','NOTICE_OF_DEFAULT','TRUSTEE_SALE','TAX_DELINQUENCY','PROBATE','SHERIFF_SALE','VACANT_PROPERTY','CODE_VIOLATION','PROPERTY_LEAD','PROSPECT_PROPERTY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, 'filing_type_enum');
    await q(client, `DO $$ BEGIN CREATE TYPE lead_tier_enum AS ENUM ('A_PLUS','A','B','C'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, 'lead_tier_enum');
    await q(client, `DO $$ BEGIN CREATE TYPE pipeline_status_enum AS ENUM ('NEW','CONTACTED','FOLLOW_UP','NEGOTIATING','CONTRACT','CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, 'pipeline_status_enum');
    await q(client, `DO $$ BEGIN CREATE TYPE user_role_enum AS ENUM ('USER','ADMIN','SUPER_ADMIN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, 'user_role_enum');

    // ── Core Tables (in dependency order) ──
    console.log('\n── Core Tables ──');
    
    await q(client, `CREATE TABLE IF NOT EXISTS counties (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      county_code VARCHAR(20) UNIQUE NOT NULL,
      county_name VARCHAR(100) NOT NULL,
      state VARCHAR(2) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      data_quality_score INT DEFAULT 100,
      last_crawl_timestamp TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`, 'counties');

    await q(client, `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(150),
      role VARCHAR(20) DEFAULT 'USER',
      is_active BOOLEAN DEFAULT TRUE,
      api_key VARCHAR(64) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMPTZ,
      last_login_ip VARCHAR(50),
      subscription_plan VARCHAR(20) DEFAULT 'FREE_TRIAL',
      subscription_started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      subscription_expires_at TIMESTAMPTZ,
      monthly_lead_views INT DEFAULT 0,
      monthly_claims INT DEFAULT 0,
      usage_reset_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      lifetime_access BOOLEAN DEFAULT FALSE,
      is_comped BOOLEAN DEFAULT FALSE
    )`, 'users');

    await q(client, `CREATE TABLE IF NOT EXISTS foreclosure_leads (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      county_code VARCHAR(20) NOT NULL,
      case_number VARCHAR(100),
      filing_date DATE NOT NULL,
      filing_type VARCHAR(50) NOT NULL,
      owner_name VARCHAR(255),
      parcel_number VARCHAR(100),
      loan_amount DECIMAL(15,2),
      trustee_name VARCHAR(255),
      plaintiff_attorney VARCHAR(255),
      auction_date TIMESTAMPTZ,
      property_street VARCHAR(255) NOT NULL,
      property_city VARCHAR(100) NOT NULL,
      property_state VARCHAR(2) NOT NULL,
      property_zip VARCHAR(10),
      mailing_street VARCHAR(255),
      mailing_city VARCHAR(100),
      mailing_state VARCHAR(2),
      mailing_zip VARCHAR(10),
      longitude DECIMAL(9,6),
      latitude DECIMAL(9,6),
      document_url VARCHAR(512),
      raw_payload JSONB DEFAULT '{}',
      hash_signature VARCHAR(64) UNIQUE NOT NULL,
      claim_status VARCHAR(50) DEFAULT 'Available',
      claimed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      claimed_at TIMESTAMPTZ,
      verification_status VARCHAR(50) DEFAULT 'UNVERIFIED',
      verified_at TIMESTAMPTZ,
      validation_status VARCHAR(50),
      validation_errors JSONB,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`, 'foreclosure_leads');

    await q(client, `CREATE TABLE IF NOT EXISTS property_enrichments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL UNIQUE REFERENCES foreclosure_leads(id) ON DELETE CASCADE,
      estimated_value DECIMAL(15,2),
      first_mortgage_amount DECIMAL(15,2),
      total_liens DECIMAL(15,2) DEFAULT 0.00,
      estimated_equity DECIMAL(15,2),
      equity_percentage DECIMAL(5,2),
      ownership_length_years DECIMAL(4,1),
      is_absentee_owned BOOLEAN DEFAULT FALSE,
      is_vacant BOOLEAN DEFAULT FALSE,
      occupancy_probability INT DEFAULT 100,
      property_type VARCHAR(100),
      assessor_year_built INT,
      beds INT,
      baths DECIMAL(4,2),
      square_footage INT,
      lot_size DECIMAL(15,2),
      probate_pending BOOLEAN,
      probate_duration_days INT,
      last_enriched_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`, 'property_enrichments');

    await q(client, `CREATE TABLE IF NOT EXISTS lead_scores (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL UNIQUE REFERENCES foreclosure_leads(id) ON DELETE CASCADE,
      equity_score INT NOT NULL,
      distress_score INT NOT NULL,
      tenure_score INT NOT NULL,
      tax_score INT NOT NULL,
      vacancy_score INT NOT NULL,
      opportunity_score INT NOT NULL,
      tier VARCHAR(10) NOT NULL,
      scored_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`, 'lead_scores');

    // ── Supporting Tables ──
    console.log('\n── Supporting Tables ──');

    await q(client, `CREATE TABLE IF NOT EXISTS user_saved_searches (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      search_name VARCHAR(150) NOT NULL,
      filter_criteria JSONB NOT NULL,
      email_notifications BOOLEAN DEFAULT TRUE,
      webhook_notifications BOOLEAN DEFAULT FALSE,
      webhook_url VARCHAR(512),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`, 'user_saved_searches');

    await q(client, `CREATE TABLE IF NOT EXISTS crm_pipelines (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'NEW',
      notes TEXT,
      offer_amount DECIMAL(15,2),
      contacted_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, lead_id)
    )`, 'crm_pipelines');

    await q(client, `CREATE TABLE IF NOT EXISTS scrapers_log (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      county_code VARCHAR(20) NOT NULL,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ,
      status VARCHAR(50) NOT NULL,
      records_discovered INT DEFAULT 0,
      anomalies_detected TEXT,
      log_output_url VARCHAR(512)
    )`, 'scrapers_log');

    await q(client, `CREATE TABLE IF NOT EXISTS subscription_payments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan VARCHAR(20) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      cashapp_reference VARCHAR(255),
      status VARCHAR(20) DEFAULT 'PENDING',
      admin_notes TEXT,
      confirmed_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      confirmed_at TIMESTAMPTZ
    )`, 'subscription_payments');

    // ── Phase 2+ Tables ──
    console.log('\n── Phase 2+ Extended Tables ──');

    await q(client, `CREATE TABLE IF NOT EXISTS county_discovery_registry (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      county VARCHAR(100) NOT NULL, state VARCHAR(2) NOT NULL,
      portal_name VARCHAR(150) NOT NULL, url VARCHAR(512) NOT NULL,
      platform_type VARCHAR(100) NOT NULL, captcha_required BOOLEAN DEFAULT FALSE,
      ocr_required BOOLEAN DEFAULT FALSE, search_method VARCHAR(100),
      api_available BOOLEAN DEFAULT FALSE, authentication_required BOOLEAN DEFAULT FALSE,
      data_quality_score INT DEFAULT 0, connector_status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`, 'county_discovery_registry');

    await q(client, `CREATE TABLE IF NOT EXISTS connector_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      registry_id UUID REFERENCES county_discovery_registry(id) ON DELETE CASCADE,
      connector_code TEXT NOT NULL, validation_checklist JSONB NOT NULL,
      estimated_maintenance_score INT DEFAULT 100, status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`, 'connector_templates');

    await q(client, `CREATE TABLE IF NOT EXISTS seller_personas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE,
      persona_type VARCHAR(100) NOT NULL, confidence_score INT NOT NULL,
      contact_strategy TEXT NOT NULL, offer_type VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, UNIQUE(lead_id, persona_type)
    )`, 'seller_personas');

    await q(client, `CREATE TABLE IF NOT EXISTS heatmap_metrics (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      zip_code VARCHAR(10) NOT NULL UNIQUE, city VARCHAR(100) NOT NULL,
      county_code VARCHAR(20) NOT NULL, state VARCHAR(2) NOT NULL,
      foreclosure_count INT DEFAULT 0, probate_count INT DEFAULT 0,
      tax_delinquency_count INT DEFAULT 0, vacancy_count INT DEFAULT 0,
      investor_purchase_count INT DEFAULT 0, cash_transaction_count INT DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`, 'heatmap_metrics');

    await q(client, `CREATE TABLE IF NOT EXISTS verified_distress_records (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE,
      source_url VARCHAR(512) NOT NULL, source_type VARCHAR(100) NOT NULL,
      collection_date DATE NOT NULL, verification_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      document_id VARCHAR(100) NOT NULL, source_confidence_score DECIMAL(5,2) NOT NULL,
      distress_type VARCHAR(50) NOT NULL, specific_fields JSONB NOT NULL,
      is_verified BOOLEAN DEFAULT TRUE,
      raw_extracted_text TEXT, original_html_or_page TEXT,
      document_hash VARCHAR(128), parser_version VARCHAR(20) DEFAULT '1.0.0',
      extraction_timestamp TIMESTAMPTZ, evidence_location VARCHAR(512),
      provenance_score INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`, 'verified_distress_records');

    await q(client, `CREATE TABLE IF NOT EXISTS cash_buyers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      entity_name VARCHAR(255) UNIQUE NOT NULL, first_purchase_date DATE,
      last_purchase_date DATE, purchase_count INT DEFAULT 0,
      average_purchase_price DECIMAL(15,2) DEFAULT 0.00,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`, 'cash_buyers');

    await q(client, `CREATE TABLE IF NOT EXISTS buyer_transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      buyer_id UUID REFERENCES cash_buyers(id) ON DELETE CASCADE,
      lead_id UUID REFERENCES foreclosure_leads(id) ON DELETE SET NULL,
      property_address VARCHAR(255) NOT NULL, purchase_price DECIMAL(15,2) NOT NULL,
      purchase_date DATE NOT NULL, county_code VARCHAR(20) NOT NULL,
      document_url VARCHAR(512), created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`, 'buyer_transactions');

    await q(client, `CREATE TABLE IF NOT EXISTS lead_history (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE,
      event_type VARCHAR(100) NOT NULL, previous_value VARCHAR(100),
      new_value VARCHAR(100), notes TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`, 'lead_history');

    await q(client, `CREATE TABLE IF NOT EXISTS investor_feedback (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      investor_name VARCHAR(150) NOT NULL, email VARCHAR(255) NOT NULL,
      market_state VARCHAR(2) NOT NULL,
      lead_quality_rating INT, accuracy_rating INT, conversion_rating INT,
      feedback_text TEXT, feature_requests TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`, 'investor_feedback');

    await q(client, `CREATE TABLE IF NOT EXISTS market_trends (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      region_type VARCHAR(50) NOT NULL, region_value VARCHAR(100) NOT NULL,
      month_start DATE NOT NULL, average_arv DECIMAL(15,2), average_equity_pct DECIMAL(5,2),
      listing_volume_change_pct DECIMAL(5,2), created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(region_type, region_value, month_start)
    )`, 'market_trends');

    await q(client, `CREATE TABLE IF NOT EXISTS phones (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE, phone_number VARCHAR(20) NOT NULL, phone_type VARCHAR(50), is_verified BOOLEAN DEFAULT FALSE, confidence_score INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`, 'phones');
    await q(client, `CREATE TABLE IF NOT EXISTS emails (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE, email_address VARCHAR(255) NOT NULL, is_verified BOOLEAN DEFAULT FALSE, confidence_score INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`, 'emails');
    await q(client, `CREATE TABLE IF NOT EXISTS relatives (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE, full_name VARCHAR(255) NOT NULL, relationship VARCHAR(100), phone VARCHAR(20), email VARCHAR(255), created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`, 'relatives');
    await q(client, `CREATE TABLE IF NOT EXISTS ocr_documents (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), lead_id UUID REFERENCES foreclosure_leads(id) ON DELETE SET NULL, file_url VARCHAR(512) NOT NULL, document_type VARCHAR(100) NOT NULL, raw_text TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`, 'ocr_documents');
    await q(client, `CREATE TABLE IF NOT EXISTS ocr_extractions (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), document_id UUID NOT NULL REFERENCES ocr_documents(id) ON DELETE CASCADE, extracted_field VARCHAR(100) NOT NULL, extracted_value TEXT NOT NULL, confidence_score DECIMAL(5,2) NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`, 'ocr_extractions');
    await q(client, `CREATE TABLE IF NOT EXISTS expansion_regions (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), center_city VARCHAR(100) NOT NULL, center_state VARCHAR(2) NOT NULL, radius_miles INT NOT NULL, discovered_counties JSONB NOT NULL, discovered_zipcodes JSONB NOT NULL, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`, 'expansion_regions');
    await q(client, `CREATE TABLE IF NOT EXISTS blocked_ips (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), ip_address VARCHAR(50) UNIQUE NOT NULL, reason TEXT, blocked_by VARCHAR(255), blocked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, expires_at TIMESTAMPTZ, is_active BOOLEAN DEFAULT TRUE)`, 'blocked_ips');
    await q(client, `CREATE TABLE IF NOT EXISTS audit_logs (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), admin_email VARCHAR(255) NOT NULL, target_user_email VARCHAR(255), action VARCHAR(100) NOT NULL, notes TEXT, timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`, 'audit_logs');
    await q(client, `CREATE TABLE IF NOT EXISTS property_sales (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), lead_id UUID UNIQUE NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, sale_date DATE NOT NULL, assignment_fee DECIMAL(15,2) NOT NULL, profit_amount DECIMAL(15,2) NOT NULL, notes TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`, 'property_sales');
    await q(client, `CREATE TABLE IF NOT EXISTS buyer_activity (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), buyer_id UUID REFERENCES cash_buyers(id) ON DELETE CASCADE, activity_type VARCHAR(100) NOT NULL, description TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`, 'buyer_activity');

    // ── Workflow Tables ──
    console.log('\n── Workflow Tables ──');
    await q(client, `CREATE TABLE IF NOT EXISTS lead_tasks (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE, user_id UUID REFERENCES users(id) ON DELETE SET NULL, task_type VARCHAR(100) NOT NULL, status VARCHAR(50) DEFAULT 'PENDING', due_date TIMESTAMPTZ, notes TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`, 'lead_tasks');
    await q(client, `CREATE TABLE IF NOT EXISTS lead_communications (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE, user_id UUID REFERENCES users(id) ON DELETE SET NULL, channel VARCHAR(50) NOT NULL, direction VARCHAR(20) DEFAULT 'OUTBOUND', content TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`, 'lead_communications');
    await q(client, `CREATE TABLE IF NOT EXISTS cash_buyers_v2 (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), entity_name VARCHAR(255) NOT NULL, contact_name VARCHAR(255), email VARCHAR(255), phone VARCHAR(50), preferred_markets JSONB DEFAULT '[]', purchase_criteria JSONB DEFAULT '{}', total_purchases INT DEFAULT 0, avg_purchase_price DECIMAL(15,2) DEFAULT 0, status VARCHAR(50) DEFAULT 'ACTIVE', source VARCHAR(100) DEFAULT 'MANUAL', notes TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, UNIQUE(entity_name, email))`, 'cash_buyers_v2');
    await q(client, `CREATE TABLE IF NOT EXISTS contracts (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, contract_type VARCHAR(50) NOT NULL, status VARCHAR(50) DEFAULT 'DRAFT', purchase_price DECIMAL(15,2), assignment_fee DECIMAL(15,2), closing_date DATE, notes TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`, 'contracts');
    await q(client, `CREATE TABLE IF NOT EXISTS dispositions (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, buyer_id UUID REFERENCES cash_buyers_v2(id), disposition_type VARCHAR(50) NOT NULL, status VARCHAR(50) DEFAULT 'LISTED', list_price DECIMAL(15,2), final_price DECIMAL(15,2), profit DECIMAL(15,2), notes TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`, 'dispositions');

    // ── Indexes ──
    console.log('\n── Indexes ──');
    await q(client, 'CREATE INDEX IF NOT EXISTS idx_foreclosure_leads_coords ON foreclosure_leads (latitude, longitude)', 'idx_coords');
    await q(client, 'CREATE INDEX IF NOT EXISTS idx_foreclosure_leads_hash ON foreclosure_leads (hash_signature)', 'idx_hash');
    await q(client, 'CREATE INDEX IF NOT EXISTS idx_foreclosure_leads_lookup ON foreclosure_leads (county_code, filing_date DESC)', 'idx_lookup');
    await q(client, 'CREATE INDEX IF NOT EXISTS idx_foreclosure_leads_type ON foreclosure_leads (filing_type)', 'idx_type');
    await q(client, 'CREATE INDEX IF NOT EXISTS idx_property_enrichments_equity ON property_enrichments (estimated_equity DESC)', 'idx_equity');
    await q(client, 'CREATE INDEX IF NOT EXISTS idx_lead_scores_aggregate ON lead_scores (opportunity_score DESC, tier)', 'idx_scores');
    await q(client, 'CREATE INDEX IF NOT EXISTS idx_foreclosure_leads_verification ON foreclosure_leads (verification_status)', 'idx_verification');

    // ── Trigger Function ──
    console.log('\n── Triggers ──');
    await q(client, `
      CREATE OR REPLACE FUNCTION update_modified_column()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
      $$ LANGUAGE plpgsql
    `, 'update_modified_column function');

    // ── Verify ──
    console.log('\n═══════════════════════════════════════════');
    console.log('VERIFICATION');
    console.log('═══════════════════════════════════════════');
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    for (const row of tables.rows) console.log(`  ✓ ${row.table_name}`);
    console.log(`\n  TOTAL: ${tables.rows.length} tables`);
    console.log('\n✅ SCHEMA BOOTSTRAP COMPLETE');

  } catch (err) {
    console.error('\n❌ Fatal:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
