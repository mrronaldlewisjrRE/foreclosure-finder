import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, Clock, Construction, Compass } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '../config';

export default function SouthernCoverageDashboard() {
  const [registries, setRegistries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningDiscovery, setRunningDiscovery] = useState(false);

  async function fetchRegistries() {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/discovery/registry`);
      const data = await res.json();
      setRegistries(data.registries || []);
    } catch (err) {
      console.error('Error fetching discovery registry:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRegistries();
  }, []);

  async function handleRunDiscovery() {
    setRunningDiscovery(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/discovery/run`, {
        method: 'POST'
      });
      const data = await res.json();
      alert(`Discovery scan complete! Added: ${data.result?.added || 0}, Updated: ${data.result?.updated || 0}`);
      await fetchRegistries();
    } catch (err) {
      console.error('Error running discovery:', err);
      alert('Failed to execute county discovery agent.');
    } finally {
      setRunningDiscovery(false);
    }
  }

  // Calculate stats
  const totalCount = registries.length;
  const operationalCount = registries.filter(r => r.connector_status === 'production' || r.connector_status === 'verified').length;
  const testingCount = registries.filter(r => r.connector_status === 'testing').length;
  const buildingCount = registries.filter(r => r.connector_status === 'building' || r.connector_status === 'researching').length;

  const completionRate = totalCount > 0 ? Math.round((operationalCount / totalCount) * 100) : 0;
  const progressRate = totalCount > 0 ? Math.round(((operationalCount + testingCount) / totalCount) * 100) : 0;

  function getStatusBadgeClass(status) {
    switch (status?.toLowerCase()) {
      case 'production':
      case 'verified':
        return 'tier-A_PLUS'; // green
      case 'testing':
        return 'tier-A'; // cyan
      case 'building':
        return 'tier-B'; // amber/purple
      case 'researching':
        return 'tier-B'; // amber
      default:
        return 'tier-C'; // grey
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      {/* Metrics Row */}
      <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <div className="stat-card cyan">
          <div className="stat-header">
            <span className="stat-title">Total Portals Discovered</span>
            <div className="stat-icon-wrapper"><Compass size={20} /></div>
          </div>
          <div className="stat-value">{totalCount}</div>
          <div className="stat-subtitle">Across 12 Southern States</div>
        </div>

        <div className="stat-card emerald">
          <div className="stat-header">
            <span className="stat-title">Operational Connectors</span>
            <div className="stat-icon-wrapper"><CheckCircle size={20} /></div>
          </div>
          <div className="stat-value">{operationalCount}</div>
          <div className="stat-subtitle">Production-Ready (Verified Data)</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-header">
            <span className="stat-title">Connectors In Test/Build</span>
            <div className="stat-icon-wrapper"><Construction size={20} /></div>
          </div>
          <div className="stat-value">{testingCount + buildingCount}</div>
          <div className="stat-subtitle">Active Scraper Pipeline</div>
        </div>

        <div className="stat-card rose">
          <div className="stat-header">
            <span className="stat-title">Overall Network Coverage</span>
            <div className="stat-icon-wrapper"><Clock size={20} /></div>
          </div>
          <div className="stat-value">{completionRate}%</div>
          <div className="stat-subtitle">Target Region Dominance Rate</div>
        </div>
      </div>

      {/* Discovery Agent Action Panel */}
      <div className="panel-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>County Discovery Agent</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Automatically scans court record indices, register of deeds portals, tax offices, and sheriff sale sites in the South.
          </p>
        </div>
        <button 
          className="btn" 
          onClick={handleRunDiscovery} 
          disabled={runningDiscovery}
          style={{ padding: '10px 20px', minWidth: '180px' }}
        >
          <RefreshCw size={16} className={runningDiscovery ? 'spin' : ''} />
          {runningDiscovery ? 'Scanning Portals...' : 'Execute Portal Scan'}
        </button>
      </div>

      {/* Registry Table */}
      <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
        <div className="panel-header">
          <span className="panel-title">Southern Metro Portal Registry</span>
          <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Network Progress: <strong>{progressRate}%</strong></span>
            <span>|</span>
            <span>Total: <strong>{registries.length} registries</strong></span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading Southern Coverage Registry...
          </div>
        ) : (
          <div style={{ overflowY: 'auto', flexGrow: 1, maxHeight: 'calc(100vh - 420px)' }}>
            <table className="leads-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>State</th>
                  <th>County</th>
                  <th>Portal Name</th>
                  <th>Portal URL</th>
                  <th>Platform Type</th>
                  <th>OCR Required</th>
                  <th>Confidence</th>
                  <th>Connector Status</th>
                </tr>
              </thead>
              <tbody>
                {registries.map(reg => (
                  <tr key={reg.id}>
                    <td style={{ fontWeight: 700, color: 'var(--cyan)' }}>{reg.state}</td>
                    <td style={{ fontWeight: 600 }}>{reg.county}</td>
                    <td>{reg.portal_name}</td>
                    <td>
                      <a 
                        href={reg.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ color: 'var(--cyan)', textDecoration: 'none', wordBreak: 'break-all' }}
                      >
                        {reg.url}
                      </a>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                        {reg.platform_type}
                      </span>
                    </td>
                    <td>
                      {reg.ocr_required ? (
                        <span style={{ color: 'var(--amber)', fontSize: '0.75rem', fontWeight: 600 }}>YES</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>No</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: reg.data_quality_score >= 90 ? 'var(--emerald)' : reg.data_quality_score >= 80 ? 'var(--cyan)' : 'var(--amber)' }}>
                      {reg.data_quality_score}%
                    </td>
                    <td>
                      <span className={`table-tier-badge ${getStatusBadgeClass(reg.connector_status)}`} style={{ textTransform: 'uppercase' }}>
                        {reg.connector_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
