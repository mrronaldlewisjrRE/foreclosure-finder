import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Users, Ban, AlertOctagon, History, Shield, Trash2, Calendar, Loader2 } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '../config';

export default function SecurityDashboardView() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ipToBlock, setIpToBlock] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockExpiry, setBlockExpiry] = useState('');
  const [blocking, setBlocking] = useState(false);
  const [unblockingIp, setUnblockingIp] = useState(null); // stores IP currently being unblocked

  useEffect(() => {
    fetchSecurityDashboard();
  }, []);

  async function fetchSecurityDashboard() {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/admin/security-dashboard`);
      if (!res.ok) throw new Error('Failed to load security dashboard metrics.');
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error loading security dashboard.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBlockIp(e) {
    e.preventDefault();
    if (!ipToBlock.trim()) return;

    setBlocking(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/admin/ip/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: ipToBlock.trim(),
          reason: blockReason || 'Manual Admin block',
          expiresAt: blockExpiry ? new Date(blockExpiry).toISOString() : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to block IP.');
      alert(data.message || `IP address blocked.`);
      setIpToBlock('');
      setBlockReason('');
      setBlockExpiry('');
      await fetchSecurityDashboard();
    } catch (err) {
      alert(err.message);
    } finally {
      setBlocking(false);
    }
  }

  async function handleUnblockIp(ipAddress) {
    if (!confirm(`Are you sure you want to unblock IP address ${ipAddress}?`)) return;

    setUnblockingIp(ipAddress);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/admin/ip/unblock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAddress })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unblock IP.');
      alert(data.message || `IP address unblocked.`);
      await fetchSecurityDashboard();
    } catch (err) {
      alert(err.message);
    } finally {
      setUnblockingIp(null);
    }
  }

  function getActionBadgeStyle(action) {
    if (action.includes('SUSPENDED') || action.includes('BLOCKED')) {
      return { background: 'var(--rose-glow)', color: 'var(--rose)', border: '1px solid var(--rose)' };
    }
    if (action.includes('REACTIVATED') || action.includes('UNBLOCKED') || action.includes('PROMOTED')) {
      return { background: 'var(--emerald-glow)', color: 'var(--emerald)', border: '1px solid var(--emerald)' };
    }
    return { background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' };
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page header banner */}
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: 'var(--shadow-premium)'
      }}>
        <div style={{
          background: 'var(--rose-glow)',
          border: '1px solid var(--rose)',
          borderRadius: '10px',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--rose)'
        }}>
          <ShieldAlert size={22} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Platform Security & Compliance Console</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            System logs, active session bans, brute-force monitoring, and governance compliance audits.
          </p>
        </div>
      </div>

      {loading && !metrics ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 size={32} className="spin" style={{ color: 'var(--cyan)', margin: '0 auto 12px auto' }} />
          <span>Synchronizing with secure security database cluster...</span>
        </div>
      ) : (
        <>
          {/* Metrics summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
            <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Users</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{metrics?.activeUsersCount || 0}</span>
            </div>
            
            <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Suspended Accounts</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--amber)' }}>{metrics?.suspendedUsersCount || 0}</span>
            </div>

            <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Blocked IP Bans</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--rose)' }}>{metrics?.blockedIpsCount || 0}</span>
            </div>

            <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Failed Logins</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--rose)' }}>{metrics?.failedLoginAttempts || 0}</span>
            </div>

            <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Security Events</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cyan)' }}>{metrics?.recentSecurityEvents?.length || 0}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start' }}>
            
            {/* Recent audit logs timeline */}
            <div style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '560px',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <History size={18} style={{ color: 'var(--cyan)' }} />
                <h4 style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase' }}>Security Audit Event Logs</h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {metrics?.recentSecurityEvents?.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                    No security events registered in compliance logger database.
                  </p>
                ) : (
                  metrics?.recentSecurityEvents?.map((log, idx) => (
                    <div key={idx} style={{
                      padding: '12px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="badge" style={getActionBadgeStyle(log.action)}>
                          {log.action}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {log.notes}
                      </div>

                      <div style={{ display: 'flex', gap: '10px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span>Admin: <strong style={{ color: 'var(--text-secondary)' }}>{log.adminEmail}</strong></span>
                        {log.targetUserEmail && (
                          <>
                            <span>|</span>
                            <span>Target User: <strong style={{ color: 'var(--text-secondary)' }}>{log.targetUserEmail}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* IP Banning Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Ban IP Form */}
              <form onSubmit={handleBlockIp} style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <Ban size={18} style={{ color: 'var(--rose)' }} />
                  <h4 style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase' }}>Banish IP Address Session</h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>IP Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 192.168.1.1 or 64.233.160.1"
                    className="form-input"
                    value={ipToBlock}
                    onChange={e => setIpToBlock(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Reason Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Excessive scraping or failed logins"
                    className="form-input"
                    value={blockReason}
                    onChange={e => setBlockReason(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Ban Expiry (Optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={blockExpiry}
                    onChange={e => setBlockExpiry(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={blocking}
                  className="btn"
                  style={{
                    background: 'linear-gradient(135deg, var(--rose) 0%, #b91c1c 100%)',
                    borderColor: 'var(--rose)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {blocking ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Banning IP...</span>
                    </>
                  ) : (
                    <>
                      <Ban size={16} />
                      <span>Block IP Address</span>
                    </>
                  )}
                </button>
              </form>

              {/* Blocked IPs table */}
              <div style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <AlertOctagon size={18} style={{ color: 'var(--rose)' }} />
                  <h4 style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase' }}>Active Banned IP Addresses</h4>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {metrics?.blockedIps?.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                      No active IP addresses are banned on this node.
                    </p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                          <th style={{ textAlign: 'left', padding: '8px 4px' }}>IP Address</th>
                          <th style={{ textAlign: 'left', padding: '8px 4px' }}>Reason</th>
                          <th style={{ textAlign: 'left', padding: '8px 4px' }}>Expires</th>
                          <th style={{ textAlign: 'right', padding: '8px 4px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics?.blockedIps?.map(blocked => (
                          <tr key={blocked.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '8px 4px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{blocked.ipAddress}</td>
                            <td style={{ padding: '8px 4px', color: 'var(--text-secondary)' }}>{blocked.reason}</td>
                            <td style={{ padding: '8px 4px', color: 'var(--text-muted)' }}>
                              {blocked.expiresAt ? new Date(blocked.expiresAt).toLocaleDateString() : 'Permanent'}
                            </td>
                            <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                              {unblockingIp === blocked.ipAddress ? (
                                <Loader2 size={12} className="spin" style={{ color: 'var(--cyan)' }} />
                              ) : (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleUnblockIp(blocked.ipAddress)}
                                  style={{ padding: '2px 6px', fontSize: '0.65rem', border: '1px solid var(--rose)', color: 'var(--rose)' }}
                                >
                                  Unban
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>

          </div>
        </>
      )}

    </div>
  );
}
