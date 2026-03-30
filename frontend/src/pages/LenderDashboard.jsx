import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import ConnectWalletPrompt from '../components/ConnectWalletPrompt';
import Toast from '../components/Toast';
import api from '../services/apiService';

export default function LenderDashboard() {
  const { isConnected, account } = useWallet();
  const { contractService }      = useContract();
  const [investments, setInvestments] = useState([]);
  const [fetching, setFetching]   = useState(false);
  const [toast, setToast]         = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const fetchData = useCallback(async () => {
    if (!account || !contractService) return;
    setFetching(true);
    try {
      // Get all loans from blockchain
      const allLoans = await contractService.getAllLoans();

      // Get lender investments from blockchain
      const invs = await contractService.getLenderInvestments(account);

      // Merge investment data with loan data for complete info
      const enriched = await Promise.all(invs.map(async (inv) => {
        const loan = allLoans.find(l => l.id === inv.loanId);

        // Get MongoDB data for borrower name and purpose
        let mongoData = {};
        try {
          const res = await api.get(`/loans?loanId=${inv.loanId}`);
          mongoData = res.data.loans?.[0] || {};
        } catch { /* use blockchain data */ }

        return {
          ...inv,
          loanAmount:    loan?.amount || '0',
          interestRate:  loan?.interestRate || 0,
          duration:      loan?.duration || 0,
          loanStatus:    loan?.status ?? 0,
          // ── FIX: Check blockchain status for repaid ──
          repaid:        loan?.status === 2 || inv.repaid,
          purpose:       mongoData.purpose || loan?.purpose || '',
          category:      mongoData.category || 'other',
          borrowerName:  mongoData.borrowerName || `${loan?.borrower?.slice(0,6)}...${loan?.borrower?.slice(-4)}`,
          borrowerAddress: loan?.borrower || '',
          fundedAt:      inv.investedAt,
        };
      }));

      setInvestments(enriched);
    } catch (e) {
      // Fallback to MongoDB
      try {
        const res = await api.get(`/loans/history/${account.toLowerCase()}`);
        if (res.data.funded?.length > 0) {
          setInvestments(res.data.funded);
        }
      } catch (err) {
        setToast({ message: 'Failed to load investments', type: 'error' });
      }
    } finally {
      setFetching(false);
    }
  }, [account, contractService]);

  useEffect(() => {
    if (isConnected && account && contractService) fetchData();
  }, [isConnected, account, contractService]);

  // ── AUTO REFRESH every 15 seconds ──────────────────────
  useEffect(() => {
    if (!isConnected || !account) return;
    const timer = setInterval(fetchData, 15000);
    return () => clearInterval(timer);
  }, [isConnected, account, fetchData]);

  if (!isConnected) return <ConnectWalletPrompt message="Connect your wallet to access the lender dashboard." />;

  const totalInvested      = investments.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const totalRepaid        = investments.filter(i => i.repaid).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const pendingRepayment   = investments.filter(i => !i.repaid).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  // ── FIX: Deduplicate by loanId to avoid count bug ──────
  const uniqueInvestments  = investments.filter((inv, idx, self) =>
    idx === self.findIndex(i => i.loanId === inv.loanId)
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Borrower Profile Modal */}
      {selectedProfile && (
        <div className="modal-overlay" onClick={() => setSelectedProfile(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>👤 Borrower Profile</h3>
              <button onClick={() => setSelectedProfile(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <BorrowerProfileCard profile={selectedProfile} />
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Lender Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontFamily: 'monospace' }}>{account}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={fetchData} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4', cursor: 'pointer', fontSize: '0.8rem' }}>
            🔄 Refresh
          </button>
          <Link to="/marketplace" className="btn-primary" style={{ textDecoration: 'none', padding: '0.625rem 1.25rem' }}>
            Browse Marketplace
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Investments',    val: uniqueInvestments.length,         color: '#06b6d4' },
          { label: 'Total Invested', val: `${totalInvested.toFixed(4)} ETH`, color: '#8b5cf6' },
          { label: 'Repaid',         val: `${totalRepaid.toFixed(4)} ETH`,   color: '#22c55e' },
          { label: 'Pending',        val: `${pendingRepayment.toFixed(4)} ETH`, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.val}</span>
          </div>
        ))}
      </div>

      {/* Investments List */}
      {fetching ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>⏳ Loading investments...</div>
      ) : uniqueInvestments.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Investments Yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Browse the marketplace and start funding loans to earn returns.</p>
          <Link to="/marketplace" className="btn-primary" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem' }}>Browse Loans</Link>
        </div>
      ) : (
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Your Investments ({uniqueInvestments.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {uniqueInvestments.map((inv, i) => (
              <InvestmentRow
                key={`${inv.loanId}-${i}`}
                investment={inv}
                onViewProfile={() => setSelectedProfile({
                  name:    inv.borrowerName,
                  address: inv.borrowerAddress,
                  purpose: inv.purpose,
                  category: inv.category,
                  loanId:  inv.loanId,
                  amount:  inv.loanAmount,
                  interestRate: inv.interestRate,
                })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Investment Row ──────────────────────────────────────
function InvestmentRow({ investment: inv, onViewProfile }) {
  const statusLabel = inv.repaid || inv.loanStatus === 2
    ? '✅ Repaid'
    : inv.loanStatus === 1
    ? '⚡ Active'
    : inv.loanStatus === 3
    ? '🔴 Defaulted'
    : '⏳ Pending';

  const statusColor = inv.repaid || inv.loanStatus === 2 ? '#22c55e'
    : inv.loanStatus === 1 ? '#06b6d4'
    : inv.loanStatus === 3 ? '#ef4444'
    : '#f59e0b';

  const expectedReturn = (parseFloat(inv.amount) * (1 + parseFloat(inv.interestRate || 0) / 100)).toFixed(4);

  return (
    <div className="glass-card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Loan #{inv.loanId}</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>
              {statusLabel}
            </span>
            {inv.category && (
              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '6px', background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>
                {inv.category}
              </span>
            )}
          </div>

          {inv.purpose && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '0.75rem' }}>
              "{inv.purpose}"
            </p>
          )}

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.68rem' }}>YOU FUNDED</div>
              <div style={{ fontWeight: 700, color: '#8b5cf6', fontFamily: 'monospace' }}>{parseFloat(inv.amount).toFixed(4)} ETH</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.68rem' }}>EXPECTED RETURN</div>
              <div style={{ fontWeight: 700, color: '#22c55e', fontFamily: 'monospace' }}>{expectedReturn} ETH</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.68rem' }}>INTEREST</div>
              <div style={{ fontWeight: 700, color: '#f59e0b' }}>{inv.interestRate}%</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.68rem' }}>BORROWER</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.borrowerName}</div>
            </div>
          </div>
        </div>

        <button
          onClick={onViewProfile}
          style={{
            padding: '0.5rem 1rem', borderRadius: '8px',
            background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)',
            color: '#06b6d4', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            whiteSpace: 'nowrap',
          }}>
          👤 View Profile
        </button>
      </div>
    </div>
  );
}

// ── Borrower Profile Card (shown in modal) ──────────────
function BorrowerProfileCard({ profile }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (profile.address) {
      api.get(`/users/wallet/${profile.address}`)
        .then(res => setUserData(res.data.user))
        .catch(() => {});
    }
  }, [profile.address]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Avatar + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '60px', height: '60px', borderRadius: '16px',
          background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', fontWeight: 800, color: 'white', flexShrink: 0,
        }}>
          {(userData?.name || profile.name || '?')[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {userData?.name || profile.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
            {profile.address?.slice(0,12)}...{profile.address?.slice(-6)}
          </div>
          {userData?.kycStatus === 'verified' && (
            <span style={{ fontSize: '0.7rem', background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
              ✅ KYC Verified
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {[
          { label: 'Credit Score', val: userData?.creditScore || 650, color: '#06b6d4' },
          { label: 'KYC Status',   val: userData?.kycStatus || 'unknown', color: '#22c55e' },
          { label: 'Member Since', val: userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : '—', color: 'var(--text-primary)' },
          { label: 'Role',         val: userData?.role || '—', color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Loan Details */}
      <div style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '10px', padding: '1rem' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>LOAN DETAILS</div>
        {profile.purpose && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '0.5rem' }}>"{profile.purpose}"</p>}
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem' }}>
          <div><span style={{ color: 'var(--text-secondary)' }}>Amount: </span><span style={{ fontWeight: 700, color: '#06b6d4' }}>{parseFloat(profile.amount||0).toFixed(2)} ETH</span></div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Rate: </span><span style={{ fontWeight: 700, color: '#8b5cf6' }}>{profile.interestRate}%</span></div>
        </div>
      </div>

      <a href={`https://sepolia.etherscan.io/address/${profile.address}`} target="_blank" rel="noreferrer"
        style={{ textAlign: 'center', padding: '0.625rem', borderRadius: '8px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', color: '#06b6d4', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}>
        🔍 View on Etherscan
      </a>
    </div>
  );
}
