import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { ChatButton } from '../components/Chat';
import GeoBg from '../components/GeoBg';
import ConnectWalletPrompt from '../components/ConnectWalletPrompt';
import Toast from '../components/Toast';
import api from '../services/apiService';

export default function LenderDashboard() {
  const { isConnected, account } = useWallet();
  const { contractService }      = useContract();
  const [investments, setInvestments] = useState([]);
  const [fetching,    setFetching]    = useState(false);
  const [toast,       setToast]       = useState(null);
  const [profileModal,setProfileModal]= useState(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!account || !contractService) return;
    if (!silent) setFetching(true);
    try {
      const allLoans = await contractService.getAllLoans();
      const invs     = await contractService.getLenderInvestments(account);
      let mongoMap   = {};
      try {
        const res = await api.get('/loans');
        (res.data.loans || []).forEach(m => { mongoMap[m.loanId] = m; });
      } catch {}

      const enriched = invs.map(inv => {
        const loan  = allLoans.find(l => l.id === inv.loanId);
        const mongo = mongoMap[inv.loanId] || {};
        return {
          ...inv,
          loanAmount:       loan?.amount || '0',
          interestRate:     loan?.interestRate || 0,
          duration:         loan?.duration || 0,
          loanStatus:       loan?.status ?? 0,
          repaid:           loan?.status === 2 || inv.repaid,
          purpose:          mongo.purpose || '',
          category:         mongo.category || 'other',
          collateralType:   mongo.collateralType || 'none',
          collateralAmount: mongo.collateralAmount || '0',
          riskLevel:        mongo.riskLevel || 'low',
          borrowerName:     (mongo.borrowerName && mongo.borrowerName !== 'Unknown')
            ? mongo.borrowerName
            : `${loan?.borrower?.slice(0, 6)}...${loan?.borrower?.slice(-4)}`,
          borrowerAddress:  loan?.borrower || '',
        };
      });

      // Deduplicate by loanId
      const seen    = new Set();
      const deduped = enriched.filter(inv => { if (seen.has(inv.loanId)) return false; seen.add(inv.loanId); return true; });
      setInvestments(deduped);
    } catch (e) {
      if (!silent) setToast({ message: 'Failed to load investments', type: 'error' });
    } finally {
      if (!silent) setFetching(false);
    }
  }, [account, contractService]);

  useEffect(() => { if (isConnected && account && contractService) fetchData(); }, [isConnected, account, contractService, fetchData]);
  useEffect(() => {
    if (!isConnected) return;
    const t = setInterval(() => fetchData(true), 15000);
    return () => clearInterval(t);
  }, [isConnected, fetchData]);

  if (!isConnected) return <ConnectWalletPrompt message="Connect your wallet to view your investments." />;

  const totalInvested    = investments.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const totalRepaid      = investments.filter(i => i.repaid).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const pendingRepayment = investments.filter(i => !i.repaid).reduce((s, i) => s + parseFloat(i.amount || 0), 0);

  return (
    <div className="page" style={{ position: 'relative', minHeight: '100vh' }}>
      <GeoBg />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Profile modal */}
      {profileModal && (
        <div className="modal-overlay" onClick={() => setProfileModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 800, color: 'var(--ink)' }}>👤 Borrower Profile</h3>
              <button onClick={() => setProfileModal(null)} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <BorrowerModal profile={profileModal} />
          </div>
        </div>
      )}

      <div className="container" style={{ padding: '2.5rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.04em', marginBottom: '6px' }}>Lender Dashboard</h1>
            <p style={{ color: 'var(--ink-3)', fontSize: '12px', fontFamily: 'monospace' }}>{account}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => fetchData(false)} className="btn btn-out btn-sm">🔄 Refresh</button>
            <Link to="/marketplace" className="btn btn-dark btn-sm">Browse Marketplace</Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-border" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', marginBottom: '2.5rem' }}>
          {[
            { l: 'Investments',    v: investments.length,                   c: 'var(--ink)'      },
            { l: 'Total Invested', v: `${totalInvested.toFixed(4)} ETH`,    c: '#8b5cf6'         },
            { l: 'Repaid',         v: `${totalRepaid.toFixed(4)} ETH`,      c: 'var(--mint-dim)' },
            { l: 'Pending',        v: `${pendingRepayment.toFixed(4)} ETH`, c: '#f59e0b'         },
          ].map((s, i) => (
            <div key={i} className="grid-cell stat-card">
              <div className="stat-val" style={{ color: s.c, fontSize: 'clamp(1rem,2vw,1.4rem)' }}>{s.v}</div>
              <div className="stat-lbl">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Investments list */}
        {fetching ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--ink-3)' }}>⏳ Loading investments...</div>
        ) : investments.length === 0 ? (
          <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
            <h3 style={{ color: 'var(--ink)', fontWeight: 800, marginBottom: '8px' }}>No Investments Yet</h3>
            <p style={{ color: 'var(--ink-3)', marginBottom: '1.5rem', fontSize: '14px' }}>Browse the marketplace to start earning returns.</p>
            <Link to="/marketplace" className="btn btn-dark btn-sm">Browse Loans</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {investments.map((inv, i) => {
              const statusLabel = inv.repaid || inv.loanStatus === 2 ? '✅ Repaid'
                : inv.loanStatus === 1 ? '⚡ Active'
                : inv.loanStatus === 3 ? '🔴 Defaulted' : '⏳ Pending';
              const statusColor = inv.repaid || inv.loanStatus === 2 ? 'var(--mint-dim)'
                : inv.loanStatus === 1 ? '#06b6d4'
                : inv.loanStatus === 3 ? '#ef4444' : '#f59e0b';
              const expectedReturn = (parseFloat(inv.amount) * (1 + parseFloat(inv.interestRate || 0) / 100)).toFixed(4);

              return (
                <div key={i} className="card card-hover" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>

                      {/* Title row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, color: 'var(--ink)' }}>Loan #{inv.loanId}</span>
                        <span className="pill" style={{ background: `${statusColor}18`, color: statusColor }}>{statusLabel}</span>
                        {inv.category && <span className="pill pill-gray">{inv.category}</span>}
                        {/* ── COLLATERAL BADGE — visible to lender ── */}
                        {inv.collateralType === 'eth' && (
                          <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '99px', background: 'rgba(0,232,122,0.1)', color: '#00c965', border: '1px solid rgba(0,232,122,0.25)' }}>
                            ⟠ {parseFloat(inv.collateralAmount || 0).toFixed(3)} ETH Secured
                          </span>
                        )}
                        {/* ── FRAUD BADGE ── */}
                        {inv.riskLevel !== 'low' && (
                          <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '99px', background: inv.riskLevel === 'high' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: inv.riskLevel === 'high' ? '#ef4444' : '#f59e0b', border: `1px solid ${inv.riskLevel === 'high' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
                            {inv.riskLevel === 'high' ? '🚨 HIGH RISK' : '⚠️ CAUTION'}
                          </span>
                        )}
                      </div>

                      {inv.purpose && <p style={{ fontSize: '13px', color: 'var(--ink-3)', fontStyle: 'italic', marginBottom: '10px' }}>"{inv.purpose}"</p>}

                      {/* Stats */}
                      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '13px', marginBottom: '10px' }}>
                        {[
                          ['You Funded',      `${parseFloat(inv.amount).toFixed(4)} ETH`, '#8b5cf6'],
                          ['Expected Return', `${expectedReturn} ETH`,                    'var(--mint-dim)'],
                          ['Interest',        `${inv.interestRate}%`,                     '#f59e0b'],
                          ['Borrower',        inv.borrowerName,                           'var(--ink)'],
                        ].map(([l, v, c]) => (
                          <div key={l}>
                            <div style={{ fontSize: '10px', color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{l}</div>
                            <div style={{ fontWeight: 800, color: c, fontFamily: String(v).includes('ETH') ? 'monospace' : 'inherit' }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      {/* Collateral info panel — only if secured */}
                      {inv.collateralType === 'eth' && (
                        <div style={{ padding: '8px 12px', background: 'rgba(0,232,122,0.05)', borderRadius: '8px', border: '1px solid rgba(0,232,122,0.15)', fontSize: '12px', color: '#00c965', fontWeight: 600 }}>
                          🔒 {inv.collateralAmount} ETH collateral locked by borrower — released on repayment, liquidated on default
                        </div>
                      )}
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <button
                        onClick={() => setProfileModal({ name: inv.borrowerName, address: inv.borrowerAddress, purpose: inv.purpose, category: inv.category, amount: inv.loanAmount, interestRate: inv.interestRate, collateralType: inv.collateralType, collateralAmount: inv.collateralAmount })}
                        className="btn btn-out btn-sm">
                        👤 Profile
                      </button>
                      <ChatButton
                        loanId={inv.loanId}
                        otherUserAddress={inv.borrowerAddress}
                        otherUserName={inv.borrowerName}
                        currentUserAddress={account}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function BorrowerModal({ profile }) {
  const [userData, setUserData] = useState(null);
  useEffect(() => {
    if (profile.address) {
      api.get(`/users/wallet/${profile.address}`).then(r => setUserData(r.data.user)).catch(() => {});
    }
  }, [profile.address]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--mint-pale)', border: '1px solid rgba(0,232,122,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--mint-dim)', fontSize: '1.25rem' }}>
          {(userData?.name || profile.name || '?')[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '1rem' }}>{userData?.name || profile.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--ink-3)', fontFamily: 'monospace' }}>{profile.address?.slice(0, 14)}...{profile.address?.slice(-6)}</div>
          {userData?.kycStatus === 'verified' && <span className="pill pill-mint" style={{ marginTop: '3px' }}>✅ KYC Verified</span>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {[
          { l: 'Credit Score', v: userData?.creditScore || 650 },
          { l: 'Member Since', v: userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-IN') : '—' },
          { l: 'KYC Status',   v: userData?.kycStatus || 'Unknown' },
          { l: 'Role',         v: userData?.role || '—' },
        ].map(s => (
          <div key={s.l} style={{ padding: '0.75rem', background: 'var(--surface-3)', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '10px', color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{s.l}</div>
            <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '14px' }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '1rem', background: 'var(--mint-pale)', borderRadius: '10px', border: '1px solid rgba(0,232,122,0.15)' }}>
        {profile.purpose && <p style={{ fontSize: '13px', color: 'var(--ink-3)', fontStyle: 'italic', marginBottom: '8px' }}>"{profile.purpose}"</p>}
        <div style={{ display: 'flex', gap: '1rem', fontSize: '13px', flexWrap: 'wrap' }}>
          <span><span style={{ color: 'var(--ink-3)' }}>Amount: </span><strong style={{ color: 'var(--mint-dim)' }}>{parseFloat(profile.amount || 0).toFixed(2)} ETH</strong></span>
          <span><span style={{ color: 'var(--ink-3)' }}>Rate: </span><strong>{profile.interestRate}%</strong></span>
          {/* Collateral visible to lender */}
          {profile.collateralType === 'eth' && (
            <span style={{ color: '#00c965', fontWeight: 700 }}>⟠ {parseFloat(profile.collateralAmount || 0).toFixed(3)} ETH Secured</span>
          )}
        </div>
      </div>
      <a href={`https://sepolia.etherscan.io/address/${profile.address}`} target="_blank" rel="noreferrer"
        className="btn btn-out btn-sm" style={{ textAlign: 'center', justifyContent: 'center' }}>
        🔍 View on Etherscan
      </a>
    </div>
  );
}
