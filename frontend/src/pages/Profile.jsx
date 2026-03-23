import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { useAuth } from '../context/AuthContext';
import ConnectWalletPrompt from '../components/ConnectWalletPrompt';
import { Link } from 'react-router-dom';
import api from '../services/apiService';

export default function Profile() {
  const { isConnected, account, balance } = useWallet();
  const { contractService } = useContract();
  const { user } = useAuth();
  const [loans, setLoans]             = useState([]);
  const [investments, setInvestments] = useState([]);
  const [creditScore, setCreditScore] = useState(user?.creditScore || 650);
  const [fetching, setFetching]       = useState(false);

  useEffect(() => {
    if (!isConnected || !account || !contractService) return;

    const load = async () => {
      setFetching(true);
      try {
        // Load from blockchain
        const [allLoans, invs, score] = await Promise.allSettled([
          contractService.getAllLoans(),
          contractService.getLenderInvestments(account),
          contractService.getCreditScore(account),
        ]);

        if (allLoans.status === 'fulfilled') {
          const mine = (allLoans.value || []).filter(
            l => l.borrower?.toLowerCase() === account?.toLowerCase()
          );
          setLoans(mine);
        }

        if (invs.status === 'fulfilled') {
          setInvestments(invs.value || []);
        }

        if (score.status === 'fulfilled') {
          setCreditScore(score.value || 650);
        }
      } catch (e) {
        console.warn('Profile load error:', e.message);
      } finally {
        setFetching(false);
      }
    };

    load();
  }, [isConnected, account, contractService]);

  if (!isConnected) return <ConnectWalletPrompt message="Connect wallet to view your profile." />;

  const totalBorrowed = loans.reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const totalInvested = investments.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const repaidLoans   = loans.filter(l => l.status === 2 || l.statusLabel === 'Repaid').length;
  const activeLoans   = loans.filter(l => l.status === 1 || l.statusLabel === 'Active').length;

  // Credit score color
  const scoreColor = creditScore >= 750 ? '#22c55e' : creditScore >= 650 ? '#06b6d4' : creditScore >= 550 ? '#f59e0b' : '#ef4444';
  const scoreLabel = creditScore >= 750 ? '🏆 Excellent' : creditScore >= 650 ? '💎 Good' : creditScore >= 550 ? '🟡 Fair' : '🔴 Poor';

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
        My Profile
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.875rem' }}>
        Your complete EqualFund activity
      </p>

      {/* Profile Header */}
      <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.25rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(6,182,212,0.06), transparent)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '20px',
            background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.75rem', fontWeight: 800, color: 'white',
            boxShadow: '0 8px 24px rgba(6,182,212,0.3)', flexShrink: 0,
          }}>
            {user?.name ? user.name[0].toUpperCase() : account?.slice(2, 4).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            {user?.name && <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{user.name}</div>}
            {user?.email && <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>{user.email}</div>}
            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#06b6d4', wordBreak: 'break-all' }}>{account}</div>
            <div style={{ marginTop: '0.5rem' }}>
              <KYCStatusBadge status={user?.kycStatus} />
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>ETH Balance</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#06b6d4', fontFamily: 'monospace' }}>
              {parseFloat(balance || 0).toFixed(4)} ETH
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.875rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Loans',  value: loans.length,                    icon: '📋', color: '#06b6d4' },
          { label: 'Active Loans', value: activeLoans,                     icon: '⚡', color: '#f59e0b' },
          { label: 'Repaid',       value: repaidLoans,                     icon: '✅', color: '#10b981' },
          { label: 'Borrowed',     value: `${totalBorrowed.toFixed(3)} Ξ`, icon: '💸', color: '#8b5cf6' },
          { label: 'Invested',     value: `${totalInvested.toFixed(3)} Ξ`, icon: '📈', color: '#06b6d4' },
          { label: 'Investments',  value: investments.length,              icon: '🏦', color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Credit Score */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
          📊 Credit Score
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0,
            background: `conic-gradient(${scoreColor} ${((creditScore - 300) / 550) * 360}deg, rgba(255,255,255,0.07) 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          }}>
            <div style={{
              width: '62px', height: '62px', borderRadius: '50%',
              background: 'var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
            }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1rem', color: scoreColor, lineHeight: 1 }}>{creditScore}</span>
              <span style={{ fontSize: '0.5rem', color: 'var(--text-secondary)' }}>/ 850</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: scoreColor, marginBottom: '0.375rem' }}>{scoreLabel}</div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', marginBottom: '0.5rem' }}>
              <div style={{ height: '100%', width: `${((creditScore - 300) / 550) * 100}%`, background: `linear-gradient(90deg,#ef4444,#f59e0b,#22c55e)`, borderRadius: '3px', transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {creditScore >= 700 ? '✅ Eligible for larger loans with better rates' : '💡 Repay loans on time to improve your score'}
            </div>
          </div>
        </div>
      </div>

      {/* KYC Section */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.875rem' }}>
          🪪 KYC Verification
        </h3>
        {user?.kycStatus === 'verified' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>✅</div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Identity verified · Can create loan requests</div>
            </div>
            <span style={{ marginLeft: 'auto', padding: '0.2rem 0.75rem', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
              ✅ Verified
            </span>
          </div>
        ) : user?.kycStatus === 'pending' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>⏳</div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Under Review</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Your documents are being verified (24-48 hrs)</div>
            </div>
            <span style={{ marginLeft: 'auto', padding: '0.2rem 0.75rem', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(234,179,8,0.1)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.2)' }}>
              ⏳ Pending
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.25rem' }}>KYC not submitted yet</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Complete KYC to start borrowing</div>
            </div>
            <Link to="/kyc" className="btn-primary" style={{ textDecoration: 'none', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
              Complete KYC →
            </Link>
          </div>
        )}
      </div>

      {/* Loading */}
      {fetching && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          ⏳ Loading blockchain data...
        </div>
      )}

      {/* Loan History */}
      {loans.length > 0 && (
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.875rem' }}>
            📋 Loan History ({loans.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {loans.map(loan => {
              const statusLabel = loan.statusLabel || ['Pending','Active','Repaid','Defaulted'][loan.status] || 'Unknown';
              const statusColor = { Pending:'#f59e0b', Active:'#06b6d4', Repaid:'#22c55e', Defaulted:'#ef4444' }[statusLabel] || '#6b7280';
              return (
                <div key={loan.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem', background: 'rgba(255,255,255,0.03)',
                  borderRadius: '10px', border: '1px solid var(--border)',
                  gap: '1rem', flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>Loan #{loan.id}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{parseFloat(loan.amount).toFixed(4)} ETH</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>
                    {statusLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Investment History */}
      {investments.length > 0 && (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.875rem' }}>
            📈 Investment History ({investments.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {investments.map((inv, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem', background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px', border: '1px solid var(--border)',
                gap: '1rem', flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>Loan #{inv.loanId}</span>
                <span style={{ fontWeight: 700, color: '#8b5cf6', fontFamily: 'monospace' }}>{parseFloat(inv.amount).toFixed(4)} ETH</span>
                <span style={{
                  padding: '2px 8px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700,
                  background: inv.repaid ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                  color: inv.repaid ? '#22c55e' : '#fbbf24',
                  border: `1px solid ${inv.repaid ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
                }}>
                  {inv.repaid ? '✓ Repaid' : '⏳ Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!fetching && loans.length === 0 && investments.length === 0 && (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No activity yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Create a loan request or fund someone else's loan to get started.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/create-loan" className="btn-primary" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem' }}>💸 Create Loan</Link>
            <Link to="/marketplace" className="btn-secondary" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem' }}>🏪 Browse Marketplace</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function KYCStatusBadge({ status }) {
  const config = {
    verified: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.2)',   label: '✅ KYC Verified' },
    pending:  { color: '#fbbf24', bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.2)',   label: '⏳ KYC Pending'  },
    rejected: { color: '#f87171', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)',   label: '❌ KYC Rejected' },
    none:     { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)', label: '⭕ KYC Required' },
  }[status || 'none'];

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700,
      background: config.bg, color: config.color, border: `1px solid ${config.border}`,
    }}>
      {config.label}
    </span>
  );
}
