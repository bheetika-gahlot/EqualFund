import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { useAuth } from '../context/AuthContext';
import GeoBg from '../components/GeoBg';
import ConnectWalletPrompt from '../components/ConnectWalletPrompt';
import Toast from '../components/Toast';
import { ChatButton } from '../components/Chat';
import { UpiPayButton } from '../components/UpiPayment';
import { saveFundingToMongoDB } from '../services/loanService';
import api from '../services/apiService';

const CAT_COLORS = { education:'#06b6d4', medical:'#f43f5e', business:'#8b5cf6', emergency:'#ef4444', housing:'#f59e0b', other:'#888' };

// ── Inline Fraud Badge ────────────────────────────────────
function FraudBadge({ riskLevel }) {
  if (!riskLevel || riskLevel === 'low') return null;
  const high = riskLevel === 'high';
  return (
    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '99px', background: high ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)', color: high ? '#ef4444' : '#f59e0b', border: `1px solid ${high ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
      {high ? '🚨 HIGH RISK' : '⚠️ CAUTION'}
    </span>
  );
}

// ── Collateral Badge ──────────────────────────────────────
function CollateralBadge({ collateralType, collateralAmount }) {
  if (!collateralType || collateralType === 'none') return null;
  return (
    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '99px', background: 'rgba(0,232,122,0.1)', color: '#00c965', border: '1px solid rgba(0,232,122,0.25)' }}>
      ⟠ {parseFloat(collateralAmount || 0).toFixed(2)} ETH Secured
    </span>
  );
}

