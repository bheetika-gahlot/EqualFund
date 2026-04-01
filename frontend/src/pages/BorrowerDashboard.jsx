import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { useAuth } from '../context/AuthContext';
import GeoBg from '../components/GeoBg';
import ConnectWalletPrompt from '../components/ConnectWalletPrompt';
import Toast from '../components/Toast';
import KYCGate from '../components/KYCGate';
import api from '../services/apiService';

const STATUS = ['⏳ Pending','✅ Active','💚 Repaid','🔴 Defaulted'];
const STATUS_C = ['#f59e0b','#00c965','#22c55e','#ef4444'];

export default function BorrowerDashboard() {
  const { isConnected, account } = useWallet();
  const { contractService, execute } = useContract();
  const { user } = useAuth();
  const [loans, setLoans]       = useState([]);
  const [history, setHistory]   = useState([]);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast]       = useState(null);
  const [repaying, setRepaying] = useState(null);
  const [tab, setTab]           = useState('active');

  const fetchLoans = useCallback(async (silent = false) => {
    if (!account || !contractService) return;
    if (!silent) setFetching(true);
    try {
      const all  = await contractService.getAllLoans();
      const mine = all.filter(l => l.borrower?.toLowerCase() === account.toLowerCase());
      try {
        const res      = await api.get(`/loans?borrowerAddress=${account.toLowerCase()}`);
        const mongoMap = {};
        (res.data.loans || []).forEach(m => { mongoMap[m.loanId] = m; });
        const enriched = mine.map(l => ({
          ...l,
          purpose:      mongoMap[l.id]?.purpose      || '',
          category:     mongoMap[l.id]?.category     || 'other',
          borrowerName: mongoMap[l.id]?.borrowerName || user?.name || '',
        }));
        setLoans(enriched.filter(l => l.status !== 2));
        setHistory(enriched.filter(l => l.status === 2));
      } catch {
        setLoans(mine.filter(l => l.status !== 2));
        setHistory(mine.filter(l => l.status === 2));
      }
    } catch (e) {
      setToast({ message:'Failed to load: ' + e.message, type:'error' });
    } finally {
      if (!silent) setFetching(false);
    }
  }, [account, contractService, user]);

  useEffect(() => {
    if (isConnected && contractService) fetchLoans();
  }, [isConnected, contractService, fetchLoans]);

  useEffect(() => {
    if (!isConnected) return;
    const t = setInterval(() => fetchLoans(true), 15000);
    return () => clearInterval(t);
  }, [isConnected, fetchLoans]);

  const handleRepay = async (loan) => {
    if (repaying) return;
    setRepaying(loan.id);
    setToast({ message:'⏳ Confirm repayment in MetaMask...', type:'loading' });
    try {
      const total   = (parseFloat(loan.amount) * (1 + parseFloat(loan.interestRate)/100)).toFixed(6);
      const receipt = await execute(contractService.repayLoan.bind(contractService), loan.id, loan.amount, loan.interestRate);
      try {
        await api.post(`/loans/${loan.id}/repay`, { repaidAmount:total, borrowerAddress:account },
          { headers:{ Authorization:`Bearer ${localStorage.getItem('ef-token')}` } });
      } catch {}
      setToast({ message:`✅ Repaid ${total} ETH!`, type:'success', txHash:receipt?.hash });
      setTimeout(() => fetchLoans(), 3000);
    } catch (e) {
      setToast({ message:e.message || 'Repayment failed', type:'error' });
    } finally {
      setRepaying(null);
    }
  };

  if (!isConnected) return <ConnectWalletPrompt message="Connect your wallet to view your loans." />;

  const activeList  = tab === 'active' ? loans : history;
  const totalBorrow = [...loans,...history].reduce((s,l) => s + parseFloat(l.amount||0), 0);

  return (
    <KYCGate action="create loan requests">
      <div className="page" style={{ position:'relative', minHeight:'100vh' }}>
        <GeoBg />
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}

        <div className="container" style={{ padding:'2.5rem 1.5rem' }}>

          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2.5rem', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <h1 style={{ fontSize:'clamp(1.75rem,4vw,2.5rem)', fontWeight:900, color:'var(--ink)', letterSpacing:'-0.04em', marginBottom:'6px' }}>My Loans</h1>
              <p style={{ color:'var(--ink-3)', fontSize:'13px' }}>
                Credit Score: <strong style={{ color:'var(--mint-dim)' }}>{user?.creditScore || 650}</strong>
                {' · '}
                <span style={{ fontFamily:'monospace' }}>{account?.slice(0,8)}...{account?.slice(-4)}</span>
              </p>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => fetchLoans(false)} className="btn btn-out btn-sm">🔄 Refresh</button>
              <Link to="/create-loan" className="btn btn-dark btn-sm">+ New Loan</Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid-border" style={{ gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', marginBottom:'2.5rem' }}>
            {[
              { l:'Active Loans',   v:loans.length,                  c:'var(--ink)'     },
              { l:'Repaid Loans',   v:history.length,                c:'var(--mint-dim)'},
              { l:'Total Borrowed', v:`${totalBorrow.toFixed(3)} ETH`, c:'var(--ink)'   },
              { l:'Credit Score',   v:user?.creditScore || 650,      c:'var(--mint-dim)'},
            ].map((s,i) => (
              <div key={i} className="grid-cell stat-card">
                <div className="stat-val" style={{ color:s.c }}>{s.v}</div>
                <div className="stat-lbl">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'1.5rem', borderBottom:'1px solid var(--border)', paddingBottom:'0' }}>
            {[
              { id:'active',  label:`Active (${loans.length})`     },
              { id:'history', label:`Repaid (${history.length})`   },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding:'0.625rem 1.25rem', fontSize:'13px', fontWeight:700, cursor:'pointer', background:'none', border:'none', borderBottom:`2px solid ${tab===t.id?'var(--mint)':'transparent'}`, color:tab===t.id?'var(--ink)':'var(--ink-3)', marginBottom:'-1px', transition:'all 0.2s' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Loan list */}
          {fetching ? (
            <div style={{ textAlign:'center', padding:'4rem', color:'var(--ink-3)', fontSize:'14px' }}>⏳ Loading from blockchain...</div>
          ) : activeList.length === 0 ? (
            <div className="card" style={{ padding:'4rem', textAlign:'center' }}>
              <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>💸</div>
              <h3 style={{ color:'var(--ink)', marginBottom:'8px', fontWeight:800 }}>{tab==='active'?'No active loans':'No repaid loans yet'}</h3>
              {tab === 'active' && (
                <Link to="/create-loan" className="btn btn-dark btn-sm" style={{ marginTop:'1rem', display:'inline-flex' }}>
                  Create Loan →
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {activeList.map(loan => (
                <LoanCard key={loan.id} loan={loan} onRepay={() => handleRepay(loan)} repaying={repaying===loan.id} isHistory={tab==='history'} />
              ))}
            </div>
          )}
        </div>
      </div>
    </KYCGate>
  );
}

function LoanCard({ loan, onRepay, repaying, isHistory }) {
  const totalRepay  = (parseFloat(loan.amount||0) * (1 + parseFloat(loan.interestRate||0)/100)).toFixed(4);
  const fundedPct   = loan.amount ? Math.min(100,(parseFloat(loan.fundedAmount||0)/parseFloat(loan.amount))*100) : 0;
  const isActive    = loan.status === 1;
  const isRepaid    = loan.status === 2;
  const statusColor = STATUS_C[loan.status] || '#888';

  let daysLeft = null;
  if (isActive && loan.fundedAt) {
    const due = new Date(loan.fundedAt);
    due.setDate(due.getDate() + loan.duration);
    daysLeft = Math.ceil((due - new Date()) / 86400000);
  }

  return (
    <div className="card card-hover" style={{
      padding:'1.5rem',
      borderColor: isActive && daysLeft !== null && daysLeft <= 3 ? 'rgba(239,68,68,0.35)' : undefined,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem', flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:'200px' }}>

          {/* Top row */}
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px', flexWrap:'wrap' }}>
            <span style={{ fontWeight:900, color:'var(--ink)', fontSize:'15px', letterSpacing:'-0.02em' }}>Loan #{loan.id}</span>
            <span className="pill" style={{ background:`${statusColor}18`, color:statusColor }}>
              {STATUS[loan.status] || 'Unknown'}
            </span>
            {loan.category && (
              <span className="pill pill-gray">{loan.category}</span>
            )}
          </div>

          {loan.purpose && (
            <p style={{ fontSize:'13px', color:'var(--ink-3)', fontStyle:'italic', marginBottom:'12px' }}>"{loan.purpose}"</p>
          )}

          {/* Numbers */}
          <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap', marginBottom:'14px', fontSize:'13px' }}>
            {[
              ['Amount',   `${parseFloat(loan.amount).toFixed(2)} ETH`, 'var(--mint-dim)'],
              ['Interest', `${loan.interestRate}%`,                      '#8b5cf6'],
              ['Duration', `${loan.duration} days`,                      'var(--ink)'],
              ['Repay',    `${totalRepay} ETH`,                         'var(--ink)'],
              ...(daysLeft !== null ? [['Days Left', daysLeft <= 0 ? '🚨 OVERDUE' : `${daysLeft}d`, daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : 'var(--mint-dim)']] : []),
            ].map(([l, v, c]) => (
              <div key={l}>
                <div style={{ fontSize:'10px', color:'var(--ink-3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'2px' }}>{l}</div>
                <div style={{ fontWeight:800, color:c, fontFamily:v.includes('ETH')?'monospace':'inherit' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Progress */}
          {!isRepaid && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'var(--ink-3)', marginBottom:'4px' }}>
                <span>Funded: {parseFloat(loan.fundedAmount||0).toFixed(4)} ETH</span>
                <span>{fundedPct.toFixed(0)}%</span>
              </div>
              <div className="prog"><div className="prog-fill" style={{ width:`${fundedPct}%` }} /></div>
            </div>
          )}
        </div>

        {/* Action */}
        {isActive && onRepay && (
          <button onClick={onRepay} disabled={!!repaying}
            className="btn btn-sm"
            style={{
              background: repaying ? 'rgba(34,197,94,0.2)' : (daysLeft !== null && daysLeft <= 0 ? '#ef4444' : 'var(--mint)'),
              color: '#000000',
              padding:'0.75rem 1.5rem', borderRadius:'10px', fontWeight:800, fontSize:'13px',
              whiteSpace:'nowrap', cursor:repaying?'not-allowed':'pointer', border:'none',
            }}>
            {repaying ? '⏳ Processing...' : `💸 Repay ${totalRepay} ETH`}
          </button>
        )}
        {isRepaid && (
          <span className="pill pill-mint" style={{ fontSize:'13px', padding:'6px 14px' }}>✅ Fully Repaid</span>
        )}
      </div>
    </div>
  );
}
