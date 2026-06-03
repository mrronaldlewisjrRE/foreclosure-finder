-- ============================================================================
-- FORECLOSUREFINDER AI — DATABASE DDL SCHEMA
-- Target Database: PostgreSQL 16+
-- Extensions Required: PostGIS (geospatial), UUID-OSSP (unique IDs), pgvector (optional)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TYPE filing_type_enum AS ENUM (
  'LIS_PENDENS',
  'NOTICE_OF_DEFAULT',
  'TRUSTEE_SALE',
  'TAX_DELINQUENCY',
  'PROBATE',
  'SHERIFF_SALE',
  'VACANT_PROPERTY',
  'CODE_VIOLATION'
);

CREATE TYPE lead_tier_enum AS ENUM (
  'A_PLUS',
  'A',
  'B',
  'C'
);

CREATE TYPE pipeline_status_enum AS ENUM (
  'NEW',
  'CONTACTED',
  'FOLLOW_UP',
  'NEGOTIATING',
  'CONTRACT',
  'CLOSED'
);

CREATE TYPE user_role_enum AS ENUM (
  'USER',
  'ADMIN',
  'SUPER_ADMIN'
);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLES
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Counties Registry
CREATE TABLE counties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  county_code VARCHAR(20) UNIQUE NOT NULL,      -- e.g. "TN_DAVIDSON", "TX_HARRIS"
  county_name VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  data_quality_score INT DEFAULT 100 CONSTRAINT chk_quality CHECK (data_quality_score BETWEEN 0 AND 100),
  last_crawl_timestamp TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Users and Access Control
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150),
  role user_role_enum DEFAULT 'USER',
  is_active BOOLEAN DEFAULT TRUE,
  api_key VARCHAR(64) UNIQUE,                    -- Token for API ingestion or third-party webhooks
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,
  last_login_ip VARCHAR(50)
);

-- 2. Foreclosure Leads (Partitioned by State in multi-region setups, shown here as base schema)
CREATE TABLE foreclosure_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  county_code VARCHAR(20) NOT NULL REFERENCES counties(county_code) ON DELETE CASCADE,
  case_number VARCHAR(100),
  filing_date DATE NOT NULL,
  filing_type filing_type_enum NOT NULL,
  owner_name VARCHAR(255),
  parcel_number VARCHAR(100),
  loan_amount DECIMAL(15, 2),
  trustee_name VARCHAR(255),
  plaintiff_attorney VARCHAR(255),
  auction_date TIMESTAMP WITH TIME ZONE,
  
  -- Address Structures
  property_street VARCHAR(255) NOT NULL,
  property_city VARCHAR(100) NOT NULL,
  property_state VARCHAR(2) NOT NULL,
  property_zip VARCHAR(10),
  mailing_street VARCHAR(255),
  mailing_city VARCHAR(100),
  mailing_state VARCHAR(2),
  mailing_zip VARCHAR(10),
  
  -- Spatial Location (Standard Coordinates)
  longitude DECIMAL(9, 6),
  latitude DECIMAL(9, 6),
  
  -- Raw & Compliance Fields
  document_url VARCHAR(512),                     -- Link to Replit Object Storage PDF/Image
  raw_payload JSONB NOT NULL,                    -- Holds original unprocessed OCR or HTML dump
  hash_signature VARCHAR(64) UNIQUE NOT NULL,    -- SHA-256 of case+date+parcel to avoid ingestion duplicates
  
  -- Claim fields
  claim_status VARCHAR(50) DEFAULT 'Available',
  claimed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Property Assessor & Enrichment Details
CREATE TABLE property_enrichments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL UNIQUE REFERENCES foreclosure_leads(id) ON DELETE CASCADE,
  estimated_value DECIMAL(15, 2),                -- AVM Value
  first_mortgage_amount DECIMAL(15, 2),
  total_liens DECIMAL(15, 2) DEFAULT 0.00,
  estimated_equity DECIMAL(15, 2),
  equity_percentage DECIMAL(5, 2),               -- e.g. 54.23 (%)
  ownership_length_years DECIMAL(4, 1),
  is_absentee_owned BOOLEAN DEFAULT FALSE,
  is_vacant BOOLEAN DEFAULT FALSE,               -- USPS vacancy report check
  occupancy_probability INT DEFAULT 100,         -- Score 0-100 indicating likelihood of physical occupancy
  property_type VARCHAR(100),                    -- e.g. Single Family Residential, Duplex
  assessor_year_built INT,
  beds INT DEFAULT NULL,
  baths DECIMAL(4, 2) DEFAULT NULL,
  square_footage INT DEFAULT NULL,
  lot_size DECIMAL(15, 2) DEFAULT NULL,
  probate_pending BOOLEAN DEFAULT NULL,
  probate_duration_days INT DEFAULT NULL,
  last_enriched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Opportunity Scoring Records
