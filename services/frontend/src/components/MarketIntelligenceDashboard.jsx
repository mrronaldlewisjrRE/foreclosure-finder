import React, { useEffect, useState } from 'react';
import { Search, ShieldAlert, Sparkles, CheckCircle, RefreshCw, BarChart2, Globe } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '../config';

export default function MarketIntelligenceDashboard() {
  const [nlpQuery, setNlpQuery] = useState('');
  const [nlpResults, setNlpResults] = useState(null);
  const [discoveryPortals, setDiscoveryPortals] = useState([]);
  const [heatmapMetrics, setHeatmapMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      // Fetch discovered county portals
      const discRes = await fetchWithAuth(`${API_BASE_URL}/api/v1/counties/discovery`);
      const discData = await discRes.json();
      setDiscoveryPortals(discData.registries || []);

      // Fetch heatmap trends
      const heatRes = await fetchWithAuth(`${API_BASE_URL}/api/v1/analytics/heatmap`);
      const heatData = await heatRes.json();
      setHeatmapMetrics(heatData.heatmap || []);
    } catch (err) {
      console.error('Error fetching market intelligence data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprovePortal(id) {
    setProcessingId(id);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/counties/discovery/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchData();
      } else {
        alert('Failed to approve registry: ' + data.error);
      }
    } catch (err) {
      console.error('Error approving portal:', err);
      alert('Error approving portal');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleNlpSearch(e) {
    e.preventDefault();
    if (!nlpQuery.trim()) return;

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/search/nlp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nlpQuery })
      });
      const data = await res.json();
      if (data.success) {
        setNlpResults(data.filters);
      }
    } catch (err) {
      console.error('Error parsing NLP search:', err);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Natural Language Search Agent */}
      <div className="panel-card" style={{ background: 'linear-gradient(135deg, rgba(15,20,34,0.65) 0%, rgba(139,92,246,0.08) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Sparkles size={18} style={{ color: 'var(--purple)' }} />
          <h3 className="panel-title" style={{ margin: 0 }}>Natural Language Search Agent</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
          Type search prompts like: "Find inherited houses in Nashville with at least 40% equity", "Find absentee owners in Houston with probate filings", or "Find preforeclosures near Clark County."
        </p>
        <form onSubmit={handleNlpSearch} style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Type your distressed property query..."
            value={nlpQuery}
            onChange={(e) => setNlpQuery(e.target.value)}
          />
          <button className="btn" type="submit">
            <Search size={15} />
            Ask Agent
          </button>
        </form>

        {nlpResults && (
          <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--purple)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Structured Query Filters Resolved:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.85rem' }}>
              {nlpResults.county && (
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>County:</span>{' '}
                  <strong style={{ color: 'var(--cyan)' }}>{nlpResults.county}</strong>
                </div>
              )}
              {nlpResults.filingType && (
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Filing Category:</span>{' '}
                  <strong style={{ color: 'var(--purple)' }}>{nlpResults.filingType}</strong>
                </div>
              )}
              {nlpResults.minEquityPct && (
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Min Equity (%):</span>{' '}
                  <strong style={{ color: 'var(--emerald)' }}>{nlpResults.minEquityPct}%</strong>
                </div>
              )}
              {nlpResults.minEquity && (
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Min Equity ($):</span>{' '}
                  <strong style={{ color: 'var(--emerald)' }}>${nlpResults.minEquity.toLocaleString()}</strong>
                </div>
              )}
              {nlpResults.tier && (
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Opportunity Tier:</span>{' '}
                  <strong style={{ color: 'var(--amber)' }}>Tier {nlpResults.tier}</strong>
                </div>
              )}
              {nlpResults.vacant && (
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>USPS Status:</span>{' '}
                  <strong style={{ color: 'var(--rose)' }}>Vacant Property</strong>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* 2. County Discovery Admin Registry */}
        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} style={{ color: 'var(--cyan)' }} />
              <h3 className="panel-title" style={{ margin: 0 }}>County Discovery & Approvals</h3>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchData}>
              <RefreshCw size={12} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexGrow: 1, maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {loading ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading discovery registries...</p>
            ) : discoveryPortals.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No pending county public record portals discovered.</p>
            ) : (
              discoveryPortals.map((portal) => (
                <div key={portal.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '0.85rem' }}>{portal.county} ({portal.state})</strong>
                    <span className="badge" style={{ background: portal.connector_status === 'approved' ? 'var(--emerald-glow)' : 'var(--amber-glow)', color: portal.connector_status === 'approved' ? 'var(--emerald)' : 'var(--amber)', fontSize: '0.65rem' }}>
                      {portal.connector_status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    <div>Portal: {portal.portal_name}</div>
                    <div style={{ color: 'var(--cyan)', wordBreak: 'break-all' }}>{portal.url}</div>
                    <div style={{ marginTop: '4px' }}>
                      Method: {portal.search_method} | Quality: {portal.data_quality_score}% | CAPTCHA: {portal.captcha_required ? 'Yes' : 'No'} | OCR: {portal.ocr_required ? 'Yes' : 'No'}
                    </div>
                  </div>
                  {portal.connector_status === 'pending' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', borderColor: 'var(--border-color)', height: '28px', padding: '0 8px', fontSize: '0.7rem' }}
                      onClick={() => handleApprovePortal(portal.id)}
                      disabled={processingId === portal.id}
                    >
                      {processingId === portal.id ? 'Generating Playwright Scraper...' : 'Approve & Autogenerate Connector'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Market Intelligence Heatmap */}
        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={18} style={{ color: 'var(--emerald)' }} />
              <h3 className="panel-title" style={{ margin: 0 }}>Market Intelligence Heatmaps</h3>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexGrow: 1, maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {loading ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading heatmap metrics...</p>
            ) : heatmapMetrics.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No market metrics compiled.</p>
            ) : (
              heatmapMetrics.map((item) => (
                <div key={item.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '0.85rem' }}>{item.city} ({item.zip_code})</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.state} Region</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '0.75rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                      <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Foreclosures</span>
                      <strong style={{ color: 'var(--rose)', fontSize: '0.85rem' }}>{item.foreclosure_count}</strong>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                      <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Probates</span>
                      <strong style={{ color: 'var(--purple)', fontSize: '0.85rem' }}>{item.probate_count}</strong>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                      <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Tax Delinq.</span>
                      <strong style={{ color: 'var(--amber)', fontSize: '0.85rem' }}>{item.tax_delinquency_count}</strong>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                      <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.65rem' }}>USPS Vacant</span>
                      <strong style={{ color: 'var(--cyan)', fontSize: '0.85rem' }}>{item.vacancy_count}</strong>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                      <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Inv. Buys</span>
                      <strong style={{ color: 'var(--emerald)', fontSize: '0.85rem' }}>{item.investor_purchase_count}</strong>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                      <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Cash Deals</span>
                      <strong style={{ color: 'var(--emerald)', fontSize: '0.85rem' }}>{item.cash_transaction_count}</strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
