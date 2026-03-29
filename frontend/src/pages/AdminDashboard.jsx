import React, { useState, useEffect, useCallback } from 'react';
import Toast from '../components/Toast';
import api from '../services/apiService';

const TABS = [
  { id: 'overview',      icon: '📊', label: 'Overview'      },
  { id: 'kyc',           icon: '🪪', label: 'KYC Requests'  },
  { id: 'users',         icon: '👥', label: 'Users'         },
  { id: 'activity',      icon: '📋', label: 'Activity Log'  },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
];

const getAdminUser = () => {
  try { return JSON.parse(localStorage.getItem('ef-admin-user') || 'null'); }
  catch { return null; }
};

const adminCfg = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('ef-admin-token')}` }
});

export default function AdminDashboard() {
  const [tab, setTab]               = useState('overview');
  const [toast, setToast]           = useState(null);
  const [stats, setStats]           = useState(null);
  const [users, setUsers]           = useState([]);
  const [activities, setActivities] = useState([]);
  const [pendingKYC, setPendingKYC] = useState([]);
  const [loading, setLoading]       = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = adminCfg();
      const [statsRes, usersRes, actRes] = await Promise.allSettled([
        api.get('/admin/stats', cfg),
        api.get('/users', cfg),
        api.get('/activity', cfg),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.stats);
      if (usersRes.status === 'fulfilled') {
        const allUsers = usersRes.value.data.users || [];
        setUsers(allUsers);
        setPendingKYC(allUsers.filter(u => u.kycStatus === 'pending'));
      }
      if (actRes.status === 'fulfilled') setActivities(actRes.value.data.activities || []);
    } catch (e) {
      setToast({ message: 'Failed to load: ' + e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ef-admin-token');
    const user  = getAdminUser();
    if (!token || user?.role !== 'admin') {
      window.location.href = '/admin/login';
      return;
    }
    fetchAll();
  }, []);

  const approveKYC = async (userId, userName) => {
    try {
      await api.put(`/admin/kyc/${userId}/approve`, {}, adminCfg());
      setToast({ message: `✅ KYC approved for ${userName}`, type: 'success' });
      fetchAll();
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Approval failed', type: 'error' });
    }
  };

  const rejectKYC = async (userId, userName) => {
    try {
      await api.put(`/admin/kyc/${userId}/reject`, {}, adminCfg());
      setToast({ message: `❌ KYC rejected for ${userName}`, type: 'success' });
      fetchAll();
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Rejection failed', type: 'error' });
    }
  };

  const deactivateUser = async (userId, userName) => {
    if (!window.confirm(`Deactivate ${userName}?`)) return;
    try {
      await api.put(`/admin/users/${userId}/deactivate`, {}, adminCfg());
      setToast({ message: `User ${userName} deactivated`, type: 'success' });
      fetchAll();
    } catch (e) {
      setToast({ message: 'Failed', type: 'error' });
    }
  };

  // ── DELETE USER — frees wallet for reuse ──────────────
  const deleteUser = async (userId, userName) => {
    if (!window.confirm(`Permanently delete ${userName}?\n\nThis will:\n✅ Free their wallet for reuse\n✅ Remove from all records\n❌ Cannot be undone`)) return;
    try {
      await api.delete(`/admin/users/${userId}`, adminCfg());
      setToast({ message: `🗑️ ${userName} deleted — wallet is now free to reuse!`, type: 'success' });
      fetchAll();
    } catch (e) {
      setToast({ message: 'Delete failed: ' + (e.response?.data?.message || e.message), type: 'error' });
    }
  };

  const exportCSV = (data, filename) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([headers + '\n' + rows], { type: 'text/csv' }));
    a.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  const adminUser = getAdminUser();

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '2.5rem' }}>⚙️</div>
      <p style={{ color: 'var(--text-secondary)' }}>Loading admin dashboard...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Top Bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,15,30,0.97)', borderBottom: '1px solid rgba(239,68,68,0.2)', backdropFilter: 'blur(20px)', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#ef4444,#991b1b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>⚙️</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'white' }}>EqualFund Admin</div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)' }}>Control Panel</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {pendingKYC.length > 0 && (
              <div onClick={() => setTab('kyc')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '8px', padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, cursor: 'pointer' }}>
                🚨 {pendingKYC.length} KYC pending
              </div>
            )}
            <span style={{ fontSize: '0.82rem', color: 'white', fontWeight: 600 }}>{adminUser?.name || 'Admin'}</span>
            <a href="/" style={{ padding: '0.375rem 0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', textDecoration: 'none' }}>← Main Site</a>
            <button onClick={() => { localStorage.removeItem('ef-admin-token'); localStorage.removeItem('ef-admin-user'); window.location.href = '/admin/login'; }}
              style={{ padding: '0.375rem 0.75rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer' }}>
              🔐 Logout
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>⚙️ Admin Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Welcome back, {adminUser?.name || 'Admin'}</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '2rem', overflowX: 'auto', padding: '0.375rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', background: tab === t.id ? 'linear-gradient(135deg,#06b6d4,#8b5cf6)' : 'transparent', color: tab === t.id ? 'white' : 'var(--text-secondary)' }}>
              {t.icon} {t.label}
              {t.id === 'kyc' && pendingKYC.length > 0 && (
                <span style={{ background: '#ef4444', color: 'white', borderRadius: '99px', fontSize: '0.62rem', padding: '1px 5px', fontWeight: 800 }}>{pendingKYC.length}</span>
              )}
            </button>
          ))}
          <button onClick={fetchAll} style={{ padding: '0.625rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.82rem' }}>🔄 Refresh</button>
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '1rem' }}>
              {[
                { label: 'Total Users',  val: stats?.totalUsers  || users.length || 0, icon: '👥', color: '#06b6d4' },
                { label: 'Borrowers',    val: stats?.borrowers   || 0, icon: '💸', color: '#8b5cf6' },
                { label: 'Lenders',      val: stats?.lenders     || 0, icon: '📈', color: '#22c55e' },
                { label: 'KYC Verified', val: stats?.kycVerified || 0, icon: '✅', color: '#22c55e' },
                { label: 'KYC Pending',  val: pendingKYC.length  || 0, icon: '⏳', color: '#f59e0b' },
                { label: 'Activities',   val: activities.length  || 0, icon: '📋', color: '#f43f5e' },
              ].map(s => (
                <div key={s.label} className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>👥 Recent Users</h3>
                {users.slice(0, 6).map(u => (
                  <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                      {u.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                    </div>
                    <KYCBadge status={u.kycStatus} />
                  </div>
                ))}
              </div>

              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>📋 Recent Activity</h3>
                {activities.slice(0, 6).map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: '1rem' }}>{ACTION_ICONS[a.action] || '📌'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>{a.action?.replace(/_/g,' ')}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{a.details?.description || ''}</div>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{timeAgo(a.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* KYC */}
        {tab === 'kyc' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>🪪 KYC Verification Requests</h2>
            </div>

            {users.length === 0 && (
              <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No users yet.</p>
              </div>
            )}

            {['pending', 'verified', 'rejected', 'none'].map(status => {
              const group = users.filter(u => u.kycStatus === status);
              if (!group.length) return null;
              return (
                <div key={status} style={{ marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {status === 'pending' ? '⏳' : status === 'verified' ? '✅' : status === 'rejected' ? '❌' : '⭕'} {status} ({group.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {group.map(u => {
                      const uid    = u._id || u.id;
                      const hashes = (u.kycIpfsHash || '').split('|').filter(Boolean);
                      return (
                        <div key={uid} className="glass-card" style={{ padding: '1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                              {u.name?.[0]?.toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: '180px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{u.name}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{u.email}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                {u.walletAddress ? `${u.walletAddress.slice(0,12)}...` : 'No wallet'}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                Submitted: {timeAgo(u.updatedAt)}
                              </div>
                            </div>

                            {hashes.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>📎 DOCUMENTS</div>
                                {hashes.map((hash, i) => (
                                  hash && !hash.startsWith('QmMock') ? (
                                    <a key={i} href={`https://gateway.pinata.cloud/ipfs/${hash}`} target="_blank" rel="noreferrer"
                                      style={{ fontSize: '0.75rem', color: '#06b6d4', textDecoration: 'none', background: 'rgba(6,182,212,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                                      🔗 {['Front ID','Back ID','Selfie'][i] || `Doc ${i+1}`}
                                    </a>
                                  ) : (
                                    <span key={i} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                      {['Front ID','Back ID','Selfie'][i]}: Demo
                                    </span>
                                  )
                                ))}
                              </div>
                            )}

                            {status === 'pending' && (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button onClick={() => approveKYC(uid, u.name)}
                                  style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
                                  ✅ Approve
                                </button>
                                <button onClick={() => rejectKYC(uid, u.name)}
                                  style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
                                  ❌ Reject
                                </button>
                              </div>
                            )}
                            {status === 'verified' && <span style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontWeight: 700, fontSize: '0.82rem' }}>✅ Verified</span>}
                            {status === 'rejected' && <span style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 700, fontSize: '0.82rem' }}>❌ Rejected</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>👥 All Users ({users.length})</h2>
              <button onClick={() => exportCSV(users.map(u => ({ name: u.name, email: u.email, role: u.role, kyc: u.kycStatus, score: u.creditScore, wallet: u.walletAddress||'', joined: u.createdAt })), 'users')}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>⬇ Export CSV</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['User','Email','Role','KYC','Score','Wallet','Joined','Actions'].map(h => (
                      <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                            {u.name?.[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: u.role==='admin' ? 'rgba(239,68,68,0.1)' : u.role==='lender' ? 'rgba(34,197,94,0.1)' : 'rgba(6,182,212,0.1)', color: u.role==='admin' ? '#f87171' : u.role==='lender' ? '#22c55e' : '#22d3ee', fontWeight: 700 }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}><KYCBadge status={u.kycStatus} /></td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: u.creditScore>=700?'#22c55e':u.creditScore>=600?'#f59e0b':'#f87171', fontWeight: 700 }}>{u.creditScore||650}</td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{u.walletAddress ? `${u.walletAddress.slice(0,8)}...` : '—'}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {/* Deactivate Button */}
                          <button onClick={() => deactivateUser(u._id||u.id, u.name)}
                            style={{ fontSize: '0.7rem', color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}>
                            Deactivate
                          </button>
                          {/* Delete Button — frees wallet for reuse */}
                          {u.role !== 'admin' && (
                            <button onClick={() => deleteUser(u._id||u.id, u.name)}
                              style={{ fontSize: '0.7rem', color: 'white', background: 'rgba(239,68,68,0.7)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}>
                              🗑 Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ACTIVITY */}
        {tab === 'activity' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>📋 Activity Log</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {activities.map((a, i) => (
                <div key={i} className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{ACTION_ICONS[a.action] || '📌'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>{a.action?.replace(/_/g,' ').toUpperCase()}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{a.details?.description || ''}</div>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{timeAgo(a.createdAt)}</div>
                </div>
              ))}
              {activities.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No activity yet</p>}
            </div>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {tab === 'notifications' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>🔔 Send Platform Notification</h2>
            <BroadcastNotification users={users} setToast={setToast} />
          </div>
        )}
      </div>
    </div>
  );
}

function BroadcastNotification({ users, setToast }) {
  const [form, setForm]     = useState({ title: '', message: '', target: 'all' });
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!form.title || !form.message) { setToast({ message: 'Fill title and message', type: 'error' }); return; }
    setSending(true);
    try {
      const cfg     = adminCfg();
      const targets = form.target === 'all' ? users : users.filter(u => u.role === form.target);
      await Promise.all(targets.map(u => api.post('/notifications', { userId: u._id||u.id, title: form.title, message: form.message, type: 'system' }, cfg)));
      setToast({ message: `✅ Sent to ${targets.length} users`, type: 'success' });
      setForm({ title: '', message: '', target: 'all' });
    } catch { setToast({ message: 'Failed to send', type: 'error' }); }
    finally { setSending(false); }
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label className="label">Send To</label>
          <select value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))} className="input-field">
            <option value="all">All Users</option>
            <option value="borrower">Borrowers Only</option>
            <option value="lender">Lenders Only</option>
          </select>
        </div>
        <div>
          <label className="label">Title</label>
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input-field" placeholder="Notification title" />
        </div>
        <div>
          <label className="label">Message</label>
          <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} className="input-field" rows={4} style={{ resize: 'vertical' }} />
        </div>
        <button onClick={send} disabled={sending} className="btn-primary" style={{ padding: '0.875rem' }}>
          {sending ? '⏳ Sending...' : '📢 Send Notification'}
        </button>
      </div>
    </div>
  );
}

function KYCBadge({ status }) {
  const c = {
    verified: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: '✅ Verified' },
    pending:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: '⏳ Pending'  },
    rejected: { color: '#f87171', bg: 'rgba(239,68,68,0.1)',   label: '❌ Rejected' },
    none:     { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: '⭕ Not Done' },
  }[status || 'none'] || { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: '—' };
  return <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>{c.label}</span>;
}

const ACTION_ICONS = {
  register: '🆕', login: '🔐', wallet_connected: '🦊',
  kyc_submitted: '🪪', loan_created: '💸', loan_funded: '💰',
  loan_repaid: '✅', profile_updated: '✏️', notification_read: '🔔',
};
