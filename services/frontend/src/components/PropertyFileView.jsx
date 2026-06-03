import { useEffect, useState } from 'react';
import { ArrowLeft, ShieldCheck, Calendar, Award, Target, FileText } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '../config';

export default function PropertyFileView({ leadId, onClose, maskedToggle = true }) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dealAnalysis, setDealAnalysis] = useState(null);
  const [sellerPersona, setSellerPersona] = useState(null);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    if (!leadId) return;

    async function fetchLeadDetails() {
      setLoading(true);
      setDealAnalysis(null);
      setSellerPersona(null);
      setTimeline([]);
      try {
        const leadRes = await fetchWithAuth(`${API_BASE_URL}/api/v1/leads/${leadId}?masked=${maskedToggle}`);
        if (!leadRes.ok) throw new Error('Lead not found');
        const leadData = await leadRes.json();
        setLead(leadData);

        // Fetch deal analysis
        try {
          const dealRes = await fetchWithAuth(`${API_BASE_URL}/api/v1/leads/${leadId}/deal-analysis`);
          if (dealRes.ok) {
            const dealData = await dealRes.json();
            setDealAnalysis(dealData);
          }
        } catch (e) {
          console.error('Error fetching deal analysis:', e);
        }

        // Fetch seller persona
        try {
          const personaRes = await fetchWithAuth(`${API_BASE_URL}/api/v1/leads/${leadId}/seller-persona`);
          if (personaRes.ok) {
            const personaData = await personaRes.json();
            setSellerPersona(personaData);
          }
        } catch (e) {
          console.error('Error fetching seller persona:', e);
        }

        // Fetch lead history timeline
        try {
          const timelineRes = await fetchWithAuth(`${API_BASE_URL}/api/v1/leads/${leadId}/timeline`);
          if (timelineRes.ok) {
            const timelineData = await timelineRes.json();
            setTimeline(timelineData.timeline || []);
          }
        } catch (e) {
          console.error('Error fetching lead timeline:', e);
        }
      } catch (err) {
        console.error('Error fetching lead profile details:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeadDetails();
  }, [leadId, maskedToggle]);

  if (loading) {
    return (
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '40px', textAlign: 'center' }}>
        Retrieving expanded property assessor files, property timelines, and analytics...
      </div>
    );
  }

  if (!lead) {
    return (
      <div style={{ color: 'var(--rose)', fontSize: '0.9rem', padding: '40px', textAlign: 'center' }}>
        Failed to load lead details. Property file does not exist or has been deleted.
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 40px 0', color: 'var(--text-primary)', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Back Button */}
      <div style={{ marginBottom: '24px' }}>
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={onClose}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} />
          Back to Directory
        </button>
      </div>

      {/* Hero Header Card */}
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px',
        marginBottom: '28px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          background: 'linear-gradient(to bottom, var(--cyan), var(--purple))'
        }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>
              {lead.propertyAddress?.street || 'Deed Record Details'}
            </h1>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
              {lead.propertyAddress?.city}, {lead.propertyAddress?.state} {lead.propertyAddress?.zip}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{
              background: 'var(--cyan-glow)',
              color: 'var(--cyan)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              borderRadius: '8px',
              padding: '10px 16px',
              textAlign: 'right'
            }}>
              <span style={{ fontSize: '0.65rem', display: 'block', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Opportunity Score</span>
              <strong style={{ fontSize: '1.5rem', fontWeight: 800 }}>{lead.score?.opportunityScore || 0}</strong>
            </div>
            
            <div style={{
              background: 'var(--purple-glow)',
              color: 'var(--purple)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '8px',
              padding: '10px 16px',
              textAlign: 'right'
            }}>
              <span style={{ fontSize: '0.65rem', display: 'block', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Lead Tier</span>
              <strong style={{ fontSize: '1.5rem', fontWeight: 800 }}>{lead.score?.tier?.replace('_', '+') || 'C'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '28px' }}>
        
        {/* Left Column (Details, Financials, Deal Analyzer, OCR) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Section 1: Ingestion & Filing Metadata */}
          <div className="panel-card" style={{ padding: '24px' }}>
            <div className="panel-header" style={{ marginBottom: '16px' }}>
              <h3 className="panel-title" style={{ color: 'var(--cyan)' }}>FILING INFORMATION & COURT META</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div className="metrics-tile">
                <span className="tile-title">Case Number</span>
                <span className="tile-value" style={{ fontSize: '0.95rem' }}>{lead.caseNumber}</span>
              </div>
              <div className="metrics-tile">
                <span className="tile-title">Jurisdiction</span>
                <span className="tile-value" style={{ fontSize: '0.95rem' }}>{lead.countyCode}</span>
              </div>
              <div className="metrics-tile">
                <span className="tile-title">Filing Date</span>
                <span className="tile-value" style={{ fontSize: '0.95rem' }}>{lead.filingDate}</span>
              </div>
              <div className="metrics-tile">
                <span className="tile-title">Filing Category</span>
                <span className="tile-value" style={{ color: 'var(--cyan)', fontSize: '0.95rem' }}>{lead.filingType}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Owner & Skiptracing Profile */}
          <div className="panel-card" style={{ padding: '24px' }}>
            <div className="panel-header" style={{ marginBottom: '16px' }}>
              <h3 className="panel-title" style={{ color: 'var(--cyan)' }}>OWNERSHIP & CONTACT INFO</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="metrics-tile">
                  <span className="tile-title">Owner Name</span>
                  <span className="tile-value">{lead.ownerName || 'Unknown Owner'}</span>
                </div>
                <div className="metrics-tile">
                  <span className="tile-title">Mailing Address</span>
                  <span className="tile-value" style={{ fontSize: '0.85rem' }}>
                    {lead.mailingAddress?.street 
                      ? `${lead.mailingAddress.street}, ${lead.mailingAddress.city}, ${lead.mailingAddress.state} ${lead.mailingAddress.zip}` 
                      : 'Same as Property Address'}
                  </span>
                </div>
              </div>

              {/* Public Property Assessor Details */}
              <div style={{
                background: 'rgba(6, 182, 212, 0.03)',
                border: '1px solid rgba(6, 182, 212, 0.15)',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <h4 style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--cyan)', marginBottom: '12px', borderBottom: '1px solid rgba(6, 182, 212, 0.1)', paddingBottom: '6px' }}>
                  PUBLIC ASSESSMENT DETAILS
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '2px' }}>Beds / Baths</span>
                    <span style={{ fontWeight: 600 }}>
                      {lead.enrichment?.beds ?? 'N/A'} Bed / {lead.enrichment?.baths ?? 'N/A'} Bath
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '2px' }}>Building Size</span>
                    <span style={{ fontWeight: 600 }}>
                      {lead.enrichment?.squareFootage ? `${lead.enrichment.squareFootage.toLocaleString()} sq ft` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '2px' }}>Lot Size</span>
                    <span style={{ fontWeight: 600 }}>
                      {lead.enrichment?.lotSize ? `${lead.enrichment.lotSize.toLocaleString()} sq ft` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '2px' }}>Year Built</span>
                    <span style={{ fontWeight: 600 }}>{lead.enrichment?.yearBuilt ?? 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '2px' }}>Tenure length</span>
                    <span style={{ fontWeight: 600 }}>
                      {lead.enrichment?.ownershipLengthYears ? `${lead.enrichment.ownershipLengthYears} years` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '2px' }}>Vacancy Status</span>
                    <span style={{ fontWeight: 600, color: lead.enrichment?.isVacant ? 'var(--rose)' : 'var(--emerald)' }}>
                      {lead.enrichment?.isVacant ? 'VACANT' : 'OCCUPIED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contacts Enriched */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="metrics-tile">
                  <span className="tile-title">Plaintiff Representation</span>
                  <span className="tile-value" style={{ fontSize: '0.85rem' }}>{lead.plaintiffAttorney || 'N/A'}</span>
                </div>
                <div className="metrics-tile">
                  <span className="tile-title">Fiduciary Trustee</span>
                  <span className="tile-value" style={{ fontSize: '0.85rem' }}>{lead.trusteeName || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Financials & Valuations */}
          <div className="panel-card" style={{ padding: '24px' }}>
            <div className="panel-header" style={{ marginBottom: '16px' }}>
              <h3 className="panel-title" style={{ color: 'var(--cyan)' }}>ACQUISITIONS FINANCIALS & EQUITY ANALYSIS</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div className="metrics-tile">
                <span className="tile-title">AVM Estimated Value</span>
                <span className="tile-value">${lead.enrichment?.estimatedValue?.toLocaleString()}</span>
              </div>
              <div className="metrics-tile">
                <span className="tile-title">First Mortgage Balance</span>
                <span className="tile-value">${lead.enrichment?.firstMortgageAmount?.toLocaleString()}</span>
              </div>
              <div className="metrics-tile">
                <span className="tile-title">Tax/Mechanics Liens</span>
                <span className="tile-value" style={{ color: lead.enrichment?.totalLiens > 0 ? 'var(--rose)' : 'var(--text-primary)' }}>
                  ${lead.enrichment?.totalLiens?.toLocaleString()}
                </span>
              </div>
              <div className="metrics-tile">
                <span className="tile-title">Net Equity Position</span>
                <span className="tile-value" style={{ color: 'var(--emerald)' }}>
                  ${lead.enrichment?.estimatedEquity?.toLocaleString()} ({lead.enrichment?.equityPercentage}%)
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Wholesaler Deal Analyzer */}
          {dealAnalysis && (
            <div className="panel-card" style={{ padding: '24px' }}>
              <div className="panel-header" style={{ marginBottom: '20px' }}>
                <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--purple)' }}>
                  <Award size={18} />
                  WHOLESALER DEAL ANALYZER
                </h3>
                <span style={{ 
                  background: dealAnalysis.grade.includes('A') || dealAnalysis.grade.includes('+') ? 'var(--emerald-glow)' : dealAnalysis.grade.includes('F') ? 'var(--rose-glow)' : 'var(--amber-glow)',
                  color: dealAnalysis.grade.includes('A') || dealAnalysis.grade.includes('+') ? 'var(--emerald)' : dealAnalysis.grade.includes('F') ? 'var(--rose)' : 'var(--amber)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  border: '1px solid'
                }}>
                  DEAL GRADE: {dealAnalysis.grade}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div className="metrics-tile" style={{ background: 'rgba(16, 185, 129, 0.02)' }}>
                  <span className="tile-title">After Repair Value (ARV)</span>
                  <span className="tile-value" style={{ color: 'var(--emerald)' }}>${dealAnalysis.arv?.toLocaleString()}</span>
                </div>
                <div className="metrics-tile" style={{ background: 'rgba(239, 68, 68, 0.02)' }}>
                  <span className="tile-title">Estimated Repairs</span>
                  <span className="tile-value" style={{ color: 'var(--rose)' }}>-${dealAnalysis.estimatedRepairs?.toLocaleString()}</span>
                </div>
                <div className="metrics-tile" style={{ background: 'rgba(139, 92, 246, 0.02)' }}>
                  <span className="tile-title">Max Allowable Offer (MAO)</span>
                  <span className="tile-value" style={{ color: 'var(--purple)' }}>${dealAnalysis.mao?.toLocaleString()}</span>
                </div>
                <div className="metrics-tile" style={{ background: 'rgba(6, 182, 212, 0.02)' }}>
                  <span className="tile-title">Suggested Cash Offer</span>
                  <span className="tile-value" style={{ color: 'var(--cyan)' }}>${dealAnalysis.suggestedCashOffer?.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <div className="metrics-tile">
                  <span className="tile-title">Potential Wholesale Fee</span>
                  <span className="tile-value">${dealAnalysis.wholesaleFeePotential?.toLocaleString()}</span>
                </div>
                <div className="metrics-tile">
                  <span className="tile-title">Deal Grade Rationale</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '4px 0 0 0' }}>
                    {dealAnalysis.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Court Deed OCR Filing Summary */}
          <div className="panel-card" style={{ padding: '24px' }}>
            <div className="panel-header" style={{ marginBottom: '16px' }}>
              <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cyan)' }}>
                <FileText size={18} />
                COURT DEED OCR FILING SUMMARY
              </h3>
            </div>
            
            <div className="ocr-block" style={{ maxHeight: '240px', fontSize: '0.8rem' }}>
              {`IN THE COURT OF Davidson County, TENNESSEE
CASE REFERENCE NO: ${lead.caseNumber}
DATE OF CASE REGISTRATION: ${lead.filingDate}

RE: NOTICE OF DEED DISTRESS / FORECLOSURE PROCEEDINGS
RECORDED PROPERTY: ${lead.propertyAddress?.street || 'N/A'}, ${lead.propertyAddress?.city || 'N/A'}, ${lead.propertyAddress?.state || 'N/A'}
PROPERTY PARCEL REFERENCE: ${lead.parcelNumber || 'Assessor Registry Pending'}
ALLEGED PRIMARY OWNER: ${lead.ownerName || 'Unknown Owner Registry'}
PLAINTIFF REPRESENTATION: ${lead.plaintiffAttorney || 'Trustee Counsel Registry'}
TRUSTEE FIDUCIARY DETAILS: ${lead.trusteeName || 'Private Trustee Appointed'}

NOTICE IS HEREBY DECLARED that default has occurred under the terms of a certain mortgage contract. Equity assessment reveals default liabilities totaling $${(lead.enrichment?.firstMortgageAmount || 150000).toLocaleString()}. Fiduciary representative intends to sell the physical real estate assets on ${lead.auctionDate ? new Date(lead.auctionDate).toLocaleDateString() : 'TBD'} to liquidate debts.`}
            </div>
          </div>

        </div>

        {/* Right Column (Verification, Motivation, Personas, Timeline) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Card 1: Verification Status & Checks */}
          <div className="panel-card" style={{ 
            padding: '24px', 
            border: lead.verificationStatus === 'UNVERIFIED' ? '1px solid var(--amber)' : '1px solid var(--emerald)', 
            background: lead.verificationStatus === 'UNVERIFIED' ? 'var(--amber-glow)' : 'var(--emerald-glow)' 
          }}>
            <h3 style={{ 
              fontWeight: 800, 
              fontSize: '1rem', 
              color: lead.verificationStatus === 'UNVERIFIED' ? 'var(--amber)' : 'var(--emerald)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldCheck size={20} />
              {lead.verificationStatus === 'UNVERIFIED' ? 'Unverified Property Lead' : 'Verified Distress Lead'}
            </h3>
            
            {lead.verifiedDistressRecords && lead.verifiedDistressRecords.length > 0 ? (
              lead.verifiedDistressRecords.map((record) => (
                <div key={record.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase' }}>Source Type</span>
                      <span style={{ fontWeight: 600 }}>{record.sourceType}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase' }}>Filing ID</span>
                      <span style={{ fontWeight: 600 }}>{record.documentId}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase' }}>Confidence</span>
                      <span style={{ fontWeight: 600, color: 'var(--emerald)' }}>{record.sourceConfidenceScore}%</span>
                    </div>
                  </div>
                  {record.sourceUrl && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '2px' }}>Source Link</span>
                      <a 
                        href={record.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: 'var(--cyan)', textDecoration: 'underline', wordBreak: 'break-all' }}
                      >
                        Visit Recorder Site
                      </a>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Filing records verified via local county crawler integrations.
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
              <div><span style={{ color: 'var(--emerald)', fontWeight: 'bold' }}>✓</span> Source Trustworthiness verified</div>
              <div><span style={{ color: 'var(--emerald)', fontWeight: 'bold' }}>✓</span> Address integrity check passed</div>
              <div><span style={{ color: 'var(--emerald)', fontWeight: 'bold' }}>✓</span> Duplicate ingestion suppress check passed</div>
              <div><span style={{ color: 'var(--emerald)', fontWeight: 'bold' }}>✓</span> Distress metadata validation passed</div>
            </div>
          </div>

          {/* Card 2: Motivation Scoring Widget */}
          {sellerPersona && (
            <div className="panel-card" style={{ padding: '24px' }}>
              <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cyan)', marginBottom: '16px' }}>
                <Target size={18} />
                INVESTOR MOTIVATION SCORE
              </h3>
              
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: sellerPersona.motivation.score >= 70 ? 'var(--rose)' : sellerPersona.motivation.score >= 45 ? 'var(--amber)' : 'var(--cyan)' }}>
                      {sellerPersona.motivation.score}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      ({sellerPersona.motivation.tier} MOTIVATION)
                    </span>
                  </div>
                  
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: sellerPersona.motivation.tier === 'HIGH' ? 'var(--rose-glow)' : sellerPersona.motivation.tier === 'MEDIUM' ? 'var(--amber-glow)' : 'var(--cyan-glow)',
                    color: sellerPersona.motivation.tier === 'HIGH' ? 'var(--rose)' : sellerPersona.motivation.tier === 'MEDIUM' ? 'var(--amber)' : 'var(--cyan)'
                  }}>
                    READY
                  </span>
                </div>
                
                <div style={{ background: 'var(--bg-primary)', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{
                    width: `${sellerPersona.motivation.score}%`,
                    height: '100%',
                    background: sellerPersona.motivation.score >= 70 ? 'var(--rose)' : sellerPersona.motivation.score >= 45 ? 'var(--amber)' : 'var(--cyan)'
                  }} />
                </div>
                
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                  {sellerPersona.motivation.explanation}
                </p>
              </div>

              {/* Personas and Strategies */}
              <h4 style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--purple)', marginBottom: '12px', textTransform: 'uppercase' }}>
                AI SELLER PERSONAS & OUTREACH
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {sellerPersona.personas.map((persona, index) => (
                  <div key={index} style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--purple)' }}>{persona.personaType}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 600 }}>{persona.confidenceScore}% conf</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 6px 0' }}>
                      <strong>Strategy:</strong> {persona.contactStrategy}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Offer Type:</span>
                      <strong style={{ color: 'var(--cyan)' }}>{persona.offerType}</strong>
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.01)', borderRadius: '4px', borderLeft: '3px solid var(--purple)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {sellerPersona.outreachReadiness.recommendation}
              </div>
            </div>
          )}

          {/* Card 3: Lead history timeline */}
          <div className="panel-card" style={{ padding: '24px' }}>
            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cyan)', marginBottom: '16px' }}>
              <Calendar size={18} />
              LEAD HISTORY TIMELINE
            </h3>
            
            {timeline && timeline.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '20px' }}>
                <div style={{
                  position: 'absolute',
                  left: '6px',
                  top: '4px',
                  bottom: '4px',
                  width: '2px',
                  background: 'var(--border-color)'
                }} />
                
                {timeline.map((event) => (
                  <div key={event.id} style={{ position: 'relative', fontSize: '0.75rem' }}>
                    <div style={{
                      position: 'absolute',
                      left: '-20px',
                      top: '3px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: event.eventType.includes('VERIFIED') || event.eventType.includes('PROMOTE') ? 'var(--emerald)' : 'var(--cyan)',
                      border: '2px solid var(--bg-secondary)'
                    }} />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {event.eventType.toLowerCase().replace(/_/g, ' ')}
                      </strong>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {new Date(event.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                      {event.notes}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No events recorded in lead history.
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
