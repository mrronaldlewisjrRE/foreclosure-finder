/**
 * ForeclosureFinder AI — Ingestion Validation Framework
 * Validates distress filings against strict data requirements.
 */

const crypto = require('crypto');

function validateSource(record) {
  const sourceUrl = record.documentUrl || record.sourceUrl;
  const sourceType = record.sourceType || (record.rawPayload && record.rawPayload.source);
  const confidenceScore = record.sourceConfidenceScore || (record.rawPayload && record.rawPayload.confidence_score) || 75;

  if (!sourceUrl || sourceUrl.trim() === '') {
    return { valid: false, reason: 'Missing source document URL' };
  }
  if (!sourceType || sourceType.trim() === '') {
    return { valid: false, reason: 'Missing source type classification' };
  }
  if (confidenceScore === undefined || isNaN(confidenceScore) || confidenceScore < 50) {
    return { valid: false, reason: `Confidence score too low or missing: ${confidenceScore}` };
  }
  return { valid: true };
}

function validateAddress(record) {
  if (record.filingType === 'PROBATE_CASE') {
    return { valid: true };
  }
  const addr = record.propertyAddress;
  if (!addr) {
    return { valid: false, reason: 'Missing propertyAddress block' };
  }
  if (!addr.street || addr.street.trim() === '') {
    return { valid: false, reason: 'Missing street address' };
  }
  if (!addr.city || addr.city.trim() === '') {
    return { valid: false, reason: 'Missing city' };
  }
  if (!addr.state || addr.state.trim() === '') {
    return { valid: false, reason: 'Missing state' };
  }
  if (record.filingType !== 'TAX_DELINQUENCY') {
    if (!addr.zip || addr.zip.trim() === '') {
      return { valid: false, reason: 'Missing zip code' };
    }
  }
  return { valid: true };
}

function validateFilingDate(record) {
  const dateStr = record.filingDate || record.recordingDate || record.saleDate || record.delinquencyDate;
  if (!dateStr) {
    return { valid: false, reason: 'Missing filing/recording date' };
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { valid: false, reason: `Invalid filing date format: ${dateStr}` };
  }
  const now = new Date();
  if (date > now) {
    return { valid: false, reason: `Filing date is in the future: ${dateStr}` };
  }
  return { valid: true };
}

function validateCaseSpecifics(record) {
  const type = record.filingType;
  const specifics = record.specificFields || record;

  if (!type) {
    return { valid: false, reason: 'Missing filing type classification' };
  }

  switch (type) {
    case 'NOTICE_OF_DEFAULT':
      if (!specifics.recordingNumber || specifics.recordingNumber.trim() === '') {
        return { valid: false, reason: 'NOTICE_OF_DEFAULT: Missing recordingNumber' };
      }
      if (!specifics.recordingDate) {
        return { valid: false, reason: 'NOTICE_OF_DEFAULT: Missing recordingDate' };
      }
      if (!specifics.trustee || specifics.trustee.trim() === '') {
        return { valid: false, reason: 'NOTICE_OF_DEFAULT: Missing trustee' };
      }
      if (specifics.loanAmount === undefined || isNaN(specifics.loanAmount)) {
        return { valid: false, reason: 'NOTICE_OF_DEFAULT: Missing loanAmount' };
      }
      break;

    case 'LIS_PENDENS':
      if (!specifics.caseNumber && !record.caseNumber) {
        return { valid: false, reason: 'LIS_PENDENS: Missing courtCaseNumber / caseNumber' };
      }
      if (!specifics.filingDate && !record.filingDate) {
        return { valid: false, reason: 'LIS_PENDENS: Missing filingDate' };
      }
      if (!specifics.plaintiff || specifics.plaintiff.trim() === '') {
        return { valid: false, reason: 'LIS_PENDENS: Missing plaintiff' };
      }
      if (!specifics.defendant || specifics.defendant.trim() === '') {
        return { valid: false, reason: 'LIS_PENDENS: Missing defendant' };
      }
      if (!specifics.courtName || specifics.courtName.trim() === '') {
        return { valid: false, reason: 'LIS_PENDENS: Missing courtName' };
      }
      break;

    case 'SHERIFF_SALE':
      if (!specifics.auctionDate && !record.auctionDate) {
        return { valid: false, reason: 'SHERIFF_SALE: Missing auctionDate' };
      }
      if (!specifics.auctionId && !record.caseNumber) {
        return { valid: false, reason: 'SHERIFF_SALE: Missing auctionId' };
      }
      if (specifics.openingBid === undefined || isNaN(specifics.openingBid)) {
        return { valid: false, reason: 'SHERIFF_SALE: Missing openingBid' };
      }
      break;

    case 'TRUSTEE_SALE':
      if (!specifics.saleDate && !record.auctionDate) {
        return { valid: false, reason: 'TRUSTEE_SALE: Missing saleDate' };
      }
      if (!specifics.trusteeName && !record.trusteeName) {
        return { valid: false, reason: 'TRUSTEE_SALE: Missing trusteeName' };
      }
      if (!specifics.recordingNumber && !record.caseNumber) {
        return { valid: false, reason: 'TRUSTEE_SALE: Missing recordingNumber' };
      }
      break;

    case 'TAX_DELINQUENCY':
      if (specifics.taxAmountDue === undefined || isNaN(specifics.taxAmountDue)) {
        return { valid: false, reason: 'TAX_DELINQUENCY: Missing taxAmountDue' };
      }
      if (!specifics.taxYear) {
        return { valid: false, reason: 'TAX_DELINQUENCY: Missing taxYear' };
      }
      if (!specifics.delinquencyDate) {
        return { valid: false, reason: 'TAX_DELINQUENCY: Missing delinquencyDate' };
      }
      break;

    case 'PROBATE':
    case 'PROBATE_CASE':
    case 'PROBATE_PROPERTY':
      if (!specifics.probateCaseNumber && !record.caseNumber) {
        return { valid: false, reason: `${type}: Missing probateCaseNumber` };
      }
      if (!specifics.filingDate && !record.filingDate) {
        return { valid: false, reason: `${type}: Missing filingDate` };
      }
      if (!specifics.estateName || specifics.estateName.trim() === '') {
        return { valid: false, reason: `${type}: Missing estateName` };
      }
      if (!specifics.executor || specifics.executor.trim() === '') {
        return { valid: false, reason: `${type}: Missing executor` };
      }
      break;

    case 'PROPERTY_LEAD':
    case 'PROSPECT_PROPERTY':
      // Basic property lead, doesn't require specific distress dockets
      return { valid: true };

    default:
      return { valid: false, reason: `Unknown distress category: ${type}` };
  }

  return { valid: true };
}

/**
 * Validates a single distress record.
 * Returns { valid: boolean, errors: string[] }
 */
function validateRecord(record, countyCode) {
  const errors = [];

  const resolvedCounty = countyCode || record.countyCode || record.county_code;
  if (!resolvedCounty || resolvedCounty.trim() === '') {
    errors.push('Missing county code registry');
  }

  const sourceCheck = validateSource(record);
  if (!sourceCheck.valid) errors.push(sourceCheck.reason);

  const addressCheck = validateAddress(record);
  if (!addressCheck.valid) errors.push(addressCheck.reason);

  const dateCheck = validateFilingDate(record);
  if (!dateCheck.valid) errors.push(dateCheck.reason);

  const caseCheck = validateCaseSpecifics(record);
  if (!caseCheck.valid) errors.push(caseCheck.reason);

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateRecord
};
