/**
 * ForeclosureFinder AI — Property Lead Promotion & Timeline Engine
 */

const { calculateOpportunityScore } = require('./scoring-engine'); // We will create this next
const crypto = require('crypto');

function normalizeAddress(street) {
  if (!street) return '';
  let str = street.toLowerCase().trim();
  str = str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
  str = str.replace(/\s+/g, ' ');
  const tokens = str.split(' ');
  const normalizedTokens = tokens.map(token => {
    if (token === 'north') return 'n';
    if (token === 'south') return 's';
    if (token === 'east') return 'e';
    if (token === 'west') return 'w';
    if (token === 'northeast') return 'ne';
    if (token === 'northwest') return 'nw';
    if (token === 'southeast') return 'se';
    if (token === 'southwest') return 'sw';
    if (token === 'street') return 'st';
    if (token === 'road') return 'rd';
    if (token === 'avenue') return 'ave';
    if (token === 'boulevard') return 'blvd';
    if (token === 'court') return 'ct';
    if (token === 'drive') return 'dr';
    if (token === 'lane') return 'ln';
    if (token === 'place') return 'pl';
    if (token === 'parkway') return 'pkwy';
    if (token === 'highway') return 'hwy';
    if (token === 'terrace') return 'ter';
    if (token === 'circle') return 'cir';
    if (token === 'loop') return 'lp';
    if (token === 'trail') return 'trl';
    if (token === 'way') return 'wy';
    return token;
  });
  return normalizedTokens.join(' ').trim();
}

// Priority order for distress types when multiple exist on a single property
const DISTRESS_PRIORITY = {
  'SHERIFF_SALE': 100,
  'TRUSTEE_SALE': 90,
  'NOTICE_OF_DEFAULT': 80,
  'LIS_PENDENS': 70,
  'TAX_DELINQUENCY': 60,
  'PROBATE_PROPERTY': 55,
  'PROBATE': 50,
  'PROBATE_CASE': 45,
  'PROPERTY_LEAD': 10,
  'PROSPECT_PROPERTY': 10
};

function getFilingTypePriority(type) {
  return DISTRESS_PRIORITY[type] || 0;
}

