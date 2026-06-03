import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, CheckCircle, XCircle, Clock, Users, TrendingUp, DollarSign,
  RefreshCw, Crown, Zap, Filter, FileText, X, MessageSquare, Search,
  ArrowUpCircle, ArrowDownCircle, CalendarPlus, Ban, Infinity as InfinityIcon,
  Gift, UserPlus, ChevronDown
} from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '../config';

// ─── Reusable sub-components ──────────────────────────────

function MetricCard({ icon: Icon, iconBg, iconColor, value, label }) {
  return (
    <div style={S.metricCard}>
      <div style={{ ...S.metricIcon, background: iconBg }}><Icon size={20} style={{ color: iconColor }} /></div>
      <div><div style={S.metricValue}>{value}</div><div style={S.metricLabel}>{label}</div></div>
    </div>
  );
}

function Badge({ color, bg, children }) {
  return <span style={{ ...S.badge, color, background: bg }}>{children}</span>;
}

function PlanBadge({ plan, lifetime, comped }) {
  if (lifetime) return <Badge color="var(--amber)" bg="var(--amber-glow)"><InfinityIcon size={10} /> LIFETIME</Badge>;
  if (comped) return <Badge color="var(--pink, var(--rose))" bg="rgba(236,72,153,0.12)"><Gift size={10} /> COMP</Badge>;
  const cfg = { FREE_TRIAL: ['var(--cyan)', 'var(--cyan-glow)'], STARTER: ['var(--purple)', 'var(--purple-glow)'], PROFESSIONAL: ['var(--emerald)', 'var(--emerald-glow)'], EXPIRED: ['var(--rose)', 'var(--rose-glow)'] };
  const [c, b] = cfg[plan] || cfg.FREE_TRIAL;
  return <Badge color={c} bg={b}>{plan}</Badge>;
}

// ─── Main Component ──────────────────────────────────────