CREATE TABLE lead_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL UNIQUE REFERENCES foreclosure_leads(id) ON DELETE CASCADE,
  equity_score INT NOT NULL,                     -- 0-100 sub-score
  distress_score INT NOT NULL,                   -- 0-100 sub-score
  tenure_score INT NOT NULL,                     -- 0-100 sub-score
  tax_score INT NOT NULL,                        -- 0-100 sub-score
  vacancy_score INT NOT NULL,                    -- 0-100 sub-score
  opportunity_score INT NOT NULL,                -- Weighted Aggregate (0-100)
  tier lead_tier_enum NOT NULL,                  -- A+, A, B, or C
  scored_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table moved earlier in schema

-- 6. Saved Searches & Alerts Trigger Parameters
CREATE TABLE user_saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  search_name VARCHAR(150) NOT NULL,
  filter_criteria JSONB NOT NULL,                -- Holds JSON query bounds (states, tiers, min_equity, property_type)
  email_notifications BOOLEAN DEFAULT TRUE,
  webhook_notifications BOOLEAN DEFAULT FALSE,
  webhook_url VARCHAR(512),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. CRM Pipeline Tracker
CREATE TABLE crm_pipelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE,
  status pipeline_status_enum DEFAULT 'NEW',
  notes TEXT,
  offer_amount DECIMAL(15, 2),
  contacted_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, lead_id)                       -- Prevents adding the same lead twice to a single user CRM
);

-- 8. Scrapers Operations Logging (PgMQ Queue health & Execution Audit)
CREATE TABLE scrapers_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  county_code VARCHAR(20) NOT NULL REFERENCES counties(county_code) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL,                   -- e.g. "SUCCESS", "FAILED", "CAPTCHA_BLOCKED"
  records_discovered INT DEFAULT 0,
  anomalies_detected TEXT,
  log_output_url VARCHAR(512)                    -- Replit Object Storage link to text logs
);

-- ════════════════════════════════════════════════════════════════════════════
-- INDEXES & PERFORMANCE OPTIMIZATION
-- ════════════════════════════════════════════════════════════════════════════

-- Geospatial indexing
CREATE INDEX idx_foreclosure_leads_coords ON foreclosure_leads (latitude, longitude);

-- Ingestion duplicate checking and date filtering
CREATE INDEX idx_foreclosure_leads_hash ON foreclosure_leads (hash_signature);
CREATE INDEX idx_foreclosure_leads_lookup ON foreclosure_leads (county_code, filing_date DESC);
CREATE INDEX idx_foreclosure_leads_type ON foreclosure_leads (filing_type);

-- Query optimizations on assessments
CREATE INDEX idx_property_enrichments_equity ON property_enrichments (estimated_equity DESC);
CREATE INDEX idx_property_enrichments_vacancy ON property_enrichments (is_vacant) WHERE is_vacant = TRUE;

-- Lead Scoring filtering index
CREATE INDEX idx_lead_scores_aggregate ON lead_scores (opportunity_score DESC, tier);

-- JSONB indexing for saved searches query extraction
CREATE INDEX idx_saved_searches_criteria ON user_saved_searches USING GIN (filter_criteria);

-- ════════════════════════════════════════════════════════════════════════════
-- TRIGGERS & PROCEDURES (Self-updating hooks)
-- ════════════════════════════════════════════════════════════════════════════