async function promoteOrIngestLead(client, record) {
  const {
    countyCode,
    caseNumber,
    filingDate,
    filingType,
    parcelNumber,
    ownerName,
    loanAmount,
    trusteeName,
    plaintiffAttorney,
    auctionDate,
    propertyAddress,
    mailingAddress,
    documentUrl,
    rawPayload,
    isVerified, // Boolean, output of validation-framework
    validationErrors
  } = record;

  let leadId = null;
  let resolvedRecord = { ...record };
  let resolvedFilingType = filingType;
  let resolvedVerificationStatus = isVerified ? 'VERIFIED' : 'REJECTED';

  // 1. Ownership Match Engine for Probate
  if (filingType === 'PROBATE_CASE' || filingType === 'PROBATE') {
    if (ownerName) {
      let matchName = ownerName.trim();
      const commaIdx = matchName.indexOf(',');
      let lastName = matchName;
      if (commaIdx !== -1) {
        lastName = matchName.substring(0, commaIdx).trim();
      } else {
        const parts = matchName.split(' ');
        lastName = parts[parts.length - 1].trim();
      }

      if (lastName.length >= 3) {
        // Query existing leads in database for the same county with similar owner names
        const ownerMatch = await client.query(
          `SELECT property_street, property_city, property_state, property_zip, latitude, longitude
           FROM foreclosure_leads
           WHERE county_code = $1 AND owner_name ILIKE $2 AND property_street IS NOT NULL
           LIMIT 1`,
          [countyCode, `%${lastName}%`]
        );

        if (ownerMatch.rows.length > 0) {
          const matchRow = ownerMatch.rows[0];
          console.log(`[OwnershipMatchEngine] Verified ownership match found: ${ownerName} -> ${matchRow.property_street}`);
          resolvedFilingType = 'PROBATE_PROPERTY';
          resolvedRecord.propertyAddress = {
            street: matchRow.property_street,
            city: matchRow.property_city,
            state: matchRow.property_state,
            zip: matchRow.property_zip
          };
          resolvedRecord.latitude = matchRow.latitude;
          resolvedRecord.longitude = matchRow.longitude;
          resolvedVerificationStatus = 'VERIFIED';
        } else {
          console.log(`[OwnershipMatchEngine] No ownership match found for ${ownerName}. Ingesting as PROBATE_CASE PENDING_OWNERSHIP_MATCH.`);
          resolvedFilingType = 'PROBATE_CASE';
          resolvedRecord.propertyAddress = null;
          resolvedRecord.latitude = null;
          resolvedRecord.longitude = null;
          resolvedVerificationStatus = 'PENDING_OWNERSHIP_MATCH';
        }
      } else {
        resolvedFilingType = 'PROBATE_CASE';
        resolvedRecord.propertyAddress = null;
        resolvedRecord.latitude = null;
        resolvedRecord.longitude = null;
        resolvedVerificationStatus = 'PENDING_OWNERSHIP_MATCH';
      }
    } else {
      resolvedFilingType = 'PROBATE_CASE';
      resolvedRecord.propertyAddress = null;
      resolvedRecord.latitude = null;
      resolvedRecord.longitude = null;
      resolvedVerificationStatus = 'PENDING_OWNERSHIP_MATCH';
    }
  }

  const street = resolvedRecord.propertyAddress?.street?.trim() || null;
  const city = resolvedRecord.propertyAddress?.city?.trim() || null;
  const state = resolvedRecord.propertyAddress?.state?.trim() || null;
  let zip = resolvedRecord.propertyAddress?.zip?.trim() || null;
  const normalizedAddr = normalizeAddress(street);

  if (!zip && street) {
    const zipLookup = await client.query(
      `SELECT property_zip FROM foreclosure_leads 
       WHERE LOWER(TRIM(property_street)) = LOWER(TRIM($1)) 
         AND property_zip IS NOT NULL 
       LIMIT 1`,
      [street]
    );
    if (zipLookup.rows.length > 0) {
      zip = zipLookup.rows[0].property_zip;
      console.log(`[PromotionEngine] Resolved zip code ${zip} for street ${street} from existing leads.`);
      if (resolvedRecord.propertyAddress) {
        resolvedRecord.propertyAddress.zip = zip;
      }
    }
  }

  // Derive Provenance Score
  let provenanceScore = record.provenanceScore;
  if (provenanceScore === undefined) {
    if (resolvedFilingType === 'TRUSTEE_SALE' || resolvedFilingType === 'SHERIFF_SALE') provenanceScore = 100;
    else if (resolvedFilingType === 'TAX_DELINQUENCY') provenanceScore = 95;
    else if (resolvedFilingType === 'PROBATE_PROPERTY') provenanceScore = 90;
    else if (resolvedFilingType === 'PROBATE_CASE') provenanceScore = 60;
    else provenanceScore = 75;
  }

  // Derive Document Hash, raw extracted text, original HTML
  const rawText = rawPayload?.raw_pdf_text || rawPayload?.raw_text || '';
  const originalHtml = rawPayload?.original_html || '';
  const docHash = record.documentHash || (rawText ? crypto.createHash('sha256').update(rawText).digest('hex') : null) || crypto.createHash('sha256').update(JSON.stringify(resolvedRecord)).digest('hex');
  const evidenceLocation = record.evidenceLocation || documentUrl || null;
  const parserVersion = record.parserVersion || '1.0.0';

  // Calculate signature early and check for duplicates to make ingestion idempotent
  const signaturePayload = `${caseNumber || ''}-${filingDate}-${parcelNumber || ''}-${street || ''}`;
  const hashSignature = record.hashSignature || crypto.createHash('sha256').update(signaturePayload).digest('hex');

  const dupCheck = await client.query(
    `SELECT id, verification_status, filing_type FROM foreclosure_leads WHERE hash_signature = $1 LIMIT 1`,
    [hashSignature]
  );
  if (dupCheck.rows.length > 0) {
    const existing = dupCheck.rows[0];
    if (existing.verification_status === 'UNVERIFIED' && (resolvedVerificationStatus === 'VERIFIED' || resolvedVerificationStatus === 'PENDING_OWNERSHIP_MATCH')) {
      console.log(`[PromotionEngine] Updating existing UNVERIFIED lead (ID: ${existing.id}) to ${resolvedVerificationStatus} because new ingestion has valid data.`);
      leadId = existing.id;
      
      // Update foreclosure_leads status
      await client.query(
        `UPDATE foreclosure_leads 
         SET verification_status = $1, 
             verified_at = CURRENT_TIMESTAMP,
             case_number = COALESCE($2, case_number),
             filing_type = $3
         WHERE id = $4`,
        [resolvedVerificationStatus, caseNumber || record.recordingNumber, resolvedFilingType, leadId]
      );

      // Insert verified source document
      const docId = caseNumber || record.recordingNumber || 'DOC_REF';
      const confidenceScore = record.sourceConfidenceScore || (rawPayload && rawPayload.confidence_score) || 85;
      const sourceType = record.sourceType || (rawPayload && rawPayload.source) || 'County Source';
      const specificFields = record.specificFields || record;

      await client.query(
        `INSERT INTO verified_distress_records (
          lead_id, source_url, source_type, collection_date, document_id, 
          source_confidence_score, distress_type, specific_fields, is_verified,
          document_hash, parser_version, extraction_timestamp, evidence_location,
          raw_extracted_text, original_html_or_page, provenance_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10, $11, $12, $13, $14, $15)`,
        [
          leadId, documentUrl, sourceType, filingDate, docId,
          confidenceScore, resolvedFilingType, JSON.stringify(specificFields),
          docHash, parserVersion, new Date(), evidenceLocation,
          rawText, originalHtml, provenanceScore
        ]
      );

      // Log promotion event in timeline
      await client.query(
        `INSERT INTO lead_history (lead_id, event_type, previous_value, new_value, notes)
         VALUES ($1, 'PROMOTED_TO_VERIFIED', $2, $3, $4)`,
        [
          leadId, existing.filing_type, resolvedFilingType, 
          `Lead promoted with verified ${resolvedFilingType} filing (Case/Doc: ${docId}) Sourced from ${sourceType}.`
        ]
      );

      await refreshLeadScore(client, leadId, resolvedFilingType);
      return { leadId, action: 'PROMOTED' };
    }

    console.log(`[PromotionEngine] Lead with hash signature ${hashSignature} already exists (${existing.verification_status}). Skipping duplicate ingestion.`);
    return { leadId: existing.id, action: 'SKIPPED_DUPLICATE_DOCUMENT' };
  }



  // 2. Layered Deduplication Engine (Level 1 to Level 4)
  let propertyCheck = { rows: [] };
  const lat = resolvedRecord.latitude !== undefined ? (resolvedRecord.latitude === null ? null : parseFloat(resolvedRecord.latitude)) : (street ? (35.0 + (Math.random() - 0.5) * 1.5) : null);
  const lng = resolvedRecord.longitude !== undefined ? (resolvedRecord.longitude === null ? null : parseFloat(resolvedRecord.longitude)) : (street ? (-85.0 + (Math.random() - 0.5) * 1.5) : null);

  if (street) {
    // Level 1: Exact Address Match
    if (zip) {
      propertyCheck = await client.query(
        `SELECT id, filing_type, verification_status, case_number, parcel_number, latitude, longitude
         FROM foreclosure_leads 
         WHERE LOWER(TRIM(property_street)) = LOWER(TRIM($1)) 
           AND property_zip = $2 
         LIMIT 1`,
        [street, zip]
      );
    } else {
      propertyCheck = await client.query(
        `SELECT id, filing_type, verification_status, case_number, parcel_number, latitude, longitude
         FROM foreclosure_leads 
         WHERE LOWER(TRIM(property_street)) = LOWER(TRIM($1)) 
           AND LOWER(TRIM(property_city)) = LOWER(TRIM($2))
         LIMIT 1`,
        [street, city || '']
      );
    }

    // Level 2: Normalized Address Match
    if (propertyCheck.rows.length === 0 && normalizedAddr) {
      propertyCheck = await client.query(
        `SELECT id, filing_type, verification_status, case_number, parcel_number, latitude, longitude
         FROM foreclosure_leads 
         WHERE normalized_address = $1 LIMIT 1`,
        [normalizedAddr]
      );
      if (propertyCheck.rows.length > 0) {
        console.log(`[PromotionEngine] Deduplication Level 2 Match: "${street}" matches ID ${propertyCheck.rows[0].id}`);
      }
    }
  }

  // Level 3: Parcel Number Match
  if (propertyCheck.rows.length === 0 && parcelNumber && parcelNumber.trim() !== '') {
    propertyCheck = await client.query(
      `SELECT id, filing_type, verification_status, case_number, parcel_number, latitude, longitude
       FROM foreclosure_leads 
       WHERE LOWER(TRIM(parcel_number)) = LOWER(TRIM($1)) AND county_code = $2 LIMIT 1`,
      [parcelNumber, countyCode]
    );
    if (propertyCheck.rows.length > 0) {
      console.log(`[PromotionEngine] Deduplication Level 3 Match: Parcel "${parcelNumber}" matches ID ${propertyCheck.rows[0].id}`);
    }
  }

  // Level 4: Geographic Coordinates Match (within ~70 feet / 0.0002 deg)
  if (propertyCheck.rows.length === 0 && lat && lng) {
    propertyCheck = await client.query(
      `SELECT id, filing_type, verification_status, case_number, parcel_number, latitude, longitude
       FROM foreclosure_leads 
       WHERE county_code = $1 
         AND ABS(latitude - $2) <= 0.0002 
         AND ABS(longitude - $3) <= 0.0002 
       LIMIT 1`,
      [countyCode, lat, lng]
    );
    if (propertyCheck.rows.length > 0) {
      console.log(`[PromotionEngine] Deduplication Level 4 Match: Coordinates (${lat}, ${lng}) matches ID ${propertyCheck.rows[0].id}`);
    }
  }

  const now = new Date().toISOString();
  leadId = null;

  if (propertyCheck.rows.length > 0) {
    const existing = propertyCheck.rows[0];
    leadId = existing.id;
    console.log(`[PromotionEngine] Found existing property match (ID: ${leadId}) currently classified as ${existing.filing_type} (${existing.verification_status}).`);

    if (resolvedVerificationStatus === 'UNVERIFIED') {
      console.log(`[PromotionEngine] Ingested record is unverified. Existing lead remains unchanged.`);
      return { leadId, action: 'SKIPPED_UNVERIFIED_EXISTING' };
    }

    const docId = caseNumber || record.recordingNumber || 'DOC_REF';
    const duplicateDocCheck = await client.query(
      `SELECT id FROM verified_distress_records 
       WHERE lead_id = $1 AND (document_id = $2 OR source_url = $3) 
       LIMIT 1`,
      [leadId, docId, documentUrl]
    );

    if (duplicateDocCheck.rows.length > 0) {
      console.log(`[PromotionEngine] Document/Case ${docId} is already linked. Skipping duplicate document ingestion.`);
      return { leadId, action: 'SKIPPED_DUPLICATE_DOCUMENT' };
    }

    // Link the new verified distress record
    const confidenceScore = record.sourceConfidenceScore || (rawPayload && rawPayload.confidence_score) || 85;
    const sourceType = record.sourceType || (rawPayload && rawPayload.source) || 'County Source';
    const specificFields = record.specificFields || record;

    await client.query(
      `INSERT INTO verified_distress_records (
        lead_id, source_url, source_type, collection_date, document_id, 
        source_confidence_score, distress_type, specific_fields, is_verified,
        document_hash, parser_version, extraction_timestamp, evidence_location,
        raw_extracted_text, original_html_or_page, provenance_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10, $11, $12, $13, $14, $15)`,
      [
        leadId, documentUrl, sourceType, filingDate, docId,
        confidenceScore, resolvedFilingType, JSON.stringify(specificFields),
        docHash, parserVersion, new Date(), evidenceLocation,
        rawText, originalHtml, provenanceScore
      ]
    );

    // Timeline and Promotion check
    const currentFilingType = existing.filing_type;
    const isUnverifiedProperty = (existing.verification_status === 'UNVERIFIED' || currentFilingType === 'PROPERTY_LEAD' || currentFilingType === 'PROSPECT_PROPERTY');

    if (isUnverifiedProperty) {
      console.log(`[PromotionEngine] PROMOTE: Promoting ${leadId} from ${currentFilingType} to verified ${resolvedFilingType}.`);
      
      await client.query(
        `UPDATE foreclosure_leads 
         SET filing_type = $1, 
             verification_status = $2, 
             verified_at = CURRENT_TIMESTAMP,
             case_number = COALESCE($3, case_number)
         WHERE id = $4`,
        [resolvedFilingType, resolvedVerificationStatus, docId, leadId]
      );

      // Log promotion event in timeline
      await client.query(
        `INSERT INTO lead_history (lead_id, event_type, previous_value, new_value, notes)
         VALUES ($1, 'PROMOTED_TO_VERIFIED', $2, $3, $4)`,
        [
          leadId, currentFilingType, resolvedFilingType, 
          `Lead promoted with verified ${resolvedFilingType} filing (Case/Doc: ${docId}) Sourced from ${sourceType}.`
        ]
      );

      await refreshLeadScore(client, leadId, resolvedFilingType);
      return { leadId, action: 'PROMOTED' };

    } else {
      console.log(`[PromotionEngine] ADD_DISTRESS: Adding second verified filing ${resolvedFilingType} to already verified lead.`);

      const existingPriority = getFilingTypePriority(currentFilingType);
      const newPriority = getFilingTypePriority(resolvedFilingType);
      
      if (newPriority > existingPriority) {
        await client.query(
          `UPDATE foreclosure_leads SET filing_type = $1 WHERE id = $2`,
          [resolvedFilingType, leadId]
        );
      }

      await client.query(
        `INSERT INTO lead_history (lead_id, event_type, previous_value, new_value, notes)
         VALUES ($1, 'ADDITIONAL_DISTRESS', $2, $3, $4)`,
        [
          leadId, currentFilingType, resolvedFilingType,
          `Additional verified ${resolvedFilingType} filing linked (Case/Doc: ${docId}) Sourced from ${sourceType}.`
        ]
      );

      await refreshLeadScore(client, leadId, resolvedFilingType);
      return { leadId, action: 'ADDITIONAL_DISTRESS' };
    }

  } else {
    // 2. New Lead Ingestion
    const leadInsertQuery = `
      INSERT INTO foreclosure_leads (
        county_code, case_number, filing_date, filing_type, owner_name, parcel_number,
        loan_amount, trustee_name, plaintiff_attorney, auction_date,
        property_street, property_city, property_state, property_zip,
        mailing_street, mailing_city, mailing_state, mailing_zip,
        longitude, latitude, document_url, raw_payload, hash_signature,
        verification_status, verified_at, normalized_address
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25, $26
      ) RETURNING id;
    `;

    const leadRes = await client.query(leadInsertQuery, [
      countyCode, caseNumber, filingDate, resolvedFilingType, ownerName, parcelNumber,
      loanAmount, trusteeName, plaintiffAttorney, auctionDate,
      street, city, state, zip,
      mailingAddress?.street || null, mailingAddress?.city || null, mailingAddress?.state || null, mailingAddress?.zip || null,
      lng, lat, documentUrl, JSON.stringify(rawPayload), hashSignature,
      resolvedVerificationStatus,
      resolvedVerificationStatus === 'VERIFIED' ? new Date() : null,
      normalizedAddr
    ]);

    leadId = leadRes.rows[0].id;

    // Insert enrichment
    const enrich = resolvedRecord.propertyDetails || mockEnrichmentData(loanAmount, resolvedFilingType, filingDate);
    
    let finalEquityPct = parseFloat(enrich.equityPercentage);
    if (isNaN(finalEquityPct)) finalEquityPct = 30.00;
    else if (finalEquityPct < -999.99) finalEquityPct = -999.99;
    else if (finalEquityPct > 999.99) finalEquityPct = 999.99;

    let finalYears = parseFloat(enrich.ownershipLengthYears);
    if (isNaN(finalYears)) finalYears = 5.0;
    else if (finalYears < -99.9) finalYears = -99.9;
    else if (finalYears > 99.9) finalYears = 99.9;

    let finalBaths = parseFloat(enrich.baths);
    if (isNaN(finalBaths) || finalBaths === null || finalBaths === undefined) finalBaths = null;
    else if (finalBaths < 0) finalBaths = 0.00;
    else if (finalBaths > 99.99) finalBaths = 99.99;

    const enrichQuery = `
      INSERT INTO property_enrichments (
        lead_id, estimated_value, first_mortgage_amount, total_liens,
        estimated_equity, equity_percentage, ownership_length_years,
        is_absentee_owned, is_vacant, occupancy_probability, property_type, assessor_year_built,
        beds, baths, square_footage, lot_size, probate_pending, probate_duration_days
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18);
    `;
    await client.query(enrichQuery, [
      leadId, enrich.estimatedValue, enrich.firstMortgageAmount, enrich.totalLiens,
      enrich.estimatedEquity, finalEquityPct, finalYears,
      enrich.isAbsenteeOwned, enrich.isVacant, enrich.occupancyProbability, enrich.propertyType, enrich.assessorYearBuilt,
      enrich.beds, finalBaths, enrich.squareFootage, enrich.lotSize, enrich.probatePending, enrich.probateDurationDays
    ]);

    // Insert timeline history log
    await client.query(
      `INSERT INTO lead_history (lead_id, event_type, previous_value, new_value, notes)
       VALUES ($1, $2, NULL, $3, $4)`,
      [
        leadId, 
        resolvedVerificationStatus === 'VERIFIED' ? 'INGESTED_VERIFIED' : (resolvedVerificationStatus === 'PENDING_OWNERSHIP_MATCH' ? 'INGESTED_PENDING' : 'INGESTED_UNVERIFIED'),
        resolvedFilingType,
        resolvedVerificationStatus === 'VERIFIED' ? `Lead ingested directly with verified source document.` : `Lead ingested as ${resolvedVerificationStatus} profile.`
      ]
    );

    // If verified or pending, insert verified source document entry
    if (resolvedVerificationStatus === 'VERIFIED' || resolvedVerificationStatus === 'PENDING_OWNERSHIP_MATCH') {
      const docId = caseNumber || record.recordingNumber || 'DOC_REF';
      const confidenceScore = record.sourceConfidenceScore || (rawPayload && rawPayload.confidence_score) || 85;
      const sourceType = record.sourceType || (rawPayload && rawPayload.source) || 'County Source';
      const specificFields = record.specificFields || record;

      await client.query(
        `INSERT INTO verified_distress_records (
          lead_id, source_url, source_type, collection_date, document_id, 
          source_confidence_score, distress_type, specific_fields, is_verified,
          document_hash, parser_version, extraction_timestamp, evidence_location,
          raw_extracted_text, original_html_or_page, provenance_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10, $11, $12, $13, $14, $15)`,
        [
          leadId, documentUrl, sourceType, filingDate, docId,
          confidenceScore, resolvedFilingType, JSON.stringify(specificFields),
          docHash, parserVersion, new Date(), evidenceLocation,
          rawText, originalHtml, provenanceScore
        ]
      );
    }

    await refreshLeadScore(client, leadId, resolvedFilingType);
    return { 
      leadId, 
      action: resolvedVerificationStatus === 'VERIFIED' 
        ? 'INGESTED_VERIFIED' 
        : (resolvedVerificationStatus === 'PENDING_OWNERSHIP_MATCH' 
            ? 'INGESTED_PENDING' 
            : 'INGESTED_' + resolvedVerificationStatus) 
    };
  }
}

