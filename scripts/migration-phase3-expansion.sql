-- ============================================================================
-- FORECLOSUREFINDER AI — PHASE 3 SOUTHERN EXPANSION SCHEMA MIGRATION
-- Target Database: PostgreSQL 16+
-- ============================================================================

-- PostgreSQL enums cannot be altered inside a transaction block.
-- These statements should be run individually.
ALTER TYPE filing_type_enum ADD VALUE IF NOT EXISTS 'PROPERTY_LEAD';
ALTER TYPE filing_type_enum ADD VALUE IF NOT EXISTS 'PROSPECT_PROPERTY';

-- Add verification status columns to foreclosure_leads
ALTER TABLE foreclosure_leads ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'UNVERIFIED';
ALTER TABLE foreclosure_leads ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create verified_distress_records table
CREATE TABLE IF NOT EXISTS verified_distress_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE,
  source_url VARCHAR(512) NOT NULL,
  source_type VARCHAR(100) NOT NULL,
  collection_date DATE NOT NULL,
  verification_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  document_id VARCHAR(100) NOT NULL,
  source_confidence_score DECIMAL(5,2) NOT NULL,
  distress_type VARCHAR(50) NOT NULL,
  specific_fields JSONB NOT NULL,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create cash_buyers table
CREATE TABLE IF NOT EXISTS cash_buyers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_name VARCHAR(255) UNIQUE NOT NULL,
  first_purchase_date DATE,
  last_purchase_date DATE,
  purchase_count INT DEFAULT 0,
  average_purchase_price DECIMAL(15,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create buyer_transactions table
CREATE TABLE IF NOT EXISTS buyer_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES cash_buyers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES foreclosure_leads(id) ON DELETE SET NULL,
  property_address VARCHAR(255) NOT NULL,
  purchase_price DECIMAL(15,2) NOT NULL,
  purchase_date DATE NOT NULL,
  county_code VARCHAR(20) NOT NULL,
  document_url VARCHAR(512),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create buyer_activity table
CREATE TABLE IF NOT EXISTS buyer_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES cash_buyers(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create lead_history table
CREATE TABLE IF NOT EXISTS lead_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES foreclosure_leads(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- e.g. INGESTED_UNVERIFIED, PROMOTED_TO_VERIFIED
  previous_value VARCHAR(100),
  new_value VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create investor_feedback table
CREATE TABLE IF NOT EXISTS investor_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  market_state VARCHAR(2) NOT NULL,
  lead_quality_rating INT CHECK (lead_quality_rating BETWEEN 1 AND 5),
  accuracy_rating INT CHECK (accuracy_rating BETWEEN 1 AND 5),
  conversion_rating INT CHECK (conversion_rating BETWEEN 1 AND 5),
  feedback_text TEXT,
  feature_requests TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reclassify all existing synthetic leads as PROPERTY_LEAD
UPDATE foreclosure_leads SET filing_type = 'PROPERTY_LEAD', verification_status = 'UNVERIFIED';

-- Add new index lookups
CREATE INDEX IF NOT EXISTS idx_verified_distress_lead ON verified_distress_records (lead_id);
CREATE INDEX IF NOT EXISTS idx_foreclosure_leads_verification ON foreclosure_leads (verification_status);
CREATE INDEX IF NOT EXISTS idx_cash_buyers_name ON cash_buyers (entity_name);
CREATE INDEX IF NOT EXISTS idx_buyer_trans_buyer ON buyer_transactions (buyer_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_lead ON lead_history (lead_id);