export default function SubscriptionManagementView() {
  // ── CashApp Payments tab state
  const [payments, setPayments] = useState([]);
  const [planDistribution, setPlanDistribution] = useState([]);
  const [lifetimeCount, setLifetimeCount] = useState(0);
  const [compCount, setCompCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [error, setError] = useState('');

  // ── Manual Management tab state
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' | 'manage'
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [usersTotal, setUsersTotal] = useState(0);

  // ── Modals
  const [actionModal, setActionModal] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [notesModal, setNotesModal] = useState(null);
  const [manageModal, setManageModal] = useState(null); // { user, action }
  const [manageForm, setManageForm] = useState({ plan: 'PROFESSIONAL', duration: '', notes: '' });

  // ── Load CashApp payments data
  const loadPayments = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/admin/subscriptions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPayments(data.payments || []);
      setPlanDistribution(data.plan_distribution || []);
      setLifetimeCount(data.lifetime_count || 0);
      setCompCount(data.comp_count || 0);
      setExpiredCount(data.expired_count || 0);
      setPendingPaymentCount(data.pending_count || 0);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  // ── Load users for management
  const loadUsers = useCallback(async () => {
    setUsersLoading(true); setError('');
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (userSearch) params.set('search', userSearch);
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      if (planFilter !== 'ALL') params.set('plan', planFilter);
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/admin/subscription-users?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users || []);
      setUsersTotal(data.total || 0);
    } catch (err) { setError(err.message); }
    finally { setUsersLoading(false); }
  }, [userSearch, roleFilter, planFilter]);

  useEffect(() => { loadPayments(); }, [loadPayments]);
  useEffect(() => { if (activeTab === 'manage') loadUsers(); }, [activeTab, loadUsers]);

  // ── CashApp payment actions
  async function handlePaymentAction() {
    if (!actionModal) return;
    setActionLoading(actionModal.paymentId);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/admin/subscriptions/${actionModal.paymentId}/${actionModal.action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: adminNotes.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionModal(null); setAdminNotes('');
      await loadPayments();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(null); }
  }

  // ── Manual management actions
  async function handleManageAction() {
    if (!manageModal) return;
    setActionLoading(manageModal.user.id);
    const { user, action } = manageModal;
    const body = { user_id: user.id, notes: manageForm.notes.trim() || null };

    let endpoint = '';
    if (action === 'assign') { endpoint = 'assign'; body.plan = manageForm.plan; body.duration_days = manageForm.duration || null; }
    else if (action === 'upgrade') { endpoint = 'upgrade'; body.target_plan = manageForm.plan; }
    else if (action === 'downgrade') { endpoint = 'downgrade'; body.target_plan = manageForm.plan; }
    else if (action === 'extend') { endpoint = 'extend'; body.days = parseInt(manageForm.duration, 10); }
    else if (action === 'revoke') { endpoint = 'revoke'; }
    else if (action === 'lifetime') { endpoint = 'lifetime'; }
    else if (action === 'comp') { endpoint = 'comp'; body.plan = manageForm.plan; }

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/admin/subscription/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setManageModal(null); setManageForm({ plan: 'PROFESSIONAL', duration: '', notes: '' });
      await loadUsers(); await loadPayments();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(null); }
  }

  function openManageModal(user, action) {
    const defaults = { plan: 'PROFESSIONAL', duration: '', notes: '' };
    if (action === 'upgrade') {
      defaults.plan = user.subscription_plan === 'FREE_TRIAL' ? 'STARTER' : 'PROFESSIONAL';
    } else if (action === 'downgrade') {
      defaults.plan = user.subscription_plan === 'PROFESSIONAL' ? 'STARTER' : 'FREE_TRIAL';
    } else if (action === 'extend') {
      defaults.duration = '30';
    }
    setManageForm(defaults);
    setManageModal({ user, action });
  }

  // ── Helpers
  const filteredPayments = paymentFilter === 'ALL' ? payments : payments.filter(p => p.status === paymentFilter);
  const totalRevenue = payments.filter(p => p.status === 'CONFIRMED').reduce((s, p) => s + parseFloat(p.amount), 0);
  const getPlanCount = (plan) => { const f = planDistribution.find(p => p.subscription_plan === plan); return f ? parseInt(f.count) : 0; };
  const totalUsers = planDistribution.reduce((s, p) => s + parseInt(p.count), 0);
  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const statusStyles = {
    PENDING: { bg: 'var(--amber-glow)', color: 'var(--amber)', icon: Clock },
    CONFIRMED: { bg: 'var(--emerald-glow)', color: 'var(--emerald)', icon: CheckCircle },
    REJECTED: { bg: 'var(--rose-glow)', color: 'var(--rose)', icon: XCircle },
  };

  const actionLabels = {
    assign: { title: 'Assign Plan', icon: UserPlus, color: 'var(--cyan)', btn: '✓ Assign Plan' },
    upgrade: { title: 'Upgrade Plan', icon: ArrowUpCircle, color: 'var(--emerald)', btn: '↑ Upgrade Now' },
    downgrade: { title: 'Downgrade Plan', icon: ArrowDownCircle, color: 'var(--amber)', btn: '↓ Downgrade' },
    extend: { title: 'Extend Subscription', icon: CalendarPlus, color: 'var(--cyan)', btn: '+ Extend' },
    revoke: { title: 'Revoke Subscription', icon: Ban, color: 'var(--rose)', btn: '✕ Revoke Access' },
    lifetime: { title: 'Grant Lifetime Access', icon: InfinityIcon, color: 'var(--amber)', btn: '∞ Grant Lifetime' },
    comp: { title: 'Comp Account', icon: Gift, color: 'var(--pink, var(--purple))', btn: '🎁 Comp Account' },
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div style={S.container}>
      {/* ── Enhanced Metrics Row ── */}
      <div style={S.metricsRow}>
        <MetricCard icon={DollarSign} iconBg="var(--emerald-glow)" iconColor="var(--emerald)" value={`$${totalRevenue.toFixed(2)}`} label="Revenue" />
        <MetricCard icon={Clock} iconBg="var(--cyan-glow)" iconColor="var(--cyan)" value={getPlanCount('FREE_TRIAL')} label="Active Trials" />
        <MetricCard icon={Zap} iconBg="var(--purple-glow)" iconColor="var(--purple)" value={getPlanCount('STARTER')} label="Starter" />
        <MetricCard icon={Crown} iconBg="var(--emerald-glow)" iconColor="var(--emerald)" value={getPlanCount('PROFESSIONAL')} label="Professional" />
        <MetricCard icon={InfinityIcon} iconBg="var(--amber-glow)" iconColor="var(--amber)" value={lifetimeCount} label="Lifetime" />
        <MetricCard icon={Gift} iconBg="rgba(236,72,153,0.12)" iconColor="var(--rose)" value={compCount} label="Comped" />
        <MetricCard icon={XCircle} iconBg="var(--rose-glow)" iconColor="var(--rose)" value={expiredCount} label="Expired" />
        <MetricCard icon={CreditCard} iconBg="var(--amber-glow)" iconColor="var(--amber)" value={pendingPaymentCount} label="Pending" />
      </div>

      {error && <div style={S.errorMsg}>{error} <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', marginLeft: 8 }}>✕</button></div>}

      {/* ── Tab Switcher ── */}
      <div style={S.tabRow}>
        <button onClick={() => setActiveTab('payments')} style={{ ...S.tab, ...(activeTab === 'payments' ? S.tabActive : {}) }}>
          <CreditCard size={16} /> CashApp Payments
        </button>
        <button onClick={() => setActiveTab('manage')} style={{ ...S.tab, ...(activeTab === 'manage' ? S.tabActive : {}) }}>
          <Users size={16} /> Manual Plan Management
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB 1: CashApp Payments */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === 'payments' && (
        <div style={S.section}>
          <div style={S.tableHeader}>
            <h3 style={S.sectionTitle}><CreditCard size={18} /> Subscription Payments</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Filter size={14} style={{ color: 'var(--text-muted)' }} />
              {['ALL', 'PENDING', 'CONFIRMED', 'REJECTED'].map(f => (
                <button key={f} onClick={() => setPaymentFilter(f)} style={{
                  ...S.filterBtn, background: paymentFilter === f ? 'var(--bg-tertiary)' : 'transparent',
                  color: paymentFilter === f ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: paymentFilter === f ? '1px solid var(--border-active)' : '1px solid transparent',
                }}>{f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}</button>
              ))}
              <button onClick={loadPayments} style={S.refreshBtn} title="Refresh"><RefreshCw size={14} /></button>
            </div>
          </div>
          {loading ? <div style={S.emptyState}>Loading...</div> : filteredPayments.length === 0 ? <div style={S.emptyState}>No payments found.</div> : (
            <div style={S.tableWrap}>
              <table style={S.table}><thead><tr>
                <th style={S.th}>User</th><th style={S.th}>Plan</th><th style={S.th}>Amount</th>
                <th style={S.th}>CashApp Ref</th><th style={S.th}>Status</th><th style={S.th}>Date</th><th style={S.th}>Actions</th>
              </tr></thead><tbody>
                {filteredPayments.map(p => {
                  const st = statusStyles[p.status] || statusStyles.PENDING;
                  const StIcon = st.icon;
                  return (
                    <tr key={p.id} style={S.tr}>
                      <td style={S.td}><div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.user_name || 'Unknown'}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.user_email}</div></td>
                      <td style={S.td}><PlanBadge plan={p.plan} /></td>
                      <td style={{ ...S.td, fontWeight: 700, color: 'var(--emerald)' }}>${parseFloat(p.amount).toFixed(2)}</td>
                      <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--cyan)' }}>{p.cashapp_reference || '—'}</td>
                      <td style={S.td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, background: st.bg, color: st.color }}><StIcon size={12} /> {p.status}</span></td>
                      <td style={{ ...S.td, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{fmt(p.created_at)}</td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {p.status === 'PENDING' && (<>
                            <button style={S.approveBtn} onClick={() => { setActionModal({ paymentId: p.id, action: 'confirm', payment: p }); setAdminNotes(''); }}><CheckCircle size={13} /> Approve</button>
                            <button style={S.rejectBtn} onClick={() => { setActionModal({ paymentId: p.id, action: 'reject', payment: p }); setAdminNotes(''); }}><XCircle size={13} /> Reject</button>
                          </>)}
                          <button style={S.notesBtn} onClick={() => setNotesModal(p)}><FileText size={13} /> Notes</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody></table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB 2: Manual Plan Management */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === 'manage' && (
        <div style={S.section}>
          <div style={S.tableHeader}>
            <h3 style={S.sectionTitle}><Users size={18} /> Manual Plan Assignment</h3>
            <button onClick={loadUsers} style={S.refreshBtn}><RefreshCw size={14} /></button>
          </div>

          {/* Search & Filters */}
          <div style={S.searchRow}>
            <div style={S.searchInput}>
              <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input type="text" placeholder="Search by name or email..." value={userSearch}
                onChange={e => setUserSearch(e.target.value)} style={S.input} />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={S.select}>
              <option value="ALL">All Roles</option>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
            <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} style={S.select}>
              <option value="ALL">All Plans</option>
              <option value="FREE_TRIAL">Free Trial</option>
              <option value="STARTER">Starter</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="EXPIRED">Expired</option>
              <option value="LIFETIME">Lifetime</option>
              <option value="COMP">Comped</option>
            </select>
          </div>

          {/* Users Table */}
          {usersLoading ? <div style={S.emptyState}>Loading users...</div> : users.length === 0 ? <div style={S.emptyState}>No users found.</div> : (
            <div style={S.tableWrap}>
              <table style={S.table}><thead><tr>
                <th style={S.th}>User</th><th style={S.th}>Current Plan</th><th style={S.th}>Status</th>
                <th style={S.th}>Started</th><th style={S.th}>Expires</th><th style={S.th}>Actions</th>
              </tr></thead><tbody>
                {users.map(u => (
                  <tr key={u.id} style={S.tr}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.full_name || 'Unknown'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{u.role}</div>
                    </td>
                    <td style={S.td}><PlanBadge plan={u.effective_plan || u.subscription_plan} lifetime={u.lifetime_access} comped={u.is_comped} /></td>
                    <td style={S.td}><span style={{ fontSize: '0.75rem', color: u.is_active ? 'var(--emerald)' : 'var(--rose)' }}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ ...S.td, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{fmt(u.subscription_started_at)}</td>
                    <td style={{ ...S.td, fontSize: '0.8rem', color: u.lifetime_access ? 'var(--amber)' : 'var(--text-secondary)' }}>
                      {u.lifetime_access ? '∞ Never' : fmt(u.subscription_expires_at)}
                    </td>
                    <td style={S.td}>
                      <div style={S.actionsDropdown}>
                        <button style={S.assignBtn} onClick={() => openManageModal(u, 'assign')}><UserPlus size={12} /> Assign</button>
                        <button style={S.upgradeBtn} onClick={() => openManageModal(u, 'upgrade')}><ArrowUpCircle size={12} /> Upgrade</button>
                        <button style={S.downgradeBtn} onClick={() => openManageModal(u, 'downgrade')}><ArrowDownCircle size={12} /> Downgrade</button>
                        <button style={S.extendBtn} onClick={() => openManageModal(u, 'extend')}><CalendarPlus size={12} /> Extend</button>
                        <button style={S.lifetimeBtn} onClick={() => openManageModal(u, 'lifetime')}><InfinityIcon size={12} /> Lifetime</button>
                        <button style={S.compBtn} onClick={() => openManageModal(u, 'comp')}><Gift size={12} /> Comp</button>
                        <button style={S.revokeBtn} onClick={() => openManageModal(u, 'revoke')}><Ban size={12} /> Revoke</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody></table>
              <div style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>{usersTotal} total users</div>
            </div>
          )}
        </div>
      )}

      {/* ═══ CashApp Approve/Reject Modal ═══ */}
      {actionModal && (
        <div style={S.overlay} onClick={() => !actionLoading && setActionModal(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHead}>
              <h3 style={S.modalTitle}>{actionModal.action === 'confirm' ? <><CheckCircle size={20} style={{ color: 'var(--emerald)' }} /> Approve Payment</> : <><XCircle size={20} style={{ color: 'var(--rose)' }} /> Reject Payment</>}</h3>
              <button style={S.modalX} onClick={() => setActionModal(null)}><X size={18} /></button>
            </div>
            <div style={S.summaryBox}>
              {[['User', `${actionModal.payment.user_name} (${actionModal.payment.user_email})`], ['Plan', actionModal.payment.plan], ['Amount', `$${parseFloat(actionModal.payment.amount).toFixed(2)}`], ['CashApp Ref', actionModal.payment.cashapp_reference], ['Date', fmt(actionModal.payment.created_at)]].map(([l, v], i) => (
                <div key={i} style={S.summaryRow}><span style={S.summaryL}>{l}</span><span style={S.summaryV}>{v}</span></div>
              ))}
            </div>
            <div style={S.formGroup}><label style={S.label}><MessageSquare size={14} /> Admin Notes</label>
              <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Optional notes..." style={S.textarea} rows={3} disabled={!!actionLoading} /></div>
            <div style={S.modalActions}>
              <button style={S.cancelBtn} onClick={() => setActionModal(null)} disabled={!!actionLoading}>Cancel</button>
              <button style={{ ...S.actionBtn, background: actionModal.action === 'confirm' ? 'var(--emerald)' : 'var(--rose)', opacity: actionLoading ? 0.7 : 1 }} onClick={handlePaymentAction} disabled={!!actionLoading}>{actionLoading ? 'Processing...' : actionModal.action === 'confirm' ? '✓ Approve & Activate' : '✕ Reject Payment'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ View Notes Modal ═══ */}
      {notesModal && (
        <div style={S.overlay} onClick={() => setNotesModal(null)}>
          <div style={{ ...S.modal, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={S.modalHead}><h3 style={S.modalTitle}><FileText size={20} style={{ color: 'var(--cyan)' }} /> Payment Notes</h3><button style={S.modalX} onClick={() => setNotesModal(null)}><X size={18} /></button></div>
            <div style={S.summaryBox}>
              {[['User', `${notesModal.user_name} (${notesModal.user_email})`], ['Plan', notesModal.plan], ['Amount', `$${parseFloat(notesModal.amount).toFixed(2)}`], ['CashApp Ref', notesModal.cashapp_reference || '—'], ['Status', notesModal.status], ['Submitted', fmt(notesModal.created_at)], ...(notesModal.confirmed_at ? [['Reviewed', fmt(notesModal.confirmed_at)]] : []), ...(notesModal.confirmed_by_email ? [['By', notesModal.confirmed_by_email]] : [])].map(([l, v], i) => (
                <div key={i} style={S.summaryRow}><span style={S.summaryL}>{l}</span><span style={S.summaryV}>{v}</span></div>
              ))}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={S.label}><MessageSquare size={14} /> Admin Notes</label>
              {notesModal.admin_notes ? <div style={S.notesBox}>{notesModal.admin_notes}</div> : <div style={S.noNotes}>No notes recorded.</div>}
            </div>
            <button style={S.closeBtn} onClick={() => setNotesModal(null)}>Close</button>
          </div>
        </div>
      )}

      {/* ═══ Manual Management Action Modal ═══ */}
      {manageModal && (() => {
        const cfg = actionLabels[manageModal.action];
        const Icon = cfg.icon;
        const needsPlan = ['assign', 'upgrade', 'downgrade', 'comp'].includes(manageModal.action);
        const needsDuration = ['assign', 'extend'].includes(manageModal.action);
        const isDestructive = manageModal.action === 'revoke';
        return (
          <div style={S.overlay} onClick={() => !actionLoading && setManageModal(null)}>
            <div style={S.modal} onClick={e => e.stopPropagation()}>
              <div style={S.modalHead}>
                <h3 style={S.modalTitle}><Icon size={20} style={{ color: cfg.color }} /> {cfg.title}</h3>
                <button style={S.modalX} onClick={() => setManageModal(null)}><X size={18} /></button>
              </div>
              <div style={S.summaryBox}>
                {[['User', manageModal.user.full_name || 'Unknown'], ['Email', manageModal.user.email], ['Current Plan', manageModal.user.effective_plan || manageModal.user.subscription_plan], ['Role', manageModal.user.role]].map(([l, v], i) => (
                  <div key={i} style={S.summaryRow}><span style={S.summaryL}>{l}</span><span style={S.summaryV}>{v}</span></div>
                ))}
                {manageModal.user.lifetime_access && <div style={S.summaryRow}><span style={S.summaryL}>Flags</span><span style={{ ...S.summaryV, color: 'var(--amber)' }}>LIFETIME</span></div>}
                {manageModal.user.is_comped && <div style={S.summaryRow}><span style={S.summaryL}>Flags</span><span style={{ ...S.summaryV, color: 'var(--rose)' }}>COMPED</span></div>}
              </div>

              {needsPlan && (
                <div style={S.formGroup}><label style={S.label}>Target Plan</label>
                  <select value={manageForm.plan} onChange={e => setManageForm({ ...manageForm, plan: e.target.value })} style={S.select}>
                    {manageModal.action === 'downgrade'
                      ? <>{manageModal.user.subscription_plan === 'PROFESSIONAL' && <option value="STARTER">Starter</option>}<option value="FREE_TRIAL">Free Trial</option></>
                      : manageModal.action === 'upgrade'
                        ? <>{manageModal.user.subscription_plan === 'FREE_TRIAL' && <option value="STARTER">Starter</option>}<option value="PROFESSIONAL">Professional</option></>
                        : <><option value="FREE_TRIAL">Free Trial</option><option value="STARTER">Starter</option><option value="PROFESSIONAL">Professional</option></>
                    }
                  </select>
                </div>
              )}

              {needsDuration && (
                <div style={S.formGroup}><label style={S.label}>{manageModal.action === 'extend' ? 'Days to Add' : 'Duration (Days)'}</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    {[7, 30, 90, 365].map(d => (
                      <button key={d} onClick={() => setManageForm({ ...manageForm, duration: String(d) })} style={{
                        ...S.durationBtn, background: manageForm.duration === String(d) ? 'var(--bg-tertiary)' : 'transparent',
                        borderColor: manageForm.duration === String(d) ? 'var(--border-active)' : 'var(--border-color)',
                        color: manageForm.duration === String(d) ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}>{d} Days</button>
                    ))}
                  </div>
                  <input type="number" placeholder="Custom days..." value={manageForm.duration}
                    onChange={e => setManageForm({ ...manageForm, duration: e.target.value })} style={{ ...S.input, width: '100%' }} min="1" />
                </div>
              )}

              <div style={S.formGroup}><label style={S.label}><MessageSquare size={14} /> Notes</label>
                <textarea value={manageForm.notes} onChange={e => setManageForm({ ...manageForm, notes: e.target.value })}
                  placeholder="Reason for this action..." style={S.textarea} rows={2} disabled={!!actionLoading} /></div>

              {isDestructive && (
                <div style={{ background: 'var(--rose-glow)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem', color: 'var(--rose)', marginBottom: 16 }}>
                  ⚠️ This will immediately revoke the user's access. They will be redirected to the pricing page on next login.
                </div>
              )}

              <div style={S.modalActions}>
                <button style={S.cancelBtn} onClick={() => setManageModal(null)} disabled={!!actionLoading}>Cancel</button>
                <button style={{ ...S.actionBtn, background: cfg.color, opacity: actionLoading ? 0.7 : 1 }}
                  onClick={handleManageAction} disabled={!!actionLoading}>
                  {actionLoading ? 'Processing...' : cfg.btn}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────
const S = {
  container: { padding: 0 },
  metricsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 },
  metricCard: { display: 'flex', alignItems: 'center', gap: 14, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', backdropFilter: 'var(--glass-blur)' },
  metricIcon: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  metricValue: { fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' },
  metricLabel: { fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 },

  badge: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.3px' },

  tabRow: { display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-tertiary)', borderRadius: 14, padding: 4 },
  tab: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'var(--font-sans)' },
  tabActive: { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },

  section: { background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 24, backdropFilter: 'var(--glass-blur)' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },

  searchRow: { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  searchInput: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, padding: '8px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10 },
  input: { background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.88rem', flex: 1, fontFamily: 'var(--font-sans)' },
  select: { padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-sans)', cursor: 'pointer', outline: 'none' },

  filterBtn: { padding: '5px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'var(--font-sans)' },
  refreshBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 6, color: 'var(--text-muted)', cursor: 'pointer' },

  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-color)' },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { padding: '10px 12px', fontSize: '0.85rem', color: 'var(--text-primary)', verticalAlign: 'middle' },

  actionsDropdown: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  approveBtn: { ...actionBtnBase('var(--emerald-glow)', 'rgba(16,185,129,0.3)', 'var(--emerald)') },
  rejectBtn: { ...actionBtnBase('var(--rose-glow)', 'rgba(239,68,68,0.3)', 'var(--rose)') },
  notesBtn: { ...actionBtnBase('var(--cyan-glow)', 'rgba(6,182,212,0.3)', 'var(--cyan)') },
  assignBtn: { ...actionBtnBase('var(--cyan-glow)', 'rgba(6,182,212,0.3)', 'var(--cyan)') },
  upgradeBtn: { ...actionBtnBase('var(--emerald-glow)', 'rgba(16,185,129,0.3)', 'var(--emerald)') },
  downgradeBtn: { ...actionBtnBase('var(--amber-glow)', 'rgba(245,158,11,0.3)', 'var(--amber)') },
  extendBtn: { ...actionBtnBase('var(--cyan-glow)', 'rgba(6,182,212,0.3)', 'var(--cyan)') },
  lifetimeBtn: { ...actionBtnBase('var(--amber-glow)', 'rgba(245,158,11,0.3)', 'var(--amber)') },
  compBtn: { ...actionBtnBase('rgba(236,72,153,0.12)', 'rgba(236,72,153,0.3)', 'var(--rose)') },
  revokeBtn: { ...actionBtnBase('var(--rose-glow)', 'rgba(239,68,68,0.3)', 'var(--rose)') },

  durationBtn: { padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s ease' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 },
  modal: { background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 32, maxWidth: 520, width: '100%', boxShadow: 'var(--shadow-premium)', maxHeight: '90vh', overflowY: 'auto' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  modalX: { background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 6, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  summaryBox: { background: 'var(--bg-tertiary)', borderRadius: 14, padding: 16, marginBottom: 20, border: '1px solid var(--border-color)' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  summaryL: { fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 },
  summaryV: { fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' },

  formGroup: { marginBottom: 16 },
  label: { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 },
  textarea: { width: '100%', padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-sans)', resize: 'vertical', minHeight: 60, boxSizing: 'border-box' },
  modalActions: { display: 'flex', gap: 12 },
  cancelBtn: { flex: 1, padding: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 12, color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' },
  actionBtn: { flex: 2, padding: 12, border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'opacity 0.2s' },

  notesBox: { background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 14, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  noNotes: { background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 14, fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' },
  closeBtn: { width: '100%', padding: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 12, color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' },

  emptyState: { textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: '0.9rem' },
  errorMsg: { display: 'flex', alignItems: 'center', background: 'var(--rose-glow)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--rose)', padding: '10px 14px', borderRadius: 10, fontSize: '0.82rem', marginBottom: 16 },
};

function actionBtnBase(bg, border, color) {
  return { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 7, fontSize: '0.7rem', fontWeight: 600, background: bg, border: `1px solid ${border}`, color, cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'var(--font-sans)' };
}