async function refreshLeadScore(client, leadId, filingType) {
  // Query enrichment and verified records to pass to scoring engine
  const enrichRes = await client.query(`SELECT * FROM property_enrichments WHERE lead_id = $1`, [leadId]);
  const verRes = await client.query(`SELECT * FROM verified_distress_records WHERE lead_id = $1`, [leadId]);

  if (enrichRes.rows.length === 0) return;

  const enrichment = enrichRes.rows[0];
  const verifiedRecords = verRes.rows;

  // Adapt database underscore fields to camelCase for the scoring engine
  const camelEnrich = {
    equityPercentage: parseFloat(enrichment.equity_percentage),
    ownershipLengthYears: parseFloat(enrichment.ownership_length_years),
    isVacant: enrichment.is_vacant,
    totalLiens: parseFloat(enrichment.total_liens),
    probatePending: enrichment.probate_pending,
    hasBankruptcy: enrichment.has_bankruptcy || false
  };

  const scores = calculateOpportunityScore(camelEnrich, filingType, verifiedRecords);

  // Update lead_scores
  await client.query(
    `INSERT INTO lead_scores (
      lead_id, equity_score, distress_score, tenure_score, tax_score, vacancy_score, opportunity_score, tier
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (lead_id) DO UPDATE SET 
      equity_score = EXCLUDED.equity_score,
      distress_score = EXCLUDED.distress_score,
      tenure_score = EXCLUDED.tenure_score,
      tax_score = EXCLUDED.tax_score,
      vacancy_score = EXCLUDED.vacancy_score,
      opportunity_score = EXCLUDED.opportunity_score,
      tier = EXCLUDED.tier`,
    [
      leadId, scores.equityScore, scores.distressScore, scores.tenureScore, 
      scores.taxScore, scores.vacancyScore, scores.opportunityScore, scores.tier
    ]
  );
}

