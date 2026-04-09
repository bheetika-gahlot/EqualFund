import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { useAuth } from '../context/AuthContext';
import GeoBg from '../components/GeoBg';
import ConnectWalletPrompt from '../components/ConnectWalletPrompt';
import Toast from '../components/Toast';
import KYCGate from '../components/KYCGate';
import api from '../services/apiService';

const STATUS_LABEL = ['⏳ Pending', '✅ Active', '💚 Repaid', '🔴 Defaulted'];
const STATUS_COLOR = ['#f59e0b', '#00c965', '#22c55e', '#ef4444'];

export default function BorrowerDashboard() {
  const { isConnected, account } = useWallet();
  const { contractService, execute } = useContract();
  const { user, updateUser } = useAuth();

  const [loans,    setLoans]    = useState([]);
  const [history,  setHistory]  = useState([]);
  const [fetching, setFetching] = useState(true);
  const [toast,    setToast]    = useState(null);
  const [repaying, setRepaying] = useState(null);
  const [tab,      setTab]      = useState('active');
  const [score,    setScore]    = useState(user?.creditScore || 650);
  const [prevScore,setPrevScore]= useState(null);

  // ── Fetch user's current credit score from MongoDB ────
  const refreshScore = useCallback(async () => {
    if (!account) return;
    try {
      const res = await api.get(`/users/wallet/${account.toLowerCase()}`);
      const s   = res.data.user?.creditScore;
      if (s && s !== score) {
        setPrevScore(score);
        setScore(s);
        updateUser?.({ creditScore: s });
      }
    } catch {}
  }, [account, score, updateUser]);

  // ── Fetch loans from chain + MongoDB ─────────────────
  const fetchLoans = useCallback(async (silent = false) => {
    if (!account || !contractService) return;
    if (!silent) setFetching(true);
    try {
      const all  = await contractService.getAllLoans();
      const mine = all.filter(l => l.borrower?.toLowerCase() === account.toLowerCase());
      let mongoMap = {};
      try {
        const res = await api.get(`/loans?borrowerAddress=${account.toLowerCase()}`);
        (res.data.loans || []).forEach(m => { mongoMap[m.loanId] = m; });
      } catch {}

      const enriched = mine.map(l => ({
        ...l,
        purpose:      mongoMap[l.id]?.purpose || '',
        category:     mongoMap[l.id]?.category || 'other',
        borrowerName: mongoMap[l.id]?.borrowerName || user?.name || '',
        collateralType:   mongoMap[l.id]?.collateralType || 'none',
        collateralAmount: mongoMap[l.id]?.collateralAmount || '0',
      }));

      setLoans(enriched.filter(l => l.status !== 2));
      setHistory(enriched.filter(l => l.status === 2));
    } catch (e) {
      if (!silent) setToast({ message: 'Failed: ' + e.message, type: 'error' });
    } finally {
      if (!silent) setFetching(false);
    }
  }, [account, contractService, user]);

  useEffect(() => {
    if (isConnected && contractService) { fetchLoans(); refreshScore(); }
  }, [isConnected, contractService]);

  useEffect(() => {
    if (!isConnected) return;
    const t = setInterval(() => { fetchLoans(true); refreshScore(); }, 15000);
    return () => clearInterval(t);
  }, [isConnected, fetchLoans, refreshScore]);

  // ── Repay loan ─────────────────────────────────────
  const handleRepay = async (loan) => {
    if (repaying) return;
    setRepaying(loan.id);
    setToast({ message: '⏳ Confirm repayment in MetaMask...', type: 'loading' });
    try {
      const total   = (parseFloat(loan.amount) * (1 + parseFloat(loan.interestRate) / 100)).toFixed(6);
      const receipt = await execute(contractService.repayLoan.bind(contractService), loan.id, loan.amount, loan.interestRate);

      // ── Save repayment to backend — it recalculates score ──
      try {
        const repayRes = await api.post(`/loans/${loan.id}/repay`,
          { repaidAmount: total, borrowerAddress: account },
          { headers: { Authorization: `Bearer ${localStorage.getItem('ef-token')}` } }
        );
        // Backend returns newCreditScore directly
        if (repayRes.data.newCreditScore) {
          const newS = repayRes.data.newCreditScore;
          setPrevScore(score);
          setScore(newS);
          updateUser?.({ creditScore: newS });
          setToast({ message: `✅ Repaid! Credit score: ${score} → ${newS} 🎉`, type: 'success', txHash: receipt?.hash });
        } else {
          setToast({ message: `✅ Repaid ${total} ETH!`, type: 'success', txHash: receipt?.hash });
        }
      } catch {
        setToast({ message: `✅ Repaid ${total} ETH!`, type: 'success', txHash: receipt?.hash });
      }

      // Also update MongoDB credit score directly as fallback
      try {
        await api.put('/users/credit-score',
          { creditScore: score + 15 }, // minimum +15 per repayment
          { headers: { Authorization: `Bearer ${localStorage.getItem('ef-token')}` } }
        );
      } catch {}

      // Refresh after 3s to get accurate score from blockchain
      setTimeout(() => { fetchLoans(true); refreshScore(); }, 3000);

    } catch (e) {
      setToast({ message: e.message || 'Repayment failed', type: 'error' });
    } finally {
      setRepaying(null);
    }
  };

  if (!isConnected) return <ConnectWalletPrompt message="Connect your wallet to view your loans." />;

  const scoreColor = score >= 750 ? '#22c55e' : score >= 650 ? '#00c965' : score >= 550 ? '#f59e0b' : '#ef4444';
  const scoreLabel = score >= 750 ? 'Excellent' : score >= 650 ? 'Good' : score >= 550 ? 'Fair' : 'Poor';
  const scorePct   = ((score - 300) / 550) * 100;
  const totalBorrow = [...loans, ...history].reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const activeList  = tab === 'active' ? loans : history;

  return (
    <KYCGate action="create loan requests">
      <div className="page" style={{ position: 'relative', minHeight: '100vh' }}>
        <GeoBg />
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}

        <div className="container" style={{ padding: '2.5rem 1.5rem' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.04em', marginBottom: '6px' }}>My Loans</h1>
              <p style={{ color: 'var(--ink-3)', fontSize: '12px', fontFamily: 'monospace' }}>{account?.slice(0, 10)}...{account?.slice(-6)}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { fetchLoans(false); refreshScore(); }} className="btn btn-out btn-sm">🔄 Refresh</button>
              <Link to="/create-loan" className="btn btn-dark btn-sm">+ New Loan</Link>
            </div>
          </div>

          {/* Stats + Credit Score */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.25rem', marginBottom: '2.5rem' }}>

            {/* Stats */}
            <div className="grid-border" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
              {[
                { l: 'Active', v: loans.length, c: 'var(--ink)' },
                { l: 'Repaid', v: history.length, c: 'var(--mint-dim)' },
                { l: 'Total Borrowed', v: `${totalBorrow.toFixed(3)} ETH`, c: 'var(--ink)' },
              ].map((s, i) => (
                <div key={i} className="grid-cell stat-card">
                  <div className="stat-val" style={{ color: s.c, fontSize: 'clamp(1rem,2vw,1.5rem)' }}>{s.v}</div>
                  <div className="stat-lbl">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Credit Score Ring */}
            <div className="card" style={{ padding: '1.25rem', minWidth: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🧠 Credit Score</span>
                {prevScore && score > prevScore && (
                  <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 800 }}>
                    +{score - prevScore} ↑
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* SVG ring */}
                <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
                  <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border)" strokeWidth="5" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke={scoreColor} strokeWidth="5"
                      strokeDasharray={`${2 * Math.PI * 26}`}
                      strokeDashoffset={`${2 * Math.PI * 26 * (1 - scorePct / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1.5s ease, stroke 0.5s' }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontWeight: 900, fontSize: '13px', color: scoreColor }}>
                    {score}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: scoreColor, fontSize: '14px', marginBottom: '3px' }}>{scoreLabel}</div>
                  <div style={{ height: '4px', width: '110px', borderRadius: '99px', background: 'linear-gradient(90deg,#ef4444,#f59e0b,#22c55e)', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-4px', left: `${scorePct}%`, width: '12px', height: '12px', borderRadius: '50%', background: 'var(--card-bg)', border: `2px solid ${scoreColor}`, transform: 'translateX(-50%)', transition: 'left 1.5s ease' }} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--ink-3)', marginTop: '5px' }}>+15 per repayment</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            {[{ id: 'active', label: `Active (${loans.length})` }, { id: 'history', label: `Repaid (${history.length})` }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: '0.625rem 1.25rem', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? 'var(--mint)' : 'transparent'}`, color: tab === t.id ? 'var(--ink)' : 'var(--ink-3)', marginBottom: '-1px', transition: 'all 0.2s' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Loans */}
          {fetching ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--ink-3)' }}>⏳ Loading from blockchain...</div>
          ) : activeList.length === 0 ? (
            <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{tab === 'active' ? '💸' : '📋'}</div>
              <h3 style={{ color: 'var(--ink)', fontWeight: 800, marginBottom: '8px' }}>
                {tab === 'active' ? 'No active loans' : 'No repaid loans yet'}
              </h3>
              {tab === 'active' && (
                <Link to="/create-loan" className="btn btn-dark btn-sm" style={{ marginTop: '1rem', display: 'inline-flex' }}>
                  Create Loan →
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeList.map(loan => (
                <LoanCard key={loan.id} loan={loan}
                  onRepay={tab === 'active' ? () => handleRepay(loan) : null}
                  repaying={repaying === loan.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    </KYCGate>
  );
}

function LoanCard({ loan, onRepay, repaying }) {
  const total    = (parseFloat(loan.amount || 0) * (1 + parseFloat(loan.interestRate || 0) / 100)).toFixed(4);
  const funded   = loan.amount ? Math.min(100, (parseFloat(loan.fundedAmount || 0) / parseFloat(loan.amount)) * 100) : 0;
  const isActive = loan.status === 1;
  const isRepaid = loan.status === 2;
  const sc       = STATUS_COLOR[loan.status] || '#888';

  let daysLeft = null;
  if (isActive && loan.fundedAt) {
    const due = new Date(new Date(loan.fundedAt).getTime() + loan.duration * 86400000);
    daysLeft = Math.ceil((due - new Date()) / 86400000);
  }
 

  return (
    <div className="card card-hover" style={{ padding: '1.5rem', borderColor: isActive && daysLeft !== null && daysLeft <= 3 ? 'rgba(239,68,68,0.35)' : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 900, color: 'var(--ink)', fontSize: '15px' }}>Loan #{loan.id}</span>
            <span className="pill" style={{ background: `${sc}18`, color: sc }}>{STATUS_LABEL[loan.status] || 'Unknown'}</span>
            {loan.category && <span className="pill pill-gray">{loan.category}</span>}
            {/* ── COLLATERAL BADGE ── */}
            {loan.collateralType === 'eth' && (
              <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '99px', background: 'rgba(0,232,122,0.1)', color: '#00c965', border: '1px solid rgba(0,232,122,0.25)' }}>
                ⟠ {parseFloat(loan.collateralAmount || 0).toFixed(2)} ETH Secured
              </span>
            )}
          </div>

          {loan.purpose && <p style={{ fontSize: '13px', color: 'var(--ink-3)', fontStyle: 'italic', marginBottom: '12px' }}>"{loan.purpose}"</p>}

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '12px' }}>
            {[
              ['Amount',   `${parseFloat(loan.amount).toFixed(2)} ETH`, '#00c965'],
              ['Interest', `${loan.interestRate}%`,                      '#8b5cf6'],
              ['Duration', `${loan.duration} days`,                      'var(--ink)'],
              ['Repay',    `${total} ETH`,                               'var(--ink)'],
              ...(daysLeft !== null ? [['Days Left', daysLeft <= 0 ? '🚨 OVERDUE' : `${daysLeft}d`, daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : '#00c965']] : []),
            ].map(([l, v, c]) => (
              <div key={l}>
                <div style={{ fontSize: '10px', color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{l}</div>
                <div style={{ fontWeight: 800, color: c, fontFamily: String(v).includes('ETH') ? 'monospace' : 'inherit' }}>{v}</div>
              </div>
            ))}
          </div>

          {!isRepaid && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink-3)', marginBottom: '4px' }}>
                <span>{parseFloat(loan.fundedAmount || 0).toFixed(4)} ETH funded</span>
                <span>{funded.toFixed(0)}%</span>
              </div>
              <div className="prog"><div className="prog-fill" style={{ width: `${funded}%` }} /></div>
            </div>
          )}
          {loan.investments?.some(i => i.paymentMethod === 'inr') && (() => {
          const inv = loan.investments.find(i => i.paymentMethod === 'inr');
          return (
          <div style={{ marginTop:'10px', padding:'8px 12px', background:'rgba(0,232,122,0.06)', border:'1px solid rgba(0,232,122,0.2)', borderRadius:'8px', fontSize:'12px', color:'#00c965', display:'flex', justifyContent:'space-between' }}>
          <span>💳 Funded via INR Payment</span>
          <span style={{ fontWeight:700 }}>₹{Number(inv.inrAmount||0).toLocaleString('en-IN')} by {inv.lenderName}</span>
          </div>
          );
        })()}
        </div>

        {/* Action */}
        {isActive && onRepay && (
          <button onClick={onRepay} disabled={!!repaying}
            style={{ background: repaying ? 'rgba(34,197,94,0.2)' : '#00e87a', color: '#000000', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 800, fontSize: '13px', whiteSpace: 'nowrap', cursor: repaying ? 'not-allowed' : 'pointer', border: 'none' }}>
            {repaying ? '⏳ Processing...' : `💸 Repay ${total} ETH`}
          </button>
        )}
        {isRepaid && <span className="pill pill-mint" style={{ fontSize: '13px', padding: '6px 14px' }}>✅ Fully Repaid</span>}
      </div>
    </div>
  );
}
