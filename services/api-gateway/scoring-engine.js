/**
 * ForeclosureFinder AI — Verified Lead Scoring Engine
 */

function calculateOpportunityScore(enrichment, filingType, verifiedRecords = []) {
  const hasVerifiedRecords = verifiedRecords && verifiedRecords.length > 0;
  
  // 1. Verified Distress Status (Max 40 pts)
  let distressScore = 0;
  if (hasVerifiedRecords) {
    distressScore = 40;
  }

  // 2. Equity Score (Max 20 pts)
  let equityScore = 0;
  const equityPct = enrichment.equityPercentage || 0;
  if (equityPct >= 50) equityScore = 20;
  else if (equityPct >= 30) equityScore = 15;
  else if (equityPct >= 10) equityScore = 5;

  // 3. Tenure/Ownership Duration Score (Max 15 pts)
  let tenureScore = 0;
  const years = enrichment.ownershipLengthYears || 0;
  if (years > 15) tenureScore = 15;
  else if (years >= 7) tenureScore = 10;
  else if (years >= 3) tenureScore = 5;

  // 4. Vacancy Score (Max 10 pts)
  const vacancyScore = enrichment.isVacant ? 10 : 0;

  // 5. Tax Delinquency Score (Max 5 pts)
  const hasTaxDelinquency = (filingType === 'TAX_DELINQUENCY') || 
                            verifiedRecords.some(r => r.distress_type === 'TAX_DELINQUENCY');
  const taxScore = hasTaxDelinquency ? 5 : 0;

  // 6. Probate Status Score (Max 5 pts)
  const isProbate = (filingType === 'PROBATE' || filingType === 'PROBATE_CASE' || filingType === 'PROBATE_PROPERTY') || enrichment.probatePending ||
                    verifiedRecords.some(r => r.distress_type === 'PROBATE' || r.distress_type === 'PROBATE_CASE' || r.distress_type === 'PROBATE_PROPERTY');
  const probateScore = isProbate ? 5 : 0;

  // 7. Multiple Liens Score (Max 5 pts)
  const multipleLiensScore = (enrichment.totalLiens && enrichment.totalLiens > 0) ? 5 : 0;

  // 8. Bankruptcy Indicators Score (Max 5 pts)
  const bankruptcyScore = enrichment.hasBankruptcy ? 5 : 0;

  // Total Opportunity Score (Sum of all inputs, capped at 100)
  const opportunityScore = Math.min(
    100,
    distressScore + equityScore + tenureScore + vacancyScore + taxScore + probateScore + multipleLiensScore + bankruptcyScore
  );

  // Classify Deal Grade / Tier
  let tier = 'C';
  if (opportunityScore >= 85) tier = 'A_PLUS';
  else if (opportunityScore >= 70) tier = 'A';
  else if (opportunityScore >= 50) tier = 'B';

  // Calculate Motivation Score (0-100)
  let motivationScore = 15; // baseline
  if (hasVerifiedRecords) motivationScore += 35;
  if (hasTaxDelinquency) motivationScore += 20;
  if (isProbate) motivationScore += 15;
  if (enrichment.isVacant) motivationScore += 15;
  motivationScore = Math.min(100, motivationScore);

  // Calculate Confidence Rating (0-100)
  let confidenceRating = 0;
  if (hasVerifiedRecords) {
    const totalConfidence = verifiedRecords.reduce((sum, r) => sum + parseFloat(r.source_confidence_score || 0), 0);
    confidenceRating = Math.round(totalConfidence / verifiedRecords.length);
  } else if (filingType === 'PROPERTY_LEAD' || filingType === 'PROSPECT_PROPERTY') {
    confidenceRating = 20; // low confidence (unverified)
  }

  return {
    equityScore,
    distressScore,
    tenureScore,
    taxScore,
    vacancyScore,
    opportunityScore,
    motivationScore,
    confidenceRating,
    tier
  };
}

module.exports = {
  calculateOpportunityScore
};