-- Auto update timestamps function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Hook update triggers
CREATE TRIGGER update_counties_modtime
  BEFORE UPDATE ON counties FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_foreclosure_leads_modtime
  BEFORE UPDATE ON foreclosure_leads FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_users_modtime
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_crm_pipelines_modtime
  BEFORE UPDATE ON crm_pipelines FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 2 EVOLUTION: DISCOVERY, CONNECTOR, MOTIVATION, ANALYZER, AND PERSONA TABLES
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS county_discovery_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  county VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  portal_name VARCHAR(150) NOT NULL,
  url VARCHAR(512) NOT NULL,
  platform_type VARCHAR(100) NOT NULL,
  captcha_required BOOLEAN DEFAULT FALSE,
  ocr_required BOOLEAN DEFAULT FALSE,
  search_method VARCHAR(100),
  api_available BOOLEAN DEFAULT FALSE,
  authentication_required BOOLEAN DEFAULT FALSE,
  data_quality_score INT DEFAULT 0 CONSTRAINT chk_discovery_quality CHECK (data_quality_score BETWEEN 0 AND 100),
  connector_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS connector_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registry_id UUID REFERENCES county_discovery_registry(id) ON DELETE CASCADE,
  connector_code TEXT NOT NULL,
  validation_checklist JSONB NOT NULL,
  estimated_maintenance_score INT DEFAULT 100,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seller_personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE,
  persona_type VARCHAR(100) NOT NULL,
  confidence_score INT NOT NULL CONSTRAINT chk_persona_confidence CHECK (confidence_score BETWEEN 0 AND 100),
  contact_strategy TEXT NOT NULL,
  offer_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lead_id, persona_type)
);

CREATE TABLE IF NOT EXISTS heatmap_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zip_code VARCHAR(10) NOT NULL,
  city VARCHAR(100) NOT NULL,
  county_code VARCHAR(20) NOT NULL REFERENCES counties(county_code) ON DELETE CASCADE,
  state VARCHAR(2) NOT NULL,
  foreclosure_count INT DEFAULT 0,
  probate_count INT DEFAULT 0,
  tax_delinquency_count INT DEFAULT 0,
  vacancy_count INT DEFAULT 0,
  investor_purchase_count INT DEFAULT 0,
  cash_transaction_count INT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(zip_code)
);

CREATE TABLE IF NOT EXISTS market_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_type VARCHAR(50) NOT NULL,
  region_value VARCHAR(100) NOT NULL,
  month_start DATE NOT NULL,
  average_arv DECIMAL(15,2) DEFAULT NULL,
  average_equity_pct DECIMAL(5,2) DEFAULT NULL,
  listing_volume_change_pct DECIMAL(5,2) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(region_type, region_value, month_start)
);

CREATE TABLE IF NOT EXISTS ocr_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES foreclosure_leads(id) ON DELETE SET NULL,
  file_url VARCHAR(512) NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  raw_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ocr_extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES ocr_documents(id) ON DELETE CASCADE,
  extracted_field VARCHAR(100) NOT NULL,
  extracted_value TEXT NOT NULL,
  confidence_score DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS phones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  phone_type VARCHAR(50),
  is_verified BOOLEAN DEFAULT FALSE,
  confidence_score INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE,
  email_address VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  confidence_score INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS relatives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expansion_regions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_city VARCHAR(100) NOT NULL,
  center_state VARCHAR(2) NOT NULL,
  radius_miles INT NOT NULL,
  discovered_counties JSONB NOT NULL,
  discovered_zipcodes JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for county_discovery_registry update timestamp
CREATE TRIGGER update_county_discovery_registry_modtime
  BEFORE UPDATE ON county_discovery_registry FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_county_discovery_state ON county_discovery_registry (state, county);
CREATE INDEX IF NOT EXISTS idx_seller_personas_lead ON seller_personas (lead_id);
CREATE INDEX IF NOT EXISTS idx_heatmap_zip ON heatmap_metrics (zip_code);
CREATE INDEX IF NOT EXISTS idx_phones_lead ON phones (lead_id);
CREATE INDEX IF NOT EXISTS idx_emails_lead ON emails (lead_id);
CREATE INDEX IF NOT EXISTS idx_relatives_lead ON relatives (lead_id);

-- Phase 3D Admin Governance tables
CREATE TABLE IF NOT EXISTS blocked_ips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address VARCHAR(50) UNIQUE NOT NULL,
  reason TEXT,
  blocked_by VARCHAR(255),
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_email VARCHAR(255) NOT NULL,
  target_user_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  notes TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS property_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID UNIQUE NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL,
  assignment_fee DECIMAL(15, 2) NOT NULL,
  profit_amount DECIMAL(15, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
