import React, { useEffect, useState } from 'react';
import { Search, Phone, FileText, DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle, ChevronRight, RefreshCw, Plus } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '../config';

const PIPELINE_STAGES_ORDER = ['New Lead', 'Contact Attempted', 'Follow Up', 'Negotiating', 'Appointment Set', 'Under Contract'];

export default function CommandCenterDashboard({ onViewChange, user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/command-center/stats`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching command center stats:', err);
    } finally {
      setLoading(false);
    }
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <RefreshCw size={24} className="spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  const s = stats || {};

  return (
    <div className="command-center">
      {/* Greeting Bar */}
      <div className="cc-greeting">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {greeting()}, {user?.name?.split(' ')[0] || 'Wholesaler'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button onClick={fetchStats} className="cc-refresh-btn">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="cc-kpi-row">
        <div className="cc-kpi-card" onClick={() => onViewChange?.('deal_radar')}>
          <div className="cc-kpi-icon" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
            <Search size={18} />
          </div>
          <div className="cc-kpi-value">{s.leadsAddedToday || 0}</div>
          <div className="cc-kpi-label">Leads Added Today</div>
        </div>

        <div className="cc-kpi-card" onClick={() => onViewChange?.('acquisition')}>
          <div className="cc-kpi-icon" style={{ background: 'var(--amber-glow)', color: 'var(--amber)' }}>
            <Clock size={18} />
          </div>
          <div className="cc-kpi-value">{s.followUpsDueTodayCount || 0}</div>
          <div className="cc-kpi-label">Follow-Ups Due</div>
        </div>

        <div className="cc-kpi-card" onClick={() => onViewChange?.('acquisition')}>
          <div className="cc-kpi-icon" style={{ background: 'var(--cyan-glow)', color: 'var(--cyan)' }}>
            <FileText size={18} />
          </div>
          <div className="cc-kpi-value">{s.dealsUnderContract || 0}</div>
          <div className="cc-kpi-label">Under Contract</div>
        </div>

        <div className="cc-kpi-card">
          <div className="cc-kpi-icon" style={{ background: 'var(--purple-glow)', color: 'var(--purple)' }}>
            <Search size={18} />
          </div>
          <div className="cc-kpi-value">{s.activeBuyerSearches || 0}</div>
          <div className="cc-kpi-label">Buyer Searches</div>
        </div>

        <div className="cc-kpi-card" style={{ borderColor: 'rgba(34, 197, 94, 0.2)' }}>
          <div className="cc-kpi-icon" style={{ background: 'var(--emerald-glow)', color: 'var(--emerald)' }}>
            <DollarSign size={18} />
          </div>
          <div className="cc-kpi-value" style={{ color: 'var(--emerald)' }}>{formatCurrency(s.revenueThisMonth)}</div>
          <div className="cc-kpi-label">Revenue This Month</div>
        </div>
      </div>

      {/* Two-Column Layout: Priorities + Pipeline */}
      <div className="cc-grid-2col">
        {/* Left: Today's Priorities */}
        <div className="cc-panel">
          <div className="cc-panel-header">
            <h3><Clock size={16} /> Today's Priorities</h3>
            <span className="cc-badge">{(s.followUpsDueToday || []).length} items</span>
          </div>
          <div className="cc-panel-body">
            {(s.followUpsDueToday || []).length === 0 ? (
              <div className="cc-empty">
                <CheckCircle size={20} style={{ color: 'var(--emerald)' }} />
                <span>You're all caught up!</span>
              </div>
            ) : (
              (s.followUpsDueToday || []).map((task, i) => (
                <div key={task.id || i} className="cc-priority-item">
                  <div className="cc-priority-icon">
                    <AlertCircle size={14} style={{ color: 'var(--amber)' }} />
                  </div>
                  <div className="cc-priority-info">
                    <span className="cc-priority-title">{task.propertyAddress}</span>
                    <span className="cc-priority-sub">{task.title}</span>
                  </div>
                  <span className="cc-priority-time">
                    {task.dueAt ? formatDate(task.dueAt) : 'Today'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Pipeline Snapshot */}
        <div className="cc-panel">
          <div className="cc-panel-header">
            <h3><TrendingUp size={16} /> Pipeline Snapshot</h3>
            <span className="cc-badge">{s.totalPipelineLeads || 0} total</span>
          </div>
          <div className="cc-panel-body">
            {PIPELINE_STAGES_ORDER.map(stage => {
              const match = (s.pipelineCounts || []).find(p => p.stage === stage);
              const count = match ? match.count : 0;
              const maxCount = Math.max(...(s.pipelineCounts || []).map(p => p.count), 1);
              const widthPct = Math.max((count / maxCount) * 100, 4);

              return (
                <div key={stage} className="cc-pipeline-row">
                  <span className="cc-pipeline-label">{stage}</span>
                  <div className="cc-pipeline-bar-track">
                    <div
                      className="cc-pipeline-bar-fill"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="cc-pipeline-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Contracts + Revenue */}
      <div className="cc-grid-2col">
        <div className="cc-panel">
          <div className="cc-panel-header">
            <h3><FileText size={16} /> Contracts Pending</h3>
            <span className="cc-badge">{s.contractsPending || 0}</span>
          </div>
          <div className="cc-panel-body">
            {(s.contractsPending || 0) === 0 ? (
              <div className="cc-empty">
                <FileText size={20} style={{ color: 'var(--text-muted)' }} />
                <span>No pending contracts</span>
              </div>
            ) : (
              <div className="cc-stat-highlight">
                <span className="cc-stat-number">{s.contractsPending}</span>
                <span className="cc-stat-desc">contracts awaiting action</span>
              </div>
            )}
          </div>
        </div>

        <div className="cc-panel">
          <div className="cc-panel-header">
            <h3><DollarSign size={16} /> Recent Revenue</h3>
          </div>
          <div className="cc-panel-body">
            {(s.recentRevenue || []).length === 0 ? (
              <div className="cc-empty">
                <DollarSign size={20} style={{ color: 'var(--text-muted)' }} />
                <span>No closed deals yet</span>
              </div>
            ) : (
              (s.recentRevenue || []).map((rev, i) => (
                <div key={i} className="cc-priority-item">
                  <div className="cc-priority-icon">
                    <CheckCircle size={14} style={{ color: 'var(--emerald)' }} />
                  </div>
                  <div className="cc-priority-info">
                    <span className="cc-priority-title">{rev.propertyAddress}</span>
                    <span className="cc-priority-sub">Closed {formatDate(rev.closedAt)}</span>
                  </div>
                  <span style={{ color: 'var(--emerald)', fontWeight: 600, fontSize: '0.82rem' }}>
                    {formatCurrency(rev.assignmentFee)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