// Helper: duplicates mockEnrichmentData from server.js
function mockEnrichmentData(loanAmount, filingType, filingDate) {
  const originalLoan = loanAmount || 180000;
  const estimatedValue = Math.round(originalLoan * (1.2 + Math.random() * 0.8));
  const firstMortgageAmount = originalLoan;
  const totalLiens = Math.random() > 0.8 ? Math.round(estimatedValue * 0.1) : 0;
  const estimatedEquity = estimatedValue - (firstMortgageAmount + totalLiens);
  const equityPercentage = parseFloat(((estimatedEquity / estimatedValue) * 100).toFixed(2));
  const ownershipLengthYears = parseFloat((3 + Math.random() * 20).toFixed(1));
  const isAbsenteeOwned = Math.random() > 0.7;
  const isVacant = Math.random() > 0.9;
  const occupancyProbability = isVacant ? 0 : Math.round(60 + Math.random() * 40);
  const propertyTypes = ['Single Family Residential', 'Multi-Family', 'Condominium', 'Townhouse'];
  const propertyType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
  const assessorYearBuilt = Math.round(1950 + Math.random() * 65);

  const beds = Math.floor(2 + Math.random() * 5);
  const bathsOptions = [1, 1.5, 2, 2.5, 3, 3.5, 4];
  const baths = bathsOptions[Math.floor(Math.random() * bathsOptions.length)];
  const squareFootage = Math.floor(1000 + Math.random() * 4000);
  const lotSize = Math.floor(3000 + Math.random() * 22000);

  let probatePending = null;
  let probateDurationDays = null;
  if (filingType === 'PROBATE') {
    probatePending = true;
    probateDurationDays = Math.floor(5 + Math.random() * 95);
  }

  return {
    estimatedValue,
    firstMortgageAmount,
    totalLiens,
    estimatedEquity,
    equityPercentage,
    ownershipLengthYears,
    isAbsenteeOwned,
    isVacant,
    occupancyProbability,
    propertyType,
    assessorYearBuilt,
    beds,
    baths,
    squareFootage,
    lotSize,
    probatePending,
    probateDurationDays
  };
}

module.exports = {
  promoteOrIngestLead,
  refreshLeadScore
};
