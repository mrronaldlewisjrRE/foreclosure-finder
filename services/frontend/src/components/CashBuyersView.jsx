import { useState, useEffect } from 'react';
import { Shield, TrendingUp, DollarSign, Building, ArrowRight, User } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '../config';

export default function CashBuyersView() {
  const [buyers, setBuyers] = useState([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState(null);
  const [buyerDetail, setBuyerDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function fetchBuyers() {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/cash-buyers`);
      const data = await res.json();
      setBuyers(data.buyers || []);
      if (data.buyers && data.buyers.length > 0) {
        setSelectedBuyerId(data.buyers[0].id);
      }
    } catch (err) {
      console.error('Error fetching cash buyers:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBuyerDetail(id) {
    setLoadingDetail(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/cash-buyers/${id}`);
      const data = await res.json();
      setBuyerDetail(data);
    } catch (err) {
      console.error('Error fetching cash buyer details:', err);
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    fetchBuyers();
  }, []);

  useEffect(() => {
    if (selectedBuyerId) {
      fetchBuyerDetail(selectedBuyerId);
    }
  }, [selectedBuyerId]);

  // Calculate top-level stats
  const totalBuyers = buyers.length;
  const totalPurchases = buyers.reduce((sum, b) => sum + (b.purchaseCount || 0), 0);
  const avgPurchasePrice = buyers.length > 0 
    ? Math.round(buyers.reduce((sum, b) => sum + parseFloat(b.averagePurchasePrice || 0), 0) / buyers.length)
    : 0;
  
  const topBuyer = buyers.length > 0
    ? buyers.reduce((prev, current) => (prev.purchaseCount > current.purchaseCount) ? prev : current)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      {/* Stats Cards */}
      <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <div className="stat-card cyan">
          <div className="stat-header">
            <span className="stat-title">Cash Buyers Detected</span>
            <div className="stat-icon-wrapper"><Building size={20} /></div>
          </div>
          <div className="stat-value">{totalBuyers}</div>
          <div className="stat-subtitle">Institutional & LLC Entities</div>
        </div>

        <div className="stat-card emerald">
          <div className="stat-header">
            <span className="stat-title">Total Cash Acquisitions</span>
            <div className="stat-icon-wrapper"><TrendingUp size={20} /></div>
          </div>
          <div className="stat-value">{totalPurchases}</div>
          <div className="stat-subtitle">Deals Completed in Southern Region</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-header">
            <span className="stat-title">Average Buy Price</span>
            <div className="stat-icon-wrapper"><DollarSign size={20} /></div>
          </div>
          <div className="stat-value">${avgPurchasePrice.toLocaleString()}</div>
          <div className="stat-subtitle">Median Cash Transaction Value</div>
        </div>

        <div className="stat-card rose">
          <div className="stat-header">
            <span className="stat-title">Top Active Investor</span>
            <div className="stat-icon-wrapper"><Shield size={20} /></div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.1rem', lineHeight: '1.8rem', fontWeight: 800 }}>
            {topBuyer ? topBuyer.entityName : 'N/A'}
          </div>
          <div className="stat-subtitle">{topBuyer ? `${topBuyer.purchaseCount} Verified Acquisitions` : ''}</div>
        </div>
      </div>

      {/* Split Row */}
      <div className="dashboard-row" style={{ gridTemplateColumns: '7fr 5fr', gap: '24px' }}>
        {/* Left Side: Buyers List */}
        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-header">
            <span className="panel-title">Active Institutional & LLC Buyers</span>
          </div>

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading corporate cash buyer list...
            </div>
          ) : (
            <div style={{ overflowY: 'auto', maxHeight: '500px' }}>
              <table className="leads-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Entity Name</th>
                    <th>First Buy</th>
                    <th>Last Buy</th>
                    <th>Total Deals</th>
                    <th>Average Buy Price</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {buyers.map(b => (
                    <tr 
                      key={b.id} 
                      onClick={() => setSelectedBuyerId(b.id)}
                      style={{ 
                        cursor: 'pointer',
                        background: selectedBuyerId === b.id ? 'rgba(6, 182, 212, 0.08)' : 'transparent'
                      }}
                    >
                      <td style={{ fontWeight: 700 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <User size={14} style={{ color: 'var(--cyan)' }} />
                          {b.entityName}
                        </span>
                      </td>
                      <td>{b.firstPurchaseDate ? new Date(b.firstPurchaseDate).toLocaleDateString() : 'N/A'}</td>
                      <td>{b.lastPurchaseDate ? new Date(b.lastPurchaseDate).toLocaleDateString() : 'N/A'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--cyan)' }}>{b.purchaseCount}</td>
                      <td style={{ fontWeight: 700, color: 'var(--emerald)' }}>
                        ${Math.round(parseFloat(b.averagePurchasePrice || 0)).toLocaleString()}
                      </td>
                      <td>
                        <ArrowRight size={14} style={{ color: selectedBuyerId === b.id ? 'var(--cyan)' : 'var(--text-muted)' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Buyer Profile Details */}
        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel-header" style={{ marginBottom: 0 }}>
            <span className="panel-title">Buyer Intelligence Summary</span>
          </div>

          {loadingDetail || !buyerDetail ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {loadingDetail ? 'Loading Buyer Intelligence...' : 'Select a buyer to view activity history'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Profile Card */}
              <div style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                padding: '16px' 
              }}>
                <h4 style={{ color: 'var(--cyan)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>
                  {buyerDetail.buyer?.entity_name}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Acquisitions:</span>
                    <strong style={{ display: 'block', color: 'var(--text-primary)', marginTop: '2px' }}>
                      {buyerDetail.buyer?.purchase_count} Properties
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Avg Transaction:</span>
                    <strong style={{ display: 'block', color: 'var(--emerald)', marginTop: '2px' }}>
                      ${Math.round(parseFloat(buyerDetail.buyer?.average_purchase_price || 0)).toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Transactions Timeline */}
              <div>
                <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: 700 }}>
                  Recent Purchases
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {buyerDetail.transactions?.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No recent purchases found.</div>
                  ) : (
                    buyerDetail.transactions.map(tx => (
                      <div 
                        key={tx.id} 
                        style={{ 
                          background: 'rgba(255,255,255,0.02)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '6px', 
                          padding: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div>
                          <strong style={{ display: 'block', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {tx.propertyAddress}
                          </strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            County: {tx.countyCode} | {new Date(tx.purchaseDate).toLocaleDateString()}
                          </span>
                        </div>
                        <span style={{ color: 'var(--emerald)', fontWeight: 700 }}>
                          ${Math.round(parseFloat(tx.purchasePrice || 0)).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Activity Feed */}
              <div>
                <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: 700 }}>
                  Activity Trends & Alerts
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {buyerDetail.activity?.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No activities recorded.</div>
                  ) : (
                    buyerDetail.activity.map(act => (
                      <div 
                        key={act.id} 
                        style={{ 
                          borderLeft: '2px solid var(--cyan)',
                          paddingLeft: '10px',
                          fontSize: '0.78rem',
                          marginBottom: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <strong style={{ color: 'var(--cyan)' }}>{act.activityType}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                            {new Date(act.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{act.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
