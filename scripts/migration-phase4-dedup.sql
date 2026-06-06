-- ============================================================================
-- FORECLOSUREFINDER AI — PHASE 4 DEDUPLICATION SCHEMA MIGRATION
-- Adds normalized_address column and indexes to support 4-Level deduplication
-- ============================================================================

-- Add normalized_address column to foreclosure_leads
ALTER TABLE foreclosure_leads ADD COLUMN IF NOT EXISTS normalized_address VARCHAR(255) DEFAULT NULL;

-- Create index for fast normalized address lookups
CREATE INDEX IF NOT EXISTS idx_foreclosure_leads_norm_addr ON foreclosure_leads (normalized_address);

-- Make sure verified_distress_records has document_hash indexing
CREATE INDEX IF NOT EXISTS idx_verified_distress_doc_hash ON verified_distress_records (document_hash);

-- If needed, add document_hash column to verified_distress_records if not exists (should already be there)
ALTER TABLE verified_distress_records ADD COLUMN IF NOT EXISTS document_hash VARCHAR(64) DEFAULT NULL;
ALTER TABLE verified_distress_records ADD COLUMN IF NOT EXISTS parser_version VARCHAR(20) DEFAULT NULL;
ALTER TABLE verified_distress_records ADD COLUMN IF NOT EXISTS extraction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE verified_distress_records ADD COLUMN IF NOT EXISTS evidence_location VARCHAR(512) DEFAULT NULL;
ALTER TABLE verified_distress_records ADD COLUMN IF NOT EXISTS raw_extracted_text TEXT DEFAULT NULL;
ALTER TABLE verified_distress_records ADD COLUMN IF NOT EXISTS original_html_or_page TEXT DEFAULT NULL;
ALTER TABLE verified_distress_records ADD COLUMN IF NOT EXISTS provenance_score DECIMAL(5,2) DEFAULT NULL;
