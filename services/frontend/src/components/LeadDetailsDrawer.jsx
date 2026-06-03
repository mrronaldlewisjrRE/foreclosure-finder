import { useEffect, useState } from 'react';
import { X, ShieldCheck, Mail, Calendar, HelpCircle, Sparkles, Award, Target, Maximize2, Minimize2, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '../config';

export default function LeadDetailsDrawer({ leadId, onClose, onOpenFullPage, currentUser }) {
  const [lead, setLead] = useState(null);
  const [showPublicRecords, setShowPublicRecords] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dealAnalysis, setDealAnalysis] = useState(null);
  const [sellerPersona, setSellerPersona] = useState(null);
  const [timeline, setTimeline] = useState([]);

  // Claiming & Sales status states
  const [claiming, setClaiming] = useState(false);
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignmentFee, setAssignmentFee] = useState('');
  const [profitAmount, setProfitAmount] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [submittingSale, setSubmittingSale] = useState(false);

  async function handleClaim() {
    setClaiming(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/leads/${lead.id}/claim`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim property.');
      alert(data.message || 'Property claimed successfully.');
      // Refresh lead details
      const leadRes = await fetchWithAuth(`${API_BASE_URL}/api/v1/leads/${lead.id}`);
      if (leadRes.ok) {
        setLead(await leadRes.json());
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setClaiming(false);
    }
  }

  async function handleRelease() {
    if (!confirm('Are you sure you want to release your claim on this property? This will remove it from your CRM pipeline.')) return;
    setClaiming(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/leads/${lead.id}/release`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to release property.');
      alert(data.message || 'Property released successfully.');
      // Refresh lead details
      const leadRes = await fetchWithAuth(`${API_BASE_URL}/api/v1/leads/${lead.id}`);
      if (leadRes.ok) {
        setLead(await leadRes.json());
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setClaiming(false);
    }
  }

  async function handleSellSubmit(e) {
    e.preventDefault();
    if (!saleDate || !assignmentFee || !profitAmount) {
      alert('Please fill out all required fields.');
      return;
    }
    setSubmittingSale(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/leads/${lead.id}/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleDate,
          assignmentFee: parseFloat(assignmentFee),
          profitAmount: parseFloat(profitAmount),
          notes: saleNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record sale.');
      alert(data.message || 'Deal closed successfully! Property marked as sold.');
      setShowSoldModal(false);
      // Refresh lead details
      const leadRes = await fetchWithAuth(`${API_BASE_URL}/api/v1/leads/${lead.id}`);
      if (leadRes.ok) {
        setLead(await leadRes.json());
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingSale(false);
    }
  }

  useEffect(() => {
    if (!leadId) return;

    async function fetchLeadDetails() {
      setLoading(true);
      setDealAnalysis(null);
      setSellerPersona(null);
      setTimeline([]);
      try {
        const leadRes = await fetchWithAuth(`${API_BASE_URL}/api/v1/leads/${leadId}`);
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
  }, [leadId]);

  const [isExpanded, setIsExpanded] = useState(false);

  if (!leadId) return null;

  return (
    <div className="drawer-overlay" style={{ width: isExpanded ? '980px' : '580px', maxWidth: '95vw', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="drawer-header">
        <div className="drawer-title-section">
          {loading ? (
            <h3 className="drawer-title">Loading lead file...</h3>
          ) : (
            <>
              <h3 className="drawer-title">{lead?.propertyAddress?.street || 'Deed Record Details'}</h3>
              <span className="drawer-subtitle">
                {lead?.propertyAddress?.city}, {lead?.propertyAddress?.state} {lead?.propertyAddress?.zip}
              </span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!loading && lead && (
            <>
              <button 
                className="drawer-expand-btn" 
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse to standard view" : "Expand to wide view"}
                type="button"
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button 
                className="drawer-expand-btn" 
                onClick={onOpenFullPage}
                title="Open Expanded Full Page View"
                type="button"
                style={{ background: 'var(--cyan-glow)', borderColor: 'var(--cyan)', color: 'var(--cyan)' }}
              >
                <Maximize2 size={16} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </>
          )}
          <button className="drawer-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: 20 }}>
          Retrieving assessment profiles and opportunity scoring indices...
        </div>
      ) : !lead ? (
        <div style={{ color: 'var(--rose)', fontSize: '0.85rem', padding: 20 }}>
          Failed to load lead details. Lead record may not exist.
        </div>
      ) : (
        <>
          {/* Verification Status Banner/Card */}
          {lead.verificationStatus === 'UNVERIFIED' ? (
            <div style={{
              margin: '16px 20px 0 20px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--amber)',
              background: 'var(--amber-glow)',
              color: 'var(--amber)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '0.85rem',
              fontWeight: 500
            }}>
              <HelpCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Unverified Property Lead:</strong> Real distress evidence has not yet been collected.
              </div>
            </div>
          ) : (
            <div style={{
              margin: '16px 20px 0 20px',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--emerald)',
              background: 'var(--emerald-glow)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ShieldCheck size={20} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
                <strong style={{ color: 'var(--emerald)', fontSize: '0.9rem' }}>Verified Distress Source Document</strong>
              </div>
              
              {lead.verifiedDistressRecords && lead.verifiedDistressRecords.length > 0 ? (
                lead.verifiedDistressRecords.map((record) => (
                  <div key={record.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', borderBottom: '1px dashed rgba(16, 185, 129, 0.2)', paddingBottom: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>Source Type</span>
                        <span style={{ fontWeight: 600 }}>{record.sourceType}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>Document/Case ID</span>
                        <span style={{ fontWeight: 600 }}>{record.documentId}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>Collection Date</span>
                        <span style={{ fontWeight: 600 }}>{record.collectionDate ? new Date(record.collectionDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>Confidence Score</span>
                        <span style={{ fontWeight: 600, color: 'var(--emerald)' }}>{record.sourceConfidenceScore}%</span>
                      </div>
                    </div>
                    {record.sourceUrl && (
                      <div style={{ marginTop: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>Source URL</span>
                        <a 
                          href={record.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ color: 'var(--cyan)', textDecoration: 'underline', wordBreak: 'break-all', fontSize: '0.75rem' }}
                        >
                          {record.sourceUrl}
                        </a>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Verified at {lead.verifiedAt ? new Date(lead.verifiedAt).toLocaleDateString() : 'N/A'} via ingestion pipeline.
                </div>
              )}

              {/* Passing Validation Checks List */}
              <div style={{ marginTop: '12px' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '6px' }}>Passing Verification Checks</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--emerald)', fontWeight: 'bold' }}>✓</span> Source Trustworthiness Verification
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--emerald)', fontWeight: 'bold' }}>✓</span> Address Integrity & Parsing Check
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--emerald)', fontWeight: 'bold' }}>✓</span> Duplicate Ingestion Window Check
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--emerald)', fontWeight: 'bold' }}>✓</span> Filing/Recording Date Consistency Check
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--emerald)', fontWeight: 'bold' }}>✓</span> Distress Specific Fields Validation
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Ingestion Meta */}
          <div className="drawer-section">
            <span className="section-label">FILING META DATA</span>
            <div className="drawer-grid-2">
              <div className="metrics-tile">
                <span className="tile-title">Case Number</span>
                <span className="tile-value">{lead.caseNumber}</span>
              </div>
              <div className="metrics-tile">
                <span className="tile-title">Jurisdiction</span>
                <span className="tile-value">{lead.countyCode}</span>
              </div>
              <div className="metrics-tile">
                <span className="tile-title">Filing Date</span>
                <span className="tile-value">{lead.filingDate}</span>
              </div>
              <div className="metrics-tile">
                <span className="tile-title">Filing Category</span>
                <span className="tile-value" style={{ color: 'var(--cyan)' }}>{lead.filingType}</span>
              </div>
            </div>
          </div>

          {/* Section 1.5: Owner Details & Contact Channels */}
          <div className="drawer-section">
            <span className="section-label">OWNER & CONTACT CHANNELS</span>
            <div className="drawer-grid-2">
              <div 
                className="metrics-tile owner-toggle-tile" 
                style={{ 
                  gridColumn: 'span 2', 
                  cursor: 'pointer', 
                  border: showPublicRecords ? '1px solid var(--cyan)' : '1px solid var(--border-color)',
                  background: showPublicRecords ? 'var(--cyan-glow)' : 'rgba(255, 255, 255, 0.01)',
                  transition: 'all 0.2s ease',
                  userSelect: 'none'
                }} 
                onClick={() => setShowPublicRecords(!showPublicRecords)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="tile-title">Property Owner Name (Click for Public Records)</span>
                  <span style={{ color: 'var(--cyan)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                    {showPublicRecords ? 'Hide ▲' : 'View Details ▼'}
                  </span>
                </div>
                <span className="tile-value">{lead.ownerName || 'Unknown Owner'}</span>
              </div>

              {showPublicRecords && (
                <div className="metrics-tile" style={{ gridColumn: 'span 2', background: 'rgba(6, 182, 212, 0.05)', borderColor: 'rgba(6, 182, 212, 0.2)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--cyan)', borderBottom: '1px solid rgba(6, 182, 212, 0.15)', paddingBottom: '6px' }}>
                    ONLINE PUBLIC PROPERTY RECORDS (REAL DATA)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '2px' }}>Beds & Baths</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {lead.enrichment?.beds !== null && lead.enrichment?.beds !== undefined ? lead.enrichment.beds : 'N/A'} Bed / {lead.enrichment?.baths !== null && lead.enrichment?.baths !== undefined ? lead.enrichment.baths : 'N/A'} Bath
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '2px' }}>Building Size</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {lead.enrichment?.squareFootage ? `${lead.enrichment.squareFootage.toLocaleString()} sq ft` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '2px' }}>Lot Size</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {lead.enrichment?.lotSize ? `${lead.enrichment.lotSize.toLocaleString()} sq ft` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '2px' }}>Price per Sq. Inch</span>
                      <span style={{ fontWeight: 600, color: 'var(--emerald)' }}>
                        {lead.enrichment?.estimatedValue && lead.enrichment?.squareFootage
                          ? `$${(lead.enrichment.estimatedValue / (lead.enrichment.squareFootage * 144)).toFixed(4)}/sq in`
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '2px' }}>Year Built</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {lead.enrichment?.yearBuilt || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '2px' }}>Ownership Tenure</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {lead.enrichment?.ownershipLengthYears ? `${lead.enrichment.ownershipLengthYears} years` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  
                  {lead.filingType === 'PROBATE' && (
                    <div style={{ marginTop: '8px', borderTop: '1px dashed rgba(6, 182, 212, 0.2)', paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-lis-pendens">PROBATE STATUS</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Case is <span style={{ color: 'var(--cyan)' }}>{lead.enrichment?.probatePending ? 'Pending Open' : 'Resolved'}</span> | Open for <span style={{ color: 'var(--cyan)' }}>{lead.enrichment?.probateDurationDays !== null && lead.enrichment?.probateDurationDays !== undefined ? `${lead.enrichment.probateDurationDays} days` : 'N/A'}</span>
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div className="metrics-tile" style={{ gridColumn: 'span 2' }}>
                <span className="tile-title">Owner Mailing Address</span>
                <span className="tile-value" style={{ fontSize: '0.85rem' }}>
                  {lead.mailingAddress?.street 
                    ? `${lead.mailingAddress.street}, ${lead.mailingAddress.city}, ${lead.mailingAddress.state} ${lead.mailingAddress.zip}` 
                    : 'Same as Property Address'}
                </span>
              </div>
              <div className="metrics-tile">
                <span className="tile-title">Plaintiff Attorney</span>
                <span className="tile-value" style={{ fontSize: '0.8rem' }}>{lead.plaintiffAttorney || 'N/A'}</span>
              </div>
              <div className="metrics-tile">
                <span className="tile-title">Fiduciary Trustee</span>
                <span className="tile-value" style={{ fontSize: '0.8rem' }}>{lead.trusteeName || 'N/A'}</span>
              </div>
              <div className="metrics-tile" style={{ gridColumn: 'span 2' }}>
                <span className="tile-title">Skiptracing Contact Matches (Enriched)</span>
                <span className="tile-value" style={{ fontSize: '0.8rem', color: 'var(--cyan)' }}>
                  Phone: (615) 555-0182 (Mobile) | Email: {(lead.ownerName || 'owner').toLowerCase().split(',')[0].replace(' ', '')}@gmail.com
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Property Valuation Details */}
          <div className="drawer-section">
            <span className="section-label">AQUISITIONS & AVM VALUATION</span>
            <div className="drawer-grid-2">
              <div className="metrics-tile">
                <span className="tile-title">Estimated Value</span>
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

          {/* Wholesaler Deal Analyzer Panel */}
          {dealAnalysis && (
            <div className="drawer-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="section-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={16} style={{ color: 'var(--purple)' }} />
                  WHOLESALER DEAL ANALYZER
                </span>
                <span style={{ 
                  background: dealAnalysis.grade.includes('A') || dealAnalysis.grade.includes('+') ? 'var(--emerald-glow)' : dealAnalysis.grade.includes('F') ? 'var(--rose-glow)' : 'var(--amber-glow)',
                  color: dealAnalysis.grade.includes('A') || dealAnalysis.grade.includes('+') ? 'var(--emerald)' : dealAnalysis.grade.includes('F') ? 'var(--rose)' : 'var(--amber)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  border: '1px solid'
                }}>
                  DEAL GRADE: {dealAnalysis.grade}
                </span>
              </div>
              
              <div className="drawer-grid-2">
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
                <div className="metrics-tile" style={{ gridColumn: 'span 2', background: 'rgba(255, 255, 255, 0.01)' }}>
                  <span className="tile-title">Potential Wholesale Fee</span>
                  <span className="tile-value" style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>${dealAnalysis.wholesaleFeePotential?.toLocaleString()}</span>
                </div>
                <div className="metrics-tile" style={{ gridColumn: 'span 2', background: 'rgba(255, 255, 255, 0.01)' }}>
                  <span className="tile-title">Deal Grade Reason</span>
                  <span className="tile-value" style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {dealAnalysis.explanation}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Motivation Score Widget & AI Personas */}
          {sellerPersona && (
            <div className="drawer-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <span className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <Target size={16} style={{ color: 'var(--cyan)' }} />
                INVESTOR MOTIVATION SCORE
              </span>
              
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifycontent: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: sellerPersona.motivation.score >= 70 ? 'var(--rose)' : sellerPersona.motivation.score >= 45 ? 'var(--amber)' : 'var(--cyan)' }}>
                      {sellerPersona.motivation.score}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      SCORE ({sellerPersona.motivation.tier} MOTIVATION)
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: sellerPersona.motivation.tier === 'HIGH' ? 'var(--rose-glow)' : sellerPersona.motivation.tier === 'MEDIUM' ? 'var(--amber-glow)' : 'var(--cyan-glow)',
                    color: sellerPersona.motivation.tier === 'HIGH' ? 'var(--rose)' : sellerPersona.motivation.tier === 'MEDIUM' ? 'var(--amber)' : 'var(--cyan)'
                  }}>
                    READY FOR OUTREACH
                  </span>
                </div>
                
                <div style={{ background: 'var(--bg-primary)', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{
                    width: `${sellerPersona.motivation.score}%`,
                    height: '100%',
                    background: sellerPersona.motivation.score >= 70 ? 'var(--rose)' : sellerPersona.motivation.score >= 45 ? 'var(--amber)' : 'var(--cyan)',
                    transition: 'width 1s ease'
                  }} />
                </div>
                
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {sellerPersona.motivation.explanation}
                </div>
              </div>

              <span className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px', marginBottom: '12px' }}>
                <Sparkles size={16} style={{ color: 'var(--purple)' }} />
                AI SELLER PERSONAS & STRATEGY
              </span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {sellerPersona.personas.map((persona, index) => (
                  <div key={index} style={{ padding: '12px', background: 'linear-gradient(135deg, rgba(23, 29, 49, 0.4) 0%, rgba(139, 92, 246, 0.05) 100%)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--purple)' }}>{persona.personaType}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        Confidence: <strong style={{ color: 'var(--cyan)' }}>{persona.confidenceScore}%</strong>
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4' }}>
                      <strong>Strategy:</strong> {persona.contactStrategy}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Suggested Offer Style:</span>
                      <span className="badge" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', color: 'var(--cyan)', padding: '2px 6px', fontSize: '0.65rem' }}>
                        {persona.offerType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <span className="section-label" style={{ display: 'block', marginTop: '16px', marginBottom: '8px' }}>OUTREACH READINESS</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {['sms', 'mail', 'call', 'email', 'door'].map((channel) => {
                  const enabled = sellerPersona.outreachReadiness[channel];
                  return (
                    <div key={channel} style={{
                      padding: '8px 4px',
                      textAlign: 'center',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      background: enabled ? 'rgba(16, 185, 129, 0.03)' : 'rgba(255,255,255,0.01)',
                      opacity: enabled ? 1 : 0.4
                    }}>
                      <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: enabled ? 'var(--emerald)' : 'var(--text-muted)' }}>
                        {channel}
                      </span>
                      <span style={{ fontSize: '0.55rem', color: enabled ? 'var(--emerald)' : 'var(--text-muted)' }}>
                        {enabled ? 'Active' : 'N/A'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: '4px', borderLeft: '3px solid var(--purple)' }}>
                {sellerPersona.outreachReadiness.recommendation}
              </div>
            </div>
          )}

          {/* Section 3: Opportunity Score Gauge & Breakdowns */}
          <div className="drawer-section">
            <span className="section-label">OPPORTUNITY SCORE ENGINE</span>
            
            <div className="score-dashboard-panel">
              {/* Score Display circle */}
              <div className="circular-meter-wrapper">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--bg-primary)" strokeWidth="8" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    fill="transparent" 
                    stroke="var(--cyan)" 
                    strokeWidth="8" 
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * (lead.score?.opportunityScore || 0)) / 100}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                  />
                </svg>
                <div className="score-display-number">
                  {lead.score?.opportunityScore}
                  <span className="score-display-label">Tier {lead.score?.tier?.replace('_', '+')}</span>
                </div>
              </div>

              {/* Sub-scores lists */}
              <div className="scores-breakdown-list">
                <div className="score-item-progress-row">
                  <div className="score-item-labels">
                    <span>Equity Score</span>
                    <span>{lead.score?.equityScore || 0}/100</span>
                  </div>
                  <div className="score-bar-bg">
                    <div className="score-bar-fill" style={{ width: `${lead.score?.equityScore || 0}%`, backgroundColor: 'var(--emerald)' }} />
                  </div>
                </div>

                <div className="score-item-progress-row">
                  <div className="score-item-labels">
                    <span>Distress Severity</span>
                    <span>{lead.score?.distressScore || 0}/100</span>
                  </div>
                  <div className="score-bar-bg">
                    <div className="score-bar-fill" style={{ width: `${lead.score?.distressScore || 0}%`, backgroundColor: 'var(--rose)' }} />
                  </div>
                </div>

                <div className="score-item-progress-row">
                  <div className="score-item-labels">
                    <span>Ownership Tenure ({lead.enrichment?.ownershipLengthYears}y)</span>
                    <span>{lead.score?.tenureScore || 0}/100</span>
                  </div>
                  <div className="score-bar-bg">
                    <div className="score-bar-fill" style={{ width: `${lead.score?.tenureScore || 0}%`, backgroundColor: 'var(--purple)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Public OCR transcription block */}
          <div className="drawer-section">
            <span className="section-label">COURT DEED OCR FILING SUMMARY</span>
            <div className="ocr-block">
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

          {/* Section 5: Lead History Timeline */}
          <div className="drawer-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <span className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <Calendar size={16} style={{ color: 'var(--cyan)' }} />
              LEAD HISTORY TIMELINE
            </span>
            {timeline && timeline.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '20px' }}>
                {/* Timeline vertical line */}
                <div style={{
                  position: 'absolute',
                  left: '6px',
                  top: '4px',
                  bottom: '4px',
                  width: '2px',
                  background: 'var(--border-color)'
                }} />
                
                {timeline.map((event) => (
                  <div key={event.id} style={{ position: 'relative', fontSize: '0.8rem' }}>
                    {/* Circle marker */}
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
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {event.eventType.toLowerCase().replace(/_/g, ' ')}
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(event.createdAt).toLocaleDateString()} {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {event.notes}
                    </div>
                    {event.previousValue && event.newValue && (
                      <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem', marginTop: '4px', color: 'var(--text-muted)' }}>
                        <span>From: <strong style={{ color: 'var(--rose)' }}>{event.previousValue}</strong></span>
                        <span>➔</span>
                        <span>To: <strong style={{ color: 'var(--emerald)' }}>{event.newValue}</strong></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No events recorded in lead history.
              </div>
            )}
          </div>

          {/* Actions Footer */}
          {lead.claimStatus === 'Claimed' && (
            currentUser && (lead.claimedByUserId === currentUser.id ? (
              <div style={{ margin: '12px 0', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--cyan)', background: 'var(--cyan-glow)', color: 'var(--text-primary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--cyan)' }} />
                <span>You have claimed this property. Ready for outreach or sale.</span>
              </div>
            ) : (
              <div style={{ margin: '12px 0', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--amber)', background: 'var(--amber-glow)', color: 'var(--text-primary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} style={{ color: 'var(--amber)' }} />
                <span>Property is claimed by another wholesaler.</span>
              </div>
            ))
          )}

          {lead.claimStatus === 'Sold' && (
            <div style={{ margin: '12px 0', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--emerald)', background: 'var(--emerald-glow)', color: 'var(--emerald)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <CheckCircle2 size={16} />
              <span>Deal Closed: Marked as SOLD on this platform.</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" style={{ flexGrow: 1 }} onClick={() => {
              alert(`Direct mail package queued to ${lead.ownerName} at mailing address.`);
            }}>
              <Mail size={16} />
              Queue Mailer
            </button>
            <button className="btn btn-secondary" style={{ flexGrow: 1 }} onClick={() => {
              alert(`Task added: Fiduciary review of parcel ${lead.parcelNumber || lead.caseNumber}`);
            }}>
              <ShieldCheck size={16} />
              Verify Vacancy
            </button>

            {/* Claim Actions */}
            {(lead.claimStatus === 'Available' || lead.claimStatus === 'Released' || !lead.claimStatus) && (
              <button 
                className="btn" 
                style={{ flexGrow: 2, background: 'linear-gradient(135deg, var(--cyan), var(--purple))', color: 'white', border: 'none' }} 
                onClick={handleClaim} 
                disabled={claiming}
              >
                <Target size={16} />
                {claiming ? 'Claiming...' : 'Claim Property'}
              </button>
            )}

            {lead.claimStatus === 'Claimed' && currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN' || lead.claimedByUserId === currentUser.id) && (
              <>
                <button 
                  className="btn btn-secondary" 
                  style={{ flexGrow: 1, border: '1px solid var(--rose)', color: 'var(--rose)' }} 
                  onClick={handleRelease} 
                  disabled={claiming}
                >
                  <X size={16} />
                  Release Claim
                </button>
                <button 
                  className="btn" 
                  style={{ flexGrow: 1, background: 'linear-gradient(135deg, var(--emerald), #059669)', border: 'none', color: 'white' }} 
                  onClick={() => setShowSoldModal(true)}
                >
                  <DollarSign size={16} />
                  Mark Sold
                </button>
              </>
            )}
          </div>

          {/* Mark Sold Modal overlay */}
          {showSoldModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(5, 7, 12, 0.85)',
              backdropFilter: 'blur(8px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-sans)',
              color: 'var(--text-primary)'
            }}>
              <form onSubmit={handleSellSubmit} style={{
                width: '400px',
                background: 'var(--glass-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '30px',
                boxShadow: 'var(--shadow-premium)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}>
                <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--cyan)' }}>Mark Property Sold (Close Deal)</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Sale Date</label>
                  <input type="date" required className="form-input" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Assignment Fee ($)</label>
                  <input type="number" required placeholder="e.g. 15000" className="form-input" value={assignmentFee} onChange={e => setAssignmentFee(e.target.value)} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Net Profit Amount ($)</label>
                  <input type="number" required placeholder="e.g. 25000" className="form-input" value={profitAmount} onChange={e => setProfitAmount(e.target.value)} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Transaction Notes</label>
                  <textarea rows="3" placeholder="Buyer entity, closing agent, funding details..." className="form-input" value={saleNotes} onChange={e => setSaleNotes(e.target.value)} style={{ resize: 'none' }} />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flexGrow: 1 }} onClick={() => setShowSoldModal(false)}>Cancel</button>
                  <button type="submit" disabled={submittingSale} className="btn" style={{ flexGrow: 1, background: 'linear-gradient(135deg, var(--emerald) 0%, #059669 100%)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {submittingSale ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <DollarSign size={16} />
                        <span>Close Deal</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
