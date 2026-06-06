import React, { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, Briefcase, Info, Save, Compass, Sparkles, X, Download, Plus, RefreshCw, Share2 } from 'lucide-react';
import citiesMetadata from '../citiesMetadata';
import { API_BASE_URL, fetchWithAuth } from '../config';

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
};

export default function DirectoryView({ onSelectLead, maskedToggle = true }) {
  const [allLeads, setAllLeads] = useState([]);
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Selection state (Map: leadId -> leadObject)
  const [selectedLeads, setSelectedLeads] = useState(new Map());

  // Search & Filter state
  const [stateFilter, setStateFilter] = useState('');
  const [county, setCounty] = useState('');
  const [filingType, setFilingType] = useState('');
  const [tier, setTier] = useState('');
  const [minEquity, setMinEquity] = useState(0);
  const [vacant, setVacant] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  // New column-level filters
  const [minEquityPct, setMinEquityPct] = useState(0);
  const [minScore, setMinScore] = useState(0);
  const [inCrm, setInCrm] = useState('');

  // Radius Filter state
  const [enableRadius, setEnableRadius] = useState(false);
  const [centerCityName, setCenterCityName] = useState('Nashville');
  const [radiusVal, setRadiusVal] = useState(50);

  // Saved search state
  const [savingSearch, setSavingSearch] = useState(false);

  // AI NLP search states
  const [nlpQuery, setNlpQuery] = useState('');
  const [nlpParsing, setNlpParsing] = useState(false);
  const [nlpFeedback, setNlpFeedback] = useState('');

  // Sidebar visibility state
  const [showFilters, setShowFilters] = useState(true);

  // Sort cities alphabetically for user selector
  const sortedCities = [...citiesMetadata].sort((a, b) => 
    `${a.city}, ${a.state}`.localeCompare(`${b.city}, ${b.state}`)
  );

  // Sort counties alphabetically for user county selector
  const sortedCounties = [...citiesMetadata].sort((a, b) => 
    a.state.localeCompare(b.state) || a.countyCode.localeCompare(b.countyCode)
  );

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Radius of the earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Refetch leads only when maskedToggle changes or on mount
  useEffect(() => {
    fetchLeads();
  }, [maskedToggle]);

  // Handle client-side in-memory search and filtering (index/memory)
  useEffect(() => {
    let filtered = [...allLeads];

    // 1. Search Query filter (searches address, case, owner, state name/code, county name/code, filing type)
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const qCleaned = q.replace(/[^a-z0-9]/g, '');
      filtered = filtered.filter(lead => {
        const leadState = lead.countyCode ? lead.countyCode.split('_')[0] : '';
        const stateName = STATE_NAMES[leadState] || '';
        
        const matchesAddress = lead.propertyAddress && lead.propertyAddress.toLowerCase().includes(q);
        const matchesCase = lead.caseNumber && lead.caseNumber.toLowerCase().includes(q);
        const matchesOwner = lead.ownerName && lead.ownerName.toLowerCase().includes(q);
        const matchesState = leadState.toLowerCase() === q || stateName.toLowerCase().includes(q);
        
        // Clean up county code search (e.g. TN_DAVIDSON -> davidson, pulaski, etc.)
        const countyPart = lead.countyCode ? lead.countyCode.split('_')[1] : '';
        const matchesCounty = countyPart && countyPart.toLowerCase().replace(/[^a-z0-9]/g, '').includes(qCleaned);
        
        const matchesFiling = lead.filingType && lead.filingType.toLowerCase().replace(/_/g, ' ').includes(q);
        
        return matchesAddress || matchesCase || matchesOwner || matchesState || matchesCounty || matchesFiling;
      });
    }

    // 2. State filter
    if (stateFilter) {
      filtered = filtered.filter(lead => 
        lead.countyCode && lead.countyCode.startsWith(`${stateFilter}_`)
      );
    }

    // 3. County filter
    if (county) {
      filtered = filtered.filter(lead => lead.countyCode === county);
    }

    // 4. Filing Type filter
    if (filingType) {
      filtered = filtered.filter(lead => lead.filingType === filingType);
    }

    // 5. Opportunity Tier filter
    if (tier) {
      filtered = filtered.filter(lead => lead.score?.tier === tier);
    }

    // 6. Minimum Equity ($) filter
    if (minEquity > 0) {
      filtered = filtered.filter(lead => (lead.valuation?.estimatedEquity || 0) >= minEquity);
    }

    // 7. Minimum Equity % filter
    if (minEquityPct > 0) {
      filtered = filtered.filter(lead => (lead.valuation?.equityPercentage || 0) >= minEquityPct);
    }

    // 8. Minimum Opportunity Score filter
    if (minScore > 0) {
      filtered = filtered.filter(lead => (lead.score?.opportunityScore || 0) >= minScore);
    }

    // 9. USPS Vacant filter
    if (vacant) {
      filtered = filtered.filter(lead => lead.isVacant === true);
    }

    // 10. CRM Status filter
    if (inCrm === 'true') {
      filtered = filtered.filter(lead => lead.inCrm === true);
    } else if (inCrm === 'false') {
      filtered = filtered.filter(lead => lead.inCrm !== true);
    }

    // 11. Radius filter (client-side Haversine calculation)
    if (enableRadius) {
      const cityMatch = citiesMetadata.find(c => c.city === centerCityName);
      if (cityMatch) {
        filtered = filtered.filter(lead => {
          if (!lead.coordinates?.lat || !lead.coordinates?.lng) return false;
          const dist = getDistance(cityMatch.lat, cityMatch.lng, lead.coordinates.lat, lead.coordinates.lng);
          lead.distanceMiles = parseFloat(dist.toFixed(2));
          return dist <= radiusVal;
        });
      }
    } else {
      filtered.forEach(lead => lead.distanceMiles = null);
    }

    setFilteredLeads(filtered);
    setTotalLeads(filtered.length);

    // Apply pagination client-side
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);
    setLeads(paginated);

  }, [allLeads, searchQuery, stateFilter, county, filingType, tier, minEquity, vacant, page, enableRadius, centerCityName, radiusVal, minEquityPct, minScore, inCrm]);

  async function fetchLeads() {
    setLoading(true);
    try {
      // Fetch up to 1000 leads to load everything into client memory (index/memory)
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/leads?limit=1000&masked=${maskedToggle}`);
      const data = await res.json();
      setAllLeads(data.leads || []);
      setPage(1);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleNlpSearch(e) {
    e.preventDefault();
    if (!nlpQuery.trim()) return;

    setNlpParsing(true);
    setNlpFeedback('');
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/search/nlp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nlpQuery })
      });
      const data = await res.json();
      if (data.success && data.filters) {
        const f = data.filters;
        let appliedCount = 0;
        
        if (f.county !== undefined) {
          setCounty(f.county);
          appliedCount++;
        }
        if (f.filingType !== undefined) {
          setFilingType(f.filingType);
          appliedCount++;
        }
        if (f.tier !== undefined) {
          setTier(f.tier);
          appliedCount++;
        }
        if (f.minEquityPct !== undefined) {
          setMinEquityPct(f.minEquityPct);
          appliedCount++;
        }
        if (f.minEquity !== undefined) {
          setMinEquity(f.minEquity);
          appliedCount++;
        }
        if (f.vacant !== undefined) {
          setVacant(f.vacant === 'true');
          appliedCount++;
        }
        if (f.minScore !== undefined) {
          setMinScore(f.minScore);
          appliedCount++;
        }
        
        setNlpFeedback(`AI parsed successfully! Applied ${appliedCount} filters.`);
        setPage(1);
      } else {
        setNlpFeedback('AI search failed to parse filters.');
      }
    } catch (err) {
      console.error('Error in NLP search:', err);
      setNlpFeedback('Error communicating with AI parser.');
    } finally {
      setNlpParsing(false);
    }
  }

  async function handleAddToWorkflow(leadId) {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/workflow/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Added to Workflow!\n\nPipeline Stage: ${data.pipelineStage}\nTasks Created: ${data.tasksCreated}`);
        fetchLeads(); // Refresh to update claim status
      } else {
        alert(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error adding to workflow:', err);
      alert('Error adding lead to workflow.');
    }
  }

  async function handleSaveSearch() {
    setSavingSearch(true);
    try {
      const searchName = prompt('Enter a name for this saved search:', 'High Opportunity Alerts');
      if (!searchName) return;

      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/saved-searches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchName,
          emailNotifications: true,
          webhookNotifications: false,
          filterCriteria: { countyCode: county, filingType, minEquity, tier }
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Saved Search "${searchName}" successfully registered.`);
      } else {
        alert('Failed to save search.');
      }
    } catch (err) {
      console.error('Error saving search:', err);
      alert('Server error saving search criteria.');
    } finally {
      setSavingSearch(false);
    }
  }

  // Dynamic helper calculations for new columns
  function getMotivationScore(filingType, isVacant) {
    let score = 20;
    if (filingType === 'PRE_FORECLOSURE') score += 35;
    if (filingType === 'NOTICE_OF_DEFAULT' || filingType === 'LIS_PENDENS') score += 30;
    if (filingType === 'TAX_DELINQUENCY') score += 35;
    if (filingType === 'TRUSTEE_SALE' || filingType === 'SHERIFF_SALE') score += 40;
    if (filingType === 'PROBATE' || filingType === 'PROBATE_CASE') score += 30;
    if (filingType === 'BANK_OWNED') score += 25;
    if (isVacant) score += 25;
    return Math.min(score, 100);
  }

  function getMotivationTier(score) {
    if (score >= 70) return 'HIGH';
    if (score >= 45) return 'MEDIUM';
    return 'LOW';
  }

  function getDealGrade(equityPercentage) {
    const eqPct = parseFloat(equityPercentage || 0);
    if (eqPct >= 45) return 'A+';
    if (eqPct >= 30) return 'A';
    if (eqPct >= 15) return 'B';
    if (eqPct < 5) return 'F';
    return 'C';
  }

  // Row selection handler
  function handleToggleLeadSelect(lead) {
    const nextSelected = new Map(selectedLeads);
    if (nextSelected.has(lead.id)) {
      nextSelected.delete(lead.id);
    } else {
      nextSelected.set(lead.id, lead);
    }
    setSelectedLeads(nextSelected);
  }

  // Page-level selection helper and handler
  const selectedLeadsOnPage = leads.length > 0 && leads.every(lead => selectedLeads.has(lead.id));

  function handleToggleSelectAll() {
    const nextSelected = new Map(selectedLeads);
    if (selectedLeadsOnPage) {
      leads.forEach(lead => nextSelected.delete(lead.id));
    } else {
      leads.forEach(lead => nextSelected.set(lead.id, lead));
    }
    setSelectedLeads(nextSelected);
  }

  // Clear all selection Map values
  function handleClearSelection() {
    setSelectedLeads(new Map());
  }

  // Client-side CSV generation formatter
  function convertToCSV(leadsList) {
    const headers = [
      'Property Address',
      'Owner Name',
      'Case Number',
      'County',
      'Filing Type',
      'Estimated Value ($)',
      'First Mortgage ($)',
      'Estimated Equity ($)',
      'Equity (%)',
      'Opportunity Score',
      'Opportunity Tier',
      'Motivation Score',
      'Motivation Tier',
      'Deal Grade',
      'In CRM'
    ];

    const rows = leadsList.map(lead => {
      const motScore = getMotivationScore(lead.filingType, lead.isVacant);
      const motTier = getMotivationTier(motScore);
      const grade = getDealGrade(lead.valuation?.equityPercentage);
      
      return [
        `"${lead.propertyAddress.replace(/"/g, '""')}"`,
        `"${(lead.ownerName || 'N/A').replace(/"/g, '""')}"`,
        `"${lead.caseNumber.replace(/"/g, '""')}"`,
        `"${lead.countyCode.replace(/"/g, '""')}"`,
        `"${lead.filingType.replace(/"/g, '""')}"`,
        lead.valuation?.estimatedValue || 0,
        lead.valuation?.firstMortgageAmount || 0,
        lead.valuation?.estimatedEquity || 0,
        lead.valuation?.equityPercentage || 0,
        lead.score?.opportunityScore || 0,
        `"${(lead.score?.tier || 'C').replace('_', '+')}"`,
        motScore,
        `"${motTier}"`,
        `"${grade}"`,
        lead.inCrm ? 'Yes' : 'No'
      ];
    });

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  // Trigger file download in browser using Blob URI
  function downloadCSV(csvContent, fileName) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export only the selected lead objects
  function handleExportSelected() {
    if (selectedLeads.size === 0) {
      alert('Please select at least one lead to export.');
      return;
    }
    const leadsToExport = Array.from(selectedLeads.values());
    const csvContent = convertToCSV(leadsToExport);
    downloadCSV(csvContent, `leads_selected_export_${new Date().toISOString().split('T')[0]}.csv`);
  }

  // Export all leads matching the active filters from memory
  function handleExportAllFiltered() {
    if (filteredLeads.length === 0) {
      alert('No leads found matching current filters to export.');
      return;
    }
    const csvContent = convertToCSV(filteredLeads);
    downloadCSV(csvContent, `leads_filtered_export_${new Date().toISOString().split('T')[0]}.csv`);
  }


  return (
    <div className="directory-layout" style={{ gridTemplateColumns: showFilters ? '280px 1fr' : '1fr' }}>
      {/* Filters Sidebar */}
      {showFilters && (
        <div className="filter-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SlidersHorizontal size={16} style={{ color: 'var(--cyan)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>FILTER CONTROLS</span>
          </div>
          <button 
            onClick={() => setShowFilters(false)}
            style={{ 
              background: 'var(--bg-tertiary)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-primary)', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            title="Hide Filter Panel"
            className="filter-close-btn"
            type="button"
          >
            <X size={12} />
            <span>Hide</span>
          </button>
        </div>

        <div className="filter-group">
          <label className="filter-label">State Jurisdiction</label>
          <select 
            className="form-select" 
            value={stateFilter} 
            onChange={(e) => { 
              const selectedState = e.target.value;
              setStateFilter(selectedState); 
              // Clear county filter if the county doesn't belong to the selected state
              if (selectedState && county && !county.startsWith(`${selectedState}_`)) {
                setCounty('');
              }
              setPage(1); 
            }}
          >
            <option value="">All States</option>
            {Array.from(new Set(citiesMetadata.map(c => c.state))).sort().map(st => (
              <option key={st} value={st}>{st} - {STATE_NAMES[st] || st}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">County Jurisdiction</label>
          <select className="form-select" value={county} onChange={(e) => { setCounty(e.target.value); setPage(1); }}>
            <option value="">All Counties</option>
            {sortedCounties
              .filter(c => !stateFilter || c.state === stateFilter)
              .map(c => {
                const countyPart = c.countyCode.split('_')[1];
                let displayName = countyPart.charAt(0) + countyPart.slice(1).toLowerCase();
                
                if (countyPart === 'MIAMIDADE') displayName = 'Miami-Dade';
                else if (countyPart === 'LOSANGELES') displayName = 'Los Angeles';
                else if (countyPart === 'NEWYORK') displayName = 'New York';
                else if (countyPart === 'NEWCASTLE') displayName = 'New Castle';
                else if (countyPart === 'YELLOWSTONE') displayName = 'Yellowstone';
                else if (countyPart === 'HILLSBOROUGH') displayName = 'Hillsborough';
                else if (countyPart === 'MECKLENBURG') displayName = 'Mecklenburg';
                else if (countyPart === 'PHILADELPHIA') displayName = 'Philadelphia';
                else if (countyPart === 'CHITTENDEN') displayName = 'Chittenden';
                else if (countyPart === 'MINNEHAHA') displayName = 'Minnehaha';
                else if (countyPart === 'SALTLAKE') displayName = 'Salt Lake';
                
                const suffix = (c.countyCode.includes('ANCHORAGE') || c.countyCode.includes('ORLEANS')) ? ' Borough/Parish' : ' County';
                return (
                  <option key={c.countyCode} value={c.countyCode}>
                    {displayName}{suffix}, {c.state}
                  </option>
                );
              })}
          </select>
        </div>

        {/* Dynamic Radius Filtering Section */}
        <div className="filter-group" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: 14 }}>
          <label className="checkbox-label" style={{ fontWeight: 700, color: 'var(--cyan)' }}>
            <input 
              type="checkbox" 
              checked={enableRadius} 
              onChange={(e) => { setEnableRadius(e.target.checked); setPage(1); }}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Compass size={14} />
              Geographic Radius
            </span>
          </label>
        </div>

        {enableRadius && (
          <>
            <div className="filter-group" style={{ paddingLeft: 10 }}>
              <label className="filter-label">Center Point City</label>
              <select className="form-select" value={centerCityName} onChange={(e) => { setCenterCityName(e.target.value); setPage(1); }}>
                {sortedCities.map(c => (
                  <option key={`${c.city}-${c.state}`} value={c.city}>
                    {c.city}, {c.state}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group" style={{ paddingLeft: 10 }}>
              <label className="filter-label">Distance Radius (Miles)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input 
                  type="range" 
                  min="5" 
                  max="100" 
                  step="5" 
                  value={radiusVal} 
                  onChange={(e) => { setRadiusVal(parseInt(e.target.value)); setPage(1); }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontWeight: 600 }}>
                  Within {radiusVal} miles
                </span>
              </div>
            </div>
          </>
        )}

        <div className="filter-group" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: 14 }}>
          <label className="filter-label">Filing Category</label>
          <select className="form-select" value={filingType} onChange={(e) => { setFilingType(e.target.value); setPage(1); }}>
            <option value="">All Filings</option>
            <option value="PRE_FORECLOSURE">Pre-Foreclosure</option>
            <option value="LIS_PENDENS">Lis Pendens</option>
            <option value="NOTICE_OF_DEFAULT">Notice of Default</option>
            <option value="TRUSTEE_SALE">Trustee Sale</option>
            <option value="SHERIFF_SALE">Sheriff Sale</option>
            <option value="TAX_DELINQUENCY">Tax Delinquency</option>
            <option value="BANK_OWNED">Bank Owned / REO</option>
            <option value="PROBATE">Probate</option>
            <option value="PROBATE_CASE">Probate Case</option>
            <option value="CODE_VIOLATION">Code Violation</option>
            <option value="PROPERTY_LEAD">Property Lead</option>
            <option value="PROSPECT_PROPERTY">Prospect Property</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Opportunity Tier</label>
          <select className="form-select" value={tier} onChange={(e) => { setTier(e.target.value); setPage(1); }}>
            <option value="">All Tiers</option>
            <option value="A_PLUS">A+ Opportunity</option>
            <option value="A">A Opportunity</option>
            <option value="B">B Opportunity</option>
            <option value="C">C Opportunity</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Minimum Equity ($)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input 
              type="range" 
              min="0" 
              max="500000" 
              step="25000" 
              value={minEquity} 
              onChange={(e) => setMinEquity(parseInt(e.target.value))}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontWeight: 600 }}>
              &gt;= ${minEquity.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="filter-group">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={vacant} 
              onChange={(e) => { setVacant(e.target.checked); setPage(1); }}
            />
            <span>USPS Vacant Property</span>
          </label>
        </div>

        <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={handleSaveSearch} disabled={savingSearch}>
          <Save size={14} />
          {savingSearch ? 'Saving...' : 'Save Current Search'}
        </button>
      </div>
      )}

      {/* Directory Grid */}
      <div className="leads-grid-container">
        {/* AI NLP Search Panel */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 20, 34, 0.75) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-premium)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sparkles size={16} style={{ color: 'var(--purple)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
              AI NATURAL LANGUAGE SEARCH CO-PILOT
            </span>
          </div>
          <form onSubmit={handleNlpSearch} style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Find preforeclosures in Nashville with at least 40% equity or vacant probates..."
              value={nlpQuery}
              onChange={(e) => setNlpQuery(e.target.value)}
              style={{ borderLeft: '3px solid var(--purple)' }}
            />
            <button className="btn" type="submit" style={{ background: 'linear-gradient(135deg, var(--purple) 0%, #7c3aed 100%)', color: '#fff', border: 'none', minWidth: '110px' }} disabled={nlpParsing}>
              {nlpParsing ? 'Parsing...' : 'Ask AI'}
            </button>
          </form>
          {nlpFeedback && (
            <div style={{ marginTop: '8px', fontSize: '0.75rem', color: nlpFeedback.includes('successfully') ? 'var(--emerald)' : 'var(--rose)', fontWeight: 600 }}>
              {nlpFeedback}
            </div>
          )}
        </div>

        <div className="search-bar-container">
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowFilters(!showFilters)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '135px' }}
            title={showFilters ? "Hide Filter Panel" : "Show Filter Panel"}
          >
            <SlidersHorizontal size={14} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by street address, case, owner, state, county, or filing type..." 
              className="form-input" 
              style={{ paddingLeft: 40 }}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            />
          </div>
          <button className="btn btn-secondary" onClick={fetchLeads} title="Refresh Data From Server" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={13} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Selection & Export Action Toolbar */}
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '12px 20px',
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          boxShadow: 'var(--shadow-premium)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Selected: <strong style={{ color: 'var(--cyan)' }}>{selectedLeads.size}</strong> leads
            </span>
            {selectedLeads.size > 0 && (
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleClearSelection}
                style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px' }}
              >
                Clear Selection
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={handleExportSelected}
              disabled={selectedLeads.size === 0}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                opacity: selectedLeads.size === 0 ? 0.5 : 1,
                cursor: selectedLeads.size === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <Download size={13} />
              Export Selected ({selectedLeads.size})
            </button>
            <button 
              className="btn btn-sm" 
              onClick={handleExportAllFiltered}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={13} />
              Export All Filtered ({totalLeads})
            </button>
          </div>
        </div>

        <div className="leads-table-wrapper">
          <table className="leads-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedLeadsOnPage} 
                    ref={input => {
                      if (input) {
                        const anySelected = leads.some(lead => selectedLeads.has(lead.id));
                        const allSelected = leads.length > 0 && leads.every(lead => selectedLeads.has(lead.id));
                        input.indeterminate = anySelected && !allSelected;
                      }
                    }}
                    onChange={handleToggleSelectAll}
                    style={{ cursor: 'pointer', accentColor: 'var(--cyan)' }}
                  />
                </th>
                <th>Property Address</th>
                <th>Owner Name</th>
                <th>Case Number</th>
                <th>County</th>
                <th>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>Filing Type</span>
                    <select 
                      className="form-select" 
                      style={{ padding: '2px 4px', fontSize: '0.75rem', height: '24px', minWidth: '95px', marginTop: '2px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                      value={filingType} 
                      onChange={(e) => { setFilingType(e.target.value); setPage(1); }}
                    >
                      <option value="">All</option>
                      <option value="PRE_FORECLOSURE">Pre-Foreclosure</option>
                      <option value="LIS_PENDENS">Lis Pendens</option>
                      <option value="NOTICE_OF_DEFAULT">Notice of Default</option>
                      <option value="TRUSTEE_SALE">Trustee Sale</option>
                      <option value="SHERIFF_SALE">Sheriff Sale</option>
                      <option value="TAX_DELINQUENCY">Tax Delinquency</option>
                      <option value="BANK_OWNED">Bank Owned / REO</option>
                      <option value="PROBATE">Probate</option>
                      <option value="PROBATE_CASE">Probate Case</option>
                      <option value="CODE_VIOLATION">Code Violation</option>
                      <option value="PROPERTY_LEAD">Property Lead</option>
                      <option value="PROSPECT_PROPERTY">Prospect Property</option>
                    </select>
                  </div>
                </th>
                <th>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>Verification</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', height: '24px', display: 'flex', alignItems: 'center' }}>Status</span>
                  </div>
                </th>
                <th>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>Equity (%)</span>
                    <input 
                      type="number" 
                      placeholder="Min %" 
                      className="form-input"
                      style={{ padding: '2px 4px', fontSize: '0.75rem', height: '24px', width: '70px', marginTop: '2px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                      value={minEquityPct || ''} 
                      onChange={(e) => { 
                        const v = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setMinEquityPct(isNaN(v) ? 0 : v); 
                        setPage(1); 
                      }}
                      min="0"
                      max="100"
                    />
                  </div>
                </th>
                <th>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>Score</span>
                    <input 
                      type="number" 
                      placeholder="Min" 
                      className="form-input"
                      style={{ padding: '2px 4px', fontSize: '0.75rem', height: '24px', width: '60px', marginTop: '2px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                      value={minScore || ''} 
                      onChange={(e) => { 
                        const v = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                        setMinScore(isNaN(v) ? 0 : v); 
                        setPage(1); 
                      }}
                      min="0"
                      max="100"
                    />
                  </div>
                </th>
                <th>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>Tier</span>
                    <select 
                      className="form-select" 
                      style={{ padding: '2px 4px', fontSize: '0.75rem', height: '24px', minWidth: '70px', marginTop: '2px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                      value={tier} 
                      onChange={(e) => { setTier(e.target.value); setPage(1); }}
                    >
                      <option value="">All</option>
                      <option value="A_PLUS">A+</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                </th>
                <th>Motivation</th>
                <th>Grade</th>
                <th>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>Actions</span>
                    <select 
                      className="form-select" 
                      style={{ padding: '2px 4px', fontSize: '0.75rem', height: '24px', minWidth: '95px', marginTop: '2px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                      value={inCrm} 
                      onChange={(e) => { setInCrm(e.target.value); setPage(1); }}
                    >
                      <option value="">All Leads</option>
                      <option value="true">In CRM</option>
                      <option value="false">Not in CRM</option>
                    </select>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                    Loading listings from datastore...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                    No leads found matching current criteria.
                  </td>
                </tr>
              ) : (
                leads.map(lead => {
                  const isClaimed = lead.claimStatus === 'Claimed';
                  const isSold = lead.claimStatus === 'Sold';
                  const isUnavailable = isClaimed || isSold;

                  return (
                  <tr 
                    key={lead.id} 
                    onClick={() => onSelectLead(lead.id)}
                    style={{ 
                      backgroundColor: selectedLeads.has(lead.id) 
                        ? 'rgba(6, 182, 212, 0.04)' 
                        : isUnavailable 
                          ? 'rgba(100, 100, 100, 0.04)' 
                          : '',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      opacity: isUnavailable ? 0.55 : 1,
                      borderLeft: isSold 
                        ? '3px solid var(--emerald)' 
                        : isClaimed 
                          ? '3px solid var(--amber)' 
                          : '3px solid transparent'
                    }}
                    onMouseEnter={(e) => { if (!selectedLeads.has(lead.id)) e.currentTarget.style.backgroundColor = isUnavailable ? 'rgba(100, 100, 100, 0.08)' : 'rgba(6, 182, 212, 0.06)'; e.currentTarget.style.opacity = isUnavailable ? '0.75' : '1'; }}
                    onMouseLeave={(e) => { if (!selectedLeads.has(lead.id)) e.currentTarget.style.backgroundColor = isUnavailable ? 'rgba(100, 100, 100, 0.04)' : ''; e.currentTarget.style.opacity = isUnavailable ? '0.55' : '1'; }}
                  >
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedLeads.has(lead.id)} 
                        onChange={() => handleToggleLeadSelect(lead)}
                        style={{ cursor: 'pointer', accentColor: 'var(--cyan)' }}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {lead.propertyAddress}
                      {lead.distanceMiles !== null && (
                        <div style={{ color: 'var(--cyan)', fontSize: '0.72rem', marginTop: 3 }}>
                          ({lead.distanceMiles} miles from center)
                        </div>
                      )}
                      {isClaimed && (
                        <span style={{
                          display: 'inline-block',
                          marginLeft: '8px',
                          fontSize: '0.58rem',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '3px',
                          background: 'var(--amber-glow)',
                          color: 'var(--amber)',
                          border: '1px solid var(--amber)',
                          verticalAlign: 'middle',
                          letterSpacing: '0.04em'
                        }}>CLAIMED</span>
                      )}
                      {isSold && (
                        <span style={{
                          display: 'inline-block',
                          marginLeft: '8px',
                          fontSize: '0.58rem',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '3px',
                          background: 'var(--emerald-glow)',
                          color: 'var(--emerald)',
                          border: '1px solid var(--emerald)',
                          verticalAlign: 'middle',
                          letterSpacing: '0.04em'
                        }}>SOLD</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{lead.ownerName || 'N/A'}</td>
                    <td>{lead.caseNumber}</td>
                    <td>{lead.countyCode}</td>
                    <td>
                      <span className={`badge ${
                        lead.filingType === 'LIS_PENDENS' ? 'badge-lis-pendens' : 
                        lead.filingType === 'NOTICE_OF_DEFAULT' ? 'badge-default' : 
                        lead.filingType === 'PROBATE' ? 'badge-lis-pendens' : 
                        lead.filingType === 'PROPERTY_LEAD' ? 'badge-property-lead' : 
                        lead.filingType === 'PROSPECT_PROPERTY' ? 'badge-prospect-property' : 
                        'badge-tax'
                      }`}>
                        {lead.filingType?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${lead.verificationStatus === 'VERIFIED' ? 'tier-A_PLUS' : 'tier-C'}`} style={{ border: '1px solid currentColor', fontSize: '0.6rem' }}>
                        {lead.verificationStatus || 'UNVERIFIED'}
                      </span>
                    </td>
                    <td>
                      ${(lead.valuation?.estimatedEquity || 0).toLocaleString()} ({lead.valuation?.equityPercentage}%)
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--cyan)' }}>
                      {lead.score?.opportunityScore || 0}
                    </td>
                    <td>
                      <span className={`table-tier-badge tier-${lead.score?.tier}`}>
                        {lead.score?.tier?.replace('_', '+') || 'C'}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const motScore = getMotivationScore(lead.filingType, lead.isVacant);
                        const motTier = getMotivationTier(motScore);
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 700, color: motScore >= 70 ? 'var(--rose)' : motScore >= 45 ? 'var(--amber)' : 'var(--cyan)', fontSize: '0.8rem' }}>
                              {motScore}
                            </span>
                            <span style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: 800,
                              color: motTier === 'HIGH' ? 'var(--rose)' : motTier === 'MEDIUM' ? 'var(--amber)' : 'var(--cyan)'
                            }}>
                              {motTier}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const grade = getDealGrade(lead.valuation?.equityPercentage);
                        return (
                          <span style={{
                            background: grade.includes('A') || grade.includes('+') ? 'var(--emerald-glow)' : grade.includes('F') ? 'var(--rose-glow)' : 'var(--amber-glow)',
                            color: grade.includes('A') || grade.includes('+') ? 'var(--emerald)' : grade.includes('F') ? 'var(--rose)' : 'var(--amber)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 800
                          }}>
                            {grade}
                          </span>
                        );
                      })()}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="table-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => onSelectLead(lead.id)} title="View Details">
                          <Info size={13} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => {
                            const shareUrl = `${window.location.origin}${window.location.pathname}?lead=${lead.id}`;
                            navigator.clipboard.writeText(shareUrl).then(() => {
                              alert('Property link copied to clipboard!');
                            }).catch(() => {
                              alert('Failed to copy link.');
                            });
                          }}
                          title="Copy Share Link"
                        >
                          <Share2 size={13} />
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => handleAddToWorkflow(lead.id)}
                          title="Add to Workflow"
                          style={{
                            background: lead.claimStatus === 'Claimed' ? 'var(--bg-tertiary)' : 'var(--accent)',
                            color: lead.claimStatus === 'Claimed' ? 'var(--text-muted)' : '#fff',
                            border: lead.claimStatus === 'Claimed' ? '1px solid var(--border-color)' : 'none',
                          }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>

          </table>
        </div>

        {/* Pagination Controls */}
        <div className="pagination-row">
          <span>Showing {leads.length} of {totalLeads} discoveries</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => p + 1)}
              disabled={leads.length < limit}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
