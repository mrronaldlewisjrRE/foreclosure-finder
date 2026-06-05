-- ============================================================================
-- FORECLOSUREFINDER AI — PHASE 3A VALIDATION & EVIDENCE SCHEMA MIGRATION
-- ============================================================================

-- Add enum values individually (not inside a transaction block)
ALTER TYPE filing_type_enum ADD VALUE IF NOT EXISTS 'PROBATE_CASE';
ALTER TYPE filing_type_enum ADD VALUE IF NOT EXISTS 'PROBATE_PROPERTY';

-- Add evidence metadata columns to verified_distress_records
ALTER TABLE verified_distress_records ADD COLUMN IF NOT EXISTS document_hash VARCHAR(64);
ALTER TABLE verified_distress_records ADD COLUMN IF NOT EXISTS parser_version VARCHAR(20) DEFAULT '1.0.0';
ALTER TABLE verified_distress_records ADD COLUMN IF NOT EXISTS extraction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE verified_distress_records ADD COLUMN IF NOT EXISTS evidence_location VARCHAR(512);
ALTER TABLE verified_distress_records ADD COLUMN IF NOT EXISTS raw_extracted_text TEXT;
ALTER TABLE verified_distress_records ADD COLUMN IF NOT EXISTS original_html_or_page TEXT;
ALTER TABLE verified_distress_records ADD COLUMN IF NOT EXISTS provenance_score INT DEFAULT 0;

-- Seed Rutherford and Williamson counties
INSERT INTO counties (county_code, county_name, state, is_active, data_quality_score)
VALUES ('TN_RUTHERFORD', 'Rutherford County', 'TN', TRUE, 95)
ON CONFLICT (county_code) DO NOTHING;

INSERT INTO counties (county_code, county_name, state, is_active, data_quality_score)
VALUES ('TN_WILLIAMSON', 'Williamson County', 'TN', TRUE, 95)
ON CONFLICT (county_code) DO NOTHING;

-- Drop NOT NULL constraints for nullable address fields in foreclosure_leads
ALTER TABLE foreclosure_leads ALTER COLUMN property_street DROP NOT NULL;
ALTER TABLE foreclosure_leads ALTER COLUMN property_city DROP NOT NULL;
ALTER TABLE foreclosure_leads ALTER COLUMN property_state DROP NOT NULL;

