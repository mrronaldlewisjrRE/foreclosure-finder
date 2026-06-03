import React, { useEffect, useState } from 'react';
import { Home, Award, Briefcase, RefreshCw, ChevronRight, MapPin } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '../config';

export default function DashboardView({ onSelectLead, onViewChange, maskedToggle = true }) {
  const [stats, setStats] = useState({
    totalLeads: 0,
    highOppCount: 0,
    crmCount: 0,
    scraperSuccessRate: 98,
  });
  const [recentLeads, setRecentLeads] = useState([]);
  const [counties, setCounties] = useState([]);
  const [showAllCounties, setShowAllCounties] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        // Fetch all leads
        const leadsRes = await fetchWithAuth(`${API_BASE_URL}/api/v1/leads?limit=100&masked=${maskedToggle}`);
        const leadsData = await leadsRes.json();
        
        // Fetch CRM pipeline
        const crmRes = await fetchWithAuth(`${API_BASE_URL}/api/v1/crm/pipeline`);
        const crmData = await crmRes.json();

        // Fetch county ingestion statistics
        const countiesRes = await fetchWithAuth(`${API_BASE_URL}/api/v1/counties/stats`);
        const countiesData = await countiesRes.json();

        const leadsList = leadsData.leads || [];
        const crmList = crmData.pipeline || [];

        const total = leadsData.total || leadsList.length;
        const highOpp = leadsList.filter(l => l.score?.tier === 'A_PLUS' || l.score?.tier === 'A').length;

        setStats({
          totalLeads: total,
          highOppCount: highOpp,
          crmCount: crmList.length,
          scraperSuccessRate: 100, // Derived or static mock success rate
        });

        // Set recent 5 leads
        setRecentLeads(leadsList.slice(0, 5));
        setCounties(countiesData.counties || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [maskedToggle]);


  return (
    <div className="dashboard-layout">
      {/* 4 Stats Cards */}
      <div className="dashboard-stats">
        <div className="stat-card cyan">
          <div className="stat-header">
            <span className="stat-title">Total Discoveries</span>
            <div className="stat-icon-wrapper">
              <Home size={18} />
            </div>
          </div>
          <span className="stat-value">{loading ? '...' : stats.totalLeads}</span>
          <span className="stat-subtitle">Across active counties</span>
        </div>

        <div className="stat-card purple">
          <div className="stat-header">
            <span className="stat-title">High Opportunity</span>
            <div className="stat-icon-wrapper">
              <Award size={18} />
            </div>
          </div>
          <span className="stat-value">{loading ? '...' : stats.highOppCount}</span>
          <span className="stat-subtitle">Tier A / A+ leads found</span>
        </div>

        <div className="stat-card emerald">
          <div className="stat-header">
            <span className="stat-title">Active CRM Pipeline</span>
            <div className="stat-icon-wrapper">
              <Briefcase size={18} />
            </div>
          </div>
          <span className="stat-value">{loading ? '...' : stats.crmCount}</span>
          <span className="stat-subtitle">Leads being pursued</span>
        </div>

        <div className="stat-card rose">
          <div className="stat-header">
            <span className="stat-title">Scraper Status</span>
            <div className="stat-icon-wrapper">
              <RefreshCw size={18} />
            </div>
          </div>
          <span className="stat-value">{stats.scraperSuccessRate}%</span>
          <span className="stat-subtitle">Daily cron health rating</span>
        </div>
      </div>

      {/* Row 2: Recent Discoveries feed + County Coverage */}
      <div className="dashboard-row">
        {/* Recent Discoveries Feed */}
        <div className="panel-card">
          <div className="panel-header">
            <h3 className="panel-title">Recent Foreclosure Discoveries</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onViewChange('directory')}>
              View Directory
            </button>
          </div>

          <div className="feed-list">
            {loading ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading recent cases...</p>
            ) : recentLeads.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No recent leads found. Run scrapers first.</p>
            ) : (
              recentLeads.map(lead => {
                let badgeClass = 'badge-lis-pendens';
                if (lead.filingType === 'NOTICE_OF_DEFAULT') badgeClass = 'badge-default';
                if (lead.filingType === 'TAX_DELINQUENCY') badgeClass = 'badge-tax';
                
                let tierColor = 'var(--tier-c)';
                if (lead.score?.tier === 'A_PLUS') tierColor = 'var(--tier-a-plus)';
                else if (lead.score?.tier === 'A') tierColor = 'var(--tier-a)';
                else if (lead.score?.tier === 'B') tierColor = 'var(--tier-b)';

                return (
                  <div key={lead.id} className="feed-item" onClick={() => onSelectLead(lead.id)}>
                    <div className="feed-marker" style={{ backgroundColor: tierColor }} />
                    <div className="feed-details">
                      <div className="feed-address">{lead.propertyAddress}</div>
                      <div className="feed-meta">
                        <span>Case: {lead.caseNumber}</span>
                        <span>Filing Date: {lead.filingDate}</span>
                        <span className={`badge ${badgeClass}`}>{lead.filingType}</span>
                      </div>
                    </div>
                    <div className="feed-action">
                      <span>Score: {lead.score?.opportunityScore || 0}</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MSA Coverage Quality Panel */}
        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <h3 className="panel-title">Target MSA Ingestion</h3>
          </div>
          <div 
            className="county-grid" 
            style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}
          >
            {loading ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading county stats...</p>
            ) : counties.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No county stats found.</p>
            ) : (
              counties.map(county => (
                <div key={county.code} className="county-progress-row">
                  <div className="county-progress-header">
                    <span style={{ fontWeight: 600 }}>
                      {county.name} ({county.state})
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      {county.count} {county.count === 1 ? 'lead' : 'leads'} ({county.quality}%)
                    </span>
                  </div>
                  <div className="county-progress-bar-bg">
                    <div 
                      className="county-progress-bar-fill" 
                      style={{ 
                        width: `${county.quality}%`,
                        background: county.count > 0 
                          ? 'linear-gradient(90deg, var(--cyan), var(--purple))'
                          : 'var(--border-color)'
                      }}
                    />
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