export default function Marketplace() {
  const { isConnected, account } = useWallet();
  const { loading, error, execute, contractService, setError } = useContract();
  const { user } = useAuth();
  const [loans,        setLoans]       = useState([]);
  const [fetchingLoans,setFetching]    = useState(false);
  const [toast,        setToast]       = useState(null);
  const [fundModal,    setFundModal]   = useState(null);
  const [fundAmount,   setFundAmount]  = useState('');
  const [profileModal, setProfileModal]= useState(null);
  const [search,       setSearch]      = useState('');
  const [filter,       setFilter]      = useState('All');
  const [category,     setCategory]    = useState('all');
  const [sortBy,       setSortBy]      = useState('newest');
  const [showFilters,  setShowFilters] = useState(false);
  const [minRate,      setMinRate]     = useState('');
  const [maxRate,      setMaxRate]     = useState('');
  const loansRef = useRef(loans);
  loansRef.current = loans;

  const fetchLoans = async (silent = false) => {
    if (!isConnected || !contractService) return;
    if (!silent) setFetching(true);
    try {
      const chainLoans = await contractService.getAllLoans();
      let mongoMap = {};
      try {
        const res = await api.get('/loans');
        (res.data.loans || []).forEach(m => { mongoMap[m.loanId] = m; });
      } catch {}
      const enriched = chainLoans.map(l => ({
        ...l,
        purpose:          mongoMap[l.id]?.purpose || '',
        category:         mongoMap[l.id]?.category || 'other',
        riskLevel:        mongoMap[l.id]?.riskLevel || 'low',
        fraudFlags:       mongoMap[l.id]?.fraudFlags || [],
        collateralType:   mongoMap[l.id]?.collateralType || 'none',
        collateralAmount: mongoMap[l.id]?.collateralAmount || '0',
        borrowerName: (mongoMap[l.id]?.borrowerName && mongoMap[l.id].borrowerName !== 'Unknown')
          ? mongoMap[l.id].borrowerName
          : `${l.borrower?.slice(0, 6)}...${l.borrower?.slice(-4)}`,
      }));
      const sig = enriched.map(l => l.id + l.status).join(',');
      const cur = loansRef.current.map(l => l.id + l.status).join(',');
      if (sig !== cur) setLoans(enriched);
    } catch (e) {
      if (!silent) setToast({ message: 'Failed to load: ' + e.message, type: 'error' });
    } finally {
      if (!silent) setFetching(false);
    }
  };

  useEffect(() => {
    if (isConnected && contractService) fetchLoans();
  }, [isConnected, contractService]);

  useEffect(() => {
    if (!isConnected) return;
    const t = setInterval(() => fetchLoans(true), 15000);
    return () => clearInterval(t);
  }, [isConnected, contractService]);

  const handleFund = async () => {
    if (!fundModal || !fundAmount) return;
    setToast({ message: '⏳ Confirm in MetaMask...', type: 'loading' });
    try {
      const receipt = await execute(contractService.fundLoan.bind(contractService), fundModal.id, fundAmount);
      const prevF   = parseFloat(fundModal.fundedAmount || 0);
      const newF    = prevF + parseFloat(fundAmount);
      const isFull  = newF >= parseFloat(fundModal.amount);
      await saveFundingToMongoDB(fundModal.id, account, fundAmount, newF.toString(), isFull);
      setFundModal(null); setFundAmount('');
      setToast({ message: isFull ? '🎉 Fully funded!' : '✅ Funded!', type: 'success', txHash: receipt?.hash });
      await fetchLoans();
    } catch (e) {
      setToast({ message: e.message || 'Fund failed', type: 'error' });
    }
  };

  const filtered = loans
    .filter(l => filter === 'All' || l.statusLabel?.toLowerCase() === filter.toLowerCase())
    .filter(l => category === 'all' || l.category === category)
    .filter(l => !minRate || parseFloat(l.interestRate) >= parseFloat(minRate))
    .filter(l => !maxRate || parseFloat(l.interestRate) <= parseFloat(maxRate))
    .filter(l => !search || l.purpose?.toLowerCase().includes(search.toLowerCase()) || l.borrowerName?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'newest')        return b.id - a.id;
      if (sortBy === 'oldest')        return a.id - b.id;
      if (sortBy === 'interest_high') return parseFloat(b.interestRate) - parseFloat(a.interestRate);
      if (sortBy === 'interest_low')  return parseFloat(a.interestRate) - parseFloat(b.interestRate);
      if (sortBy === 'amount_high')   return parseFloat(b.amount) - parseFloat(a.amount);
      return parseFloat(a.amount) - parseFloat(b.amount);
    });

  if (!isConnected) return <ConnectWalletPrompt message="Connect your wallet to browse the marketplace." />;

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
            <BorrowerModal loan={profileModal} />
            {/* Fraud panel in profile */}
            {(profileModal.riskLevel === 'high' || profileModal.riskLevel === 'medium') && (
              <div style={{ marginTop: '12px', padding: '12px', background: profileModal.riskLevel === 'high' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${profileModal.riskLevel === 'high' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`, borderRadius: '10px' }}>
                <div style={{ fontWeight: 800, color: profileModal.riskLevel === 'high' ? '#ef4444' : '#f59e0b', fontSize: '13px', marginBottom: '6px' }}>
                  {profileModal.riskLevel === 'high' ? '🚨 High Risk Borrower' : '⚠️ Medium Risk Borrower'}
                </div>
                {(profileModal.fraudFlags || []).map((f, i) => (
                  <div key={i} style={{ fontSize: '12px', color: 'var(--ink-3)', marginBottom: '3px' }}>• {f.desc || f.type}</div>
                ))}
              </div>
            )}
            {profileModal.borrower?.toLowerCase() !== account?.toLowerCase() && profileModal.status === 0 && (
              <button onClick={() => { setFundModal(profileModal); setProfileModal(null); }}
                className="btn btn-dark" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
                💰 Fund This Loan
              </button>
            )}
          </div>
        </div>
      )}

      {/* Fund modal */}
      {fundModal && (
        <div className="modal-overlay" onClick={() => setFundModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: 800, color: 'var(--ink)' }}>Fund Loan #{fundModal.id}</h3>
              <button onClick={() => setFundModal(null)} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            {/* Loan info */}
            <div style={{ background: 'var(--surface-3)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', marginBottom: '8px' }}>
                {[
                  ['Borrower',   fundModal.borrowerName],
                  ['Interest',   `${fundModal.interestRate}%`],
                  ['Duration',   `${fundModal.duration} days`],
                  ['You Receive',`${(parseFloat(fundModal.amount) * (1 + parseFloat(fundModal.interestRate) / 100)).toFixed(4)} ETH`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: '10px', color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{k}</div>
                    <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{v}</div>
                  </div>
                ))}
              </div>
              {/* Collateral info */}
              {fundModal.collateralType === 'eth' && (
                <div style={{ padding: '6px 10px', background: 'rgba(0,232,122,0.06)', borderRadius: '8px', border: '1px solid rgba(0,232,122,0.15)', fontSize: '12px', color: '#00c965', fontWeight: 600 }}>
                  ⟠ Secured loan — {fundModal.collateralAmount} ETH collateral locked by borrower
                </div>
              )}
            </div>

            {/* ETH amount input */}
            <label className="lbl" style={{ display: 'block', marginBottom: '6px' }}>Amount (ETH)</label>
            <input type="number" step="0.001" value={fundAmount} onChange={e => setFundAmount(e.target.value)} className="input-f" placeholder="0.0" style={{ marginBottom: '8px' }} />
            <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
              {['25%', '50%', '75%', '100%'].map(p => {
                const rem = parseFloat(fundModal.amount) - parseFloat(fundModal.fundedAmount || 0);
                return (
                  <button key={p} onClick={() => setFundAmount((rem * parseInt(p) / 100).toFixed(4))}
                    style={{ flex: 1, padding: '5px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                    {p}
                  </button>
                );
              })}
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '10px' }}>⚠️ {error}</p>}

            {/* ETH Fund button */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
              <button onClick={() => { setFundModal(null); setError?.(null); }} className="btn btn-out" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleFund} disabled={loading || !fundAmount} className="btn btn-mint" style={{ flex: 2, justifyContent: 'center', color: '#000000' }}>
                {loading ? '⏳ Processing...' : `⟠ Fund ${fundAmount || '0'} ETH`}
              </button>
            </div>

            {/* ── UPI / INR Payment ── */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                🇮🇳 Or Pay in INR (Demo)
              </div>
              <UpiPayButton
                ethAmount={fundAmount || fundModal?.amount}
                purpose={fundModal?.purpose}
                borrowerName={fundModal?.borrowerName}
                onSuccess={result => {
                  setToast({ message: `✅ Payment ₹${result.inrAmount.toLocaleString('en-IN')} successful!`, type: 'success' });
                  setFundModal(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="container" style={{ padding: '2.5rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.04em', marginBottom: '6px' }}>Loan Marketplace</h1>
            <p style={{ color: 'var(--ink-3)', fontSize: '13px' }}>{filtered.length} of {loans.length} loans</p>
          </div>
          <button onClick={() => fetchLoans(false)} disabled={fetchingLoans} className="btn btn-out btn-sm">
            {fetchingLoans ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {/* Search + filters */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-f" placeholder="🔍 Search by purpose, borrower, category..." />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {['All', 'Pending', 'Active', 'Repaid'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '5px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: 'none', background: filter === f ? 'var(--ink)' : 'var(--pill-bg)', color: filter === f ? 'var(--card-bg)' : 'var(--pill-text)', transition: 'all 0.2s' }}>
                {f}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-3)', color: 'var(--ink)', fontSize: '12px', cursor: 'pointer' }}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="interest_high">Interest ↑</option>
                <option value="interest_low">Interest ↓</option>
                <option value="amount_high">Amount ↑</option>
                <option value="amount_low">Amount ↓</option>
              </select>
              <button onClick={() => setShowFilters(s => !s)} className="btn btn-out btn-xs" style={{ fontWeight: 700 }}>
                ⚙️ Filters {showFilters ? '▲' : '▼'}
              </button>
            </div>
          </div>

          {showFilters && (
            <div style={{ padding: '1rem', background: 'var(--surface-3)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label className="lbl">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--ink)', fontSize: '13px' }}>
                  {['all','education','medical','business','emergency','housing','other'].map(c => (
                    <option key={c} value={c}>{c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div><label className="lbl">Min %</label><input type="number" value={minRate} onChange={e => setMinRate(e.target.value)} placeholder="0" style={{ width: '70px', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--ink)', fontSize: '13px' }} /></div>
              <div><label className="lbl">Max %</label><input type="number" value={maxRate} onChange={e => setMaxRate(e.target.value)} placeholder="50" style={{ width: '70px', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--ink)', fontSize: '13px' }} /></div>
              <button onClick={() => { setCategory('all'); setMinRate(''); setMaxRate(''); setSearch(''); setSortBy('newest'); }}
                style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Loans grid */}
        {fetchingLoans ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: '1rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="card" style={{ padding: '1.5rem', height: '260px' }}>
                {[40, 60, 80, 50, 30].map((w, j) => <div key={j} style={{ height: '12px', background: 'var(--surface-3)', borderRadius: '6px', marginBottom: '10px', width: `${w}%` }} />)}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
            <p style={{ color: 'var(--ink-3)', fontSize: '14px' }}>No loans match your filters</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: '1rem' }}>
            {filtered.map(loan => {
              const isMine    = loan.borrower?.toLowerCase() === account?.toLowerCase();
              const catColor  = CAT_COLORS[loan.category] || '#888';
              const fundedPct = loan.amount ? Math.min(100, (parseFloat(loan.fundedAmount || 0) / parseFloat(loan.amount)) * 100) : 0;
              const totalRepay = loan.amount ? (parseFloat(loan.amount) * (1 + parseFloat(loan.interestRate || 0) / 100)).toFixed(4) : '0';

              return (
                <div key={loan.id} className="card card-hover" style={{ padding: '1.5rem' }}>

                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '4px' }}>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {loan.category && <span className="pill" style={{ background: `${catColor}15`, color: catColor }}>{loan.category}</span>}
                      <span className="pill pill-gray">{loan.statusLabel || 'Pending'}</span>
                      {/* ── FRAUD BADGE ── */}
                      <FraudBadge riskLevel={loan.riskLevel} />
                      {/* ── COLLATERAL BADGE ── */}
                      <CollateralBadge collateralType={loan.collateralType} collateralAmount={loan.collateralAmount} />
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--ink-3)', fontFamily: 'monospace' }}>#{loan.id}</span>
                  </div>

                  {loan.purpose && <p style={{ fontSize: '13px', color: 'var(--ink-3)', fontStyle: 'italic', marginBottom: '12px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>"{loan.purpose}"</p>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    {[
                      ['Amount',   `${parseFloat(loan.amount).toFixed(2)} ETH`, 'var(--mint-dim)'],
                      ['Interest', `${loan.interestRate}%`,                      '#8b5cf6'],
                      ['Duration', `${loan.duration} days`,                      'var(--ink)'],
                      ['Repay',    `${totalRepay} ETH`,                         'var(--ink)'],
                    ].map(([l, v, c]) => (
                      <div key={l}>
                        <div style={{ fontSize: '10px', color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{l}</div>
                        <div style={{ fontWeight: 900, color: c, fontSize: '15px', letterSpacing: '-0.02em', fontFamily: String(v).includes('ETH') || String(v).includes('%') ? 'monospace' : 'inherit' }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink-3)', marginBottom: '4px' }}>
                      <span>{parseFloat(loan.fundedAmount || 0).toFixed(4)} ETH funded</span>
                      <span>{fundedPct.toFixed(0)}%</span>
                    </div>
                    <div className="prog"><div className="prog-fill" style={{ width: `${fundedPct}%`, background: fundedPct >= 100 ? 'var(--mint-dim)' : `linear-gradient(90deg,${catColor},var(--mint))` }} /></div>
                  </div>

                  {/* Borrower row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'var(--mint-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: 'var(--mint-dim)', flexShrink: 0 }}>
                      {(loan.borrowerName || '?')[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loan.borrowerName}</span>
                    {isMine && <span style={{ fontSize: '11px', color: 'var(--mint-dim)', fontWeight: 700, flexShrink: 0 }}>(You)</span>}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button onClick={() => setProfileModal(loan)} className="btn btn-out btn-xs" style={{ flex: 1 }}>👤 Profile</button>

                    {/* ── CHAT BUTTON ── */}
                    {!isMine && loan.borrower && (
                      <ChatButton
                        loanId={loan.id}
                        otherUserAddress={loan.borrower}
                        otherUserName={loan.borrowerName}
                        currentUserAddress={account}
                      />
                    )}

                    {isMine ? (
                      <span style={{ flex: 1, textAlign: 'center', padding: '4px 6px', borderRadius: '7px', background: 'var(--surface-3)', color: 'var(--ink-3)', fontSize: '12px', fontWeight: 600 }}>Your Loan</span>
                    ) : loan.status === 0 ? (
                      <button onClick={() => { setFundModal(loan); setFundAmount(''); }} className="btn btn-mint btn-xs" style={{ flex: 2, justifyContent: 'center', color: '#000000' }}>
                        💰 Fund
                      </button>
                    ) : (
                      <span style={{ flex: 1, textAlign: 'center', padding: '4px 6px', borderRadius: '7px', background: 'var(--surface-3)', color: 'var(--ink-3)', fontSize: '12px' }}>
                        {loan.status === 1 ? 'Active' : loan.status === 2 ? '✅ Repaid' : '🔴 Default'}
                      </span>
                    )}
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

function BorrowerModal({ loan }) {
  const [userData, setUserData] = useState(null);
  useEffect(() => {
    if (loan.borrower) {
      fetch(`${import.meta.env.VITE_API_URL || 'https://equalfund-api.onrender.com/api'}/users/wallet/${loan.borrower}`)
        .then(r => r.json()).then(d => setUserData(d.user)).catch(() => {});
    }
  }, [loan.borrower]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--mint-pale)', border: '1px solid rgba(0,232,122,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--mint-dim)', fontSize: '1.25rem' }}>
          {(userData?.name || loan.borrowerName || '?')[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '1rem' }}>{userData?.name || loan.borrowerName}</div>
          <div style={{ fontSize: '12px', color: 'var(--ink-3)', fontFamily: 'monospace' }}>{loan.borrower?.slice(0, 14)}...{loan.borrower?.slice(-6)}</div>
          {userData?.kycStatus === 'verified' && <span className="pill pill-mint" style={{ marginTop: '3px' }}>✅ KYC Verified</span>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {[
          { l: 'Credit Score', v: userData?.creditScore || 650 },
          { l: 'Member Since', v: userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-IN') : '—' },
        ].map(s => (
          <div key={s.l} style={{ padding: '0.75rem', background: 'var(--surface-3)', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '10px', color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{s.l}</div>
            <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '1rem', background: 'var(--mint-pale)', borderRadius: '10px', border: '1px solid rgba(0,232,122,0.15)' }}>
        {loan.purpose && <p style={{ fontSize: '13px', color: 'var(--ink-3)', fontStyle: 'italic', marginBottom: '8px' }}>"{loan.purpose}"</p>}
        <div style={{ display: 'flex', gap: '1rem', fontSize: '13px', flexWrap: 'wrap' }}>
          <span><span style={{ color: 'var(--ink-3)' }}>Amount: </span><strong style={{ color: 'var(--mint-dim)' }}>{parseFloat(loan.amount || 0).toFixed(2)} ETH</strong></span>
          <span><span style={{ color: 'var(--ink-3)' }}>Rate: </span><strong>{loan.interestRate}%</strong></span>
          {loan.collateralType === 'eth' && <span style={{ color: '#00c965', fontWeight: 700 }}>⟠ Secured</span>}
        </div>
      </div>
    </div>
  );
}
