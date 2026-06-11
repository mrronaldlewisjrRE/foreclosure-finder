import { useEffect, useState } from 'react';
import { Search, ShieldAlert, ShieldCheck, UserX, UserCheck, Trash2, ShieldCheck as SuperAdminIcon, Shield, Ban, Loader2, Eye, EyeOff } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '../config';

export default function UserManagementView({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // id of user currently being modified

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/admin/users`);
      if (!res.ok) throw new Error('Failed to load user accounts.');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error loading users list.');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAdmin(user) {
    if (!isSuperAdmin) {
      alert('Only Super Admin can change administrative roles.');
      return;
    }
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    const confirmMsg = `Are you sure you want to change ${user.email}'s role to ${newRole}?`;
    if (!confirm(confirmMsg)) return;

    setActionLoading(user.id);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/admin/users/${user.id}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user role.');
      alert(data.message || `Role updated to ${newRole}`);
      await fetchUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleSuspend(user) {
    const isSuspended = !user.isActive;
    const action = isSuspended ? 'reactivate' : 'suspend';
    const confirmMsg = `Are you sure you want to ${action} user ${user.email}?`;
    if (!confirm(confirmMsg)) return;

    setActionLoading(user.id);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/admin/users/${user.id}/${action}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} user.`);
      alert(data.message || `User ${action}ed successfully.`);
      await fetchUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteUser(user) {
    if (!isSuperAdmin) {
      alert('Only Super Admin can delete users.');
      return;
    }
    const confirmMsg = `WARNING: Are you sure you want to permanently delete user ${user.email}? This action is irreversible.`;
    if (!confirm(confirmMsg)) return;

    setActionLoading(user.id);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/admin/users/${user.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user.');
      alert(data.message || 'User deleted successfully.');
      await fetchUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBlockIp(user) {
    const ip = user.lastLoginIp;
    if (!ip) {
      alert('No IP address on record for this user.');
      return;
    }
    if (!isSuperAdmin) {
      alert('Only Super Admin can block IP addresses.');
      return;
    }

    const reason = prompt(`Block IP Address: ${ip}. Please enter block reason:`, 'Violation of governance rules');
    if (reason === null) return; // Cancelled

    setActionLoading(user.id);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/admin/ip/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAddress: ip, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to block IP.');
      alert(data.message || `IP ${ip} blocked.`);
      await fetchUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleMask(user) {
    const currentlyMasked = user.dataMasked !== false; // default to masked if field is missing
    const action = currentlyMasked ? 'unmask' : 'mask';
    const confirmMsg = `Are you sure you want to ${action} data access for ${user.email}?`;
    if (!confirm(confirmMsg)) return;

    setActionLoading(user.id);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/admin/users/${user.id}/data-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masked: !currentlyMasked })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} user data access.`);
      alert(data.message || `Data access ${action}ed for ${user.email}.`);
      await fetchUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  const filteredUsers = users.filter(u => 
    (u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.lastLoginIp || '').includes(searchQuery)
  );

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header panel */}
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'var(--shadow-premium)'
      }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Account & Directory Governance</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Manage platform access, roles, active workflows, and network configurations.
          </p>
        </div>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by name, email or IP..." 
            className="form-input" 
            style={{ paddingLeft: '36px' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Users table */}
      <div className="leads-table-wrapper" style={{ boxShadow: 'var(--shadow-premium)' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th>User Information</th>
              <th>System Role</th>
              <th>Join Date</th>
              <th>Last Authenticated</th>
              <th>IP Address</th>
              <th style={{ textAlign: 'center' }}>Claims</th>
              <th style={{ textAlign: 'center' }}>Sales</th>
              <th>Data Access</th>
              <th>Access Status</th>
              <th style={{ textAlign: 'right' }}>Administrative Controls</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  Retrieving governance registry database records...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No user records found matching active query bounds.
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => {
                const isUserSuperAdmin = user.role === 'SUPER_ADMIN';
                const isSelf = user.email.toLowerCase() === currentUser?.email?.toLowerCase();
                return (
                  <tr key={user.id} style={{ opacity: user.isActive ? 1 : 0.65 }}>
                    {/* User info */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="user-avatar" style={{
                          background: isUserSuperAdmin ? 'linear-gradient(135deg, var(--purple), var(--cyan))' : 'var(--bg-tertiary)',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}>
                          {user.fullName ? user.fullName.split(' ').map(n => n[0]).join('') : 'U'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.fullName || 'Unnamed Account'}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* System Role */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isUserSuperAdmin ? (
                          <span className="badge" style={{ background: 'var(--purple-glow)', color: 'var(--purple)', border: '1px solid var(--purple)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                            <SuperAdminIcon size={10} />
                            SUPER ADMIN
                          </span>
                        ) : user.role === 'ADMIN' ? (
                          <span className="badge" style={{ background: 'var(--cyan-glow)', color: 'var(--cyan)', border: '1px solid var(--cyan)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                            <Shield size={10} />
                            ADMINISTRATOR
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', fontSize: '0.7rem' }}>
                            USER
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Join Date */}
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>

                    {/* Last Login */}
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never Logged In'}
                    </td>

                    {/* IP Address */}
                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {user.lastLoginIp || 'N/A'}
                    </td>

                    {/* Claims Count */}
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {user.claimCount || 0}
                    </td>

                    {/* Sales Count */}
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--emerald)' }}>
                      {user.soldCount || 0}
                    </td>

                    {/* Data Access */}
                    <td>
                      {(() => {
                        const isMasked = user.dataMasked !== false;
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="badge" style={{
                              background: isMasked ? 'var(--rose-glow)' : 'var(--emerald-glow)',
                              color: isMasked ? 'var(--rose)' : 'var(--emerald)',
                              border: `1px solid ${isMasked ? 'var(--rose)' : 'var(--emerald)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.68rem',
                            }}>
                              {isMasked ? <EyeOff size={10} /> : <Eye size={10} />}
                              {isMasked ? 'Masked' : 'Full Access'}
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Access Status */}
                    <td>
                      {user.isActive ? (
                        <span className="badge badge-default" style={{ color: 'var(--emerald)', background: 'var(--emerald-glow)' }}>Active</span>
                      ) : (
                        <span className="badge badge-lis-pendens" style={{ color: 'var(--rose)', background: 'var(--rose-glow)' }}>Suspended</span>
                      )}
                    </td>

                    {/* Administrative Controls */}
                    <td style={{ textAlign: 'right' }}>
                      {actionLoading === user.id ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px' }}>
                          <Loader2 size={16} className="spin" style={{ color: 'var(--cyan)' }} />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {/* Make Admin Toggle */}
                          {isSuperAdmin && !isUserSuperAdmin && (
                            <button 
                              className={`btn btn-sm ${user.role === 'ADMIN' ? 'btn-secondary' : ''}`}
                              onClick={() => handleToggleAdmin(user)}
                              title={user.role === 'ADMIN' ? "Revoke Administrative Permissions" : "Promote to Administrator"}
                            >
                              {user.role === 'ADMIN' ? 'Revoke Admin' : 'Make Admin'}
                            </button>
                          )}

                          {/* Suspend / Reactivate */}
                          {!isUserSuperAdmin && !isSelf && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleToggleSuspend(user)}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                              title={user.isActive ? "Suspend User Sessions" : "Restore User Access"}
                            >
                              {user.isActive ? <UserX size={13} style={{ color: 'var(--rose)' }} /> : <UserCheck size={13} style={{ color: 'var(--emerald)' }} />}
                              {user.isActive ? 'Suspend' : 'Reactivate'}
                            </button>
                          )}

                          {/* Block IP Address */}
                          {isSuperAdmin && user.lastLoginIp && !isSelf && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleBlockIp(user)}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Ban User's Current Session IP"
                            >
                              <Ban size={13} style={{ color: 'var(--rose)' }} />
                              Block IP
                            </button>
                          )}

                          {/* Toggle Data Masking */}
                          {!isUserSuperAdmin && !isSelf && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleToggleMask(user)}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                              title={user.dataMasked !== false ? 'Grant Full Data Access' : 'Mask Data Access'}
                            >
                              {user.dataMasked !== false ? <Eye size={13} style={{ color: 'var(--emerald)' }} /> : <EyeOff size={13} style={{ color: 'var(--amber)' }} />}
                              {user.dataMasked !== false ? 'Unmask' : 'Mask'}
                            </button>
                          )}

                          {/* Delete Account */}
                          {isSuperAdmin && !isUserSuperAdmin && !isSelf && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleDeleteUser(user)}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '32px' }}
                              title="Permanently Delete Account Record"
                            >
                              <Trash2 size={13} style={{ color: 'var(--rose)' }} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
