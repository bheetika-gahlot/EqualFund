import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { useAuth } from '../context/AuthContext';
import ConnectWalletPrompt from '../components/ConnectWalletPrompt';
import Toast from '../components/Toast';
import { saveFundingToMongoDB } from '../services/loanService';
import api from '../services/apiService';

const STATUS_COLORS  = { Pending: '#f59e0b', Active: '#06b6d4', Repaid: '#22c55e', Defaulted: '#ef4444' };
const CATEGORY_COLORS = { education:'#06b6d4', medical:'#f43f5e', business:'#8b5cf6', emergency:'#ef4444', housing:'#f59e0b', other:'#6b7280' };

export default function Marketplace() {
  const { isConnected, account } = useWallet();
  const { loading, error, execute, contractService, setError } = useContract();
  const { user } = useAuth();
  const [loans, setLoans]           = useState([]);
  const [fetchingLoans, setFetchingLoans] = useState(false);
  const [toast, setToast]           = useState(null);
  const [fundModal, setFundModal]   = useState(null);
  const [fundAmount, setFundAmount] = useState('');
  const [filter, setFilter]         = useState('All');

  const showToast = (message, type = 'success', txHash) => setToast({ message, type, txHash });

  const fetchLoans = async () => {
    if (!isConnected || !contractService) return;
    setFetchingLoans(true);
    try {
      // PRIMARY: Read from blockchain (correct loanIds, real-time status)
      const chainLoans = await contractService.getAllLoans();

      // ENRICH: Merge with MongoDB for purpose/category/names
      let mongoMap = {};
      try {
        const res = await api.get('/loans');
        (res.data.loans || []).forEach(m => { mongoMap[m.loanId] = m; });
      } catch { /* MongoDB unavailable — use chain data only */ }

      const enriched = chainLoans.map(loan => {
        const mongo = mongoMap[loan.id];
        return {
          ...loan,
          purpose:      mongo?.purpose      || '',
          category:     mongo?.category     || 'other',
          borrowerName: mongo?.borrowerName || `${loan.borrower?.slice(0,6)}...${loan.borrower?.slice(-4)}`,
        };
      });

      setLoans(enriched);
    } catch (e) {
      showToast('Failed to load loans: ' + e.message, 'error');
    } finally {
      setFetchingLoans(false);
    }
  };

  useEffect(() => {
    if (isConnected && contractService) fetchLoans();
  }, [isConnected, contractService]);

  const handleFund = async () => {
    if (!fundModal || !fundAmount) return;
    showToast('Waiting for MetaMask confirmation...', 'loading');
    try {
      const receipt = await execute(
        contractService.fundLoan.bind(contractService),
        fundModal.id,
        fundAmount
      );

      const prevFunded    = parseFloat(fundModal.fundedAmount || 0);
      const newFunded     = prevFunded + parseFloat(fundAmount);
      const isFullyFunded = newFunded >= parseFloat(fundModal.amount);

      // Save to MongoDB + send notifications with real borrower name
      await saveFundingToMongoDB(
        fundModal.id,
        account,
        fundAmount,
        newFunded.toString(),
        isFullyFunded
      );

      setFundModal(null);
      setFundAmount('');
      showToast(
        isFullyFunded ? '🎉 Loan fully funded! Borrower notified.' : '✅ Funded successfully!',
        'success',
        receipt?.hash
      );
      await fetchLoans();
    } catch (e) {
      showToast(e.message || 'Fund failed', 'error');
    }
  };

  // Filter
  const filteredLoans = filter === 'All'
    ? loans
    : loans.filter(l => l.statusLabel?.toLowerCase() === filter.toLowerCase());

  if (!isConnected) return <ConnectWalletPrompt message="Connect your wallet to browse the loan marketplace." />;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Loan Marketplace</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Browse and fund peer-to-peer loans · {loans.length} total
            {account && <span> · Your wallet: <span style={{ fontFamily: 'monospace' }}>{account.slice(0,8)}...{account.slice(-4)}</span></span>}
          </p>
        </div>
        <button onClick={fetchLoans} disabled={fetchingLoans} className="btn-secondary" style={{ fontSize: '0.82rem' }}>
          {fetchingLoans ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        {['All', 'Pending', 'Active', 'Repaid', 'Defaulted'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '0.4rem 1rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600,
              border: filter === f ? 'none' : '1px solid var(--border)',
              background: filter === f ? 'linear-gradient(135deg,#06b6d4,#8b5cf6)' : 'transparent',
              color: filter === f ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}>
            {f} ({f === 'All' ? loans.length : loans.filter(l => l.statusLabel?.toLowerCase() === f.toLowerCase()).length})
          </button>
        ))}
      </div>

      {/* Loans Grid */}
      {fetchingLoans ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1rem' }}>
          {[1,2,3].map(i => (
            <div key={i} className="glass-card" style={{ padding: '1.5rem', height: '240px' }}>
              {[40,60,80,50,30].map((w,j) => <div key={j} className="skeleton" style={{ height: '1rem', width: `${w}%`, marginBottom: '0.75rem' }} />)}
            </div>
          ))}
        </div>
      ) : filteredLoans.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <p style={{ color: 'var(--text-secondary)' }}>No {filter !== 'All' ? filter.toLowerCase() : ''} loans found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1rem' }}>
          {filteredLoans.map(loan => {
            // ── KEY FIX: Compare blockchain borrower address with current wallet ──
            const isMine    = loan.borrower?.toLowerCase() === account?.toLowerCase();
            const isPending = loan.status === 0;
            const catColor  = CATEGORY_COLORS[loan.category] || '#6b7280';
            const fundedPct = loan.amount ? Math.min(100, (parseFloat(loan.fundedAmount||0) / parseFloat(loan.amount)) * 100) : 0;
            const totalRepay = loan.amount ? (parseFloat(loan.amount) * (1 + parseFloat(loan.interestRate||0)/100)).toFixed(4) : '0';

            return (
              <div key={loan.id} className="glass-card" style={{ padding: '1.5rem' }}>
                {/* Top */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {loan.category && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: `${catColor}20`, color: catColor, border: `1px solid ${catColor}40` }}>
                        {loan.category}
                      </span>
                    )}
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: `${STATUS_COLORS[loan.statusLabel]||'#6b7280'}20`, color: STATUS_COLORS[loan.statusLabel]||'#6b7280', border: `1px solid ${STATUS_COLORS[loan.statusLabel]||'#6b7280'}40` }}>
                      {loan.statusLabel || 'Pending'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace', fontWeight: 700 }}>
                    #{loan.id}
                  </span>
                </div>

                {/* Purpose */}
                {loan.purpose && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.875rem', fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    "{loan.purpose}"
                  </p>
                )}

                {/* Numbers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  {[
                    ['AMOUNT',      `${parseFloat(loan.amount).toFixed(2)} ETH`, '#06b6d4'],
                    ['INTEREST',    `${loan.interestRate}%`,                     '#8b5cf6'],
                    ['DURATION',    `${loan.duration} days`,                     'var(--text-primary)'],
                    ['TOTAL REPAY', `${totalRepay} ETH`,                        '#22c55e'],
                  ].map(([label, val, color]) => (
                    <div key={label}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>{label}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color, fontFamily: val.includes('ETH') || val.includes('%') ? 'monospace' : 'inherit' }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                    <span>Funded: {parseFloat(loan.fundedAmount||0).toFixed(4)} ETH</span>
                    <span>{fundedPct.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${fundedPct}%`, background: fundedPct >= 100 ? '#22c55e' : `linear-gradient(90deg,${catColor},#8b5cf6)`, borderRadius: '99px', transition: 'width 0.5s' }} />
                  </div>
                </div>

                {/* Borrower info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>👤</span>
                  <span>{loan.borrowerName}</span>
                  {isMine && <span style={{ color: '#06b6d4', fontWeight: 700, fontSize: '0.7rem' }}>(You)</span>}
                </div>

                {/* ── ACTION BUTTON ── */}
                {isMine ? (
                  // Your own loan — show info only
                  <div style={{ padding: '0.625rem', borderRadius: '10px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', textAlign: 'center', fontSize: '0.78rem', color: '#06b6d4', fontWeight: 600 }}>
                    📋 Your Loan Request
                  </div>
                ) : isPending ? (
                  // Someone else's pending loan — show Fund button
                  <button
                    onClick={() => { setFundModal(loan); setFundAmount(''); }}
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '12px', border: 'none',
                      background: 'linear-gradient(135deg,#06b6d4,#0891b2)',
                      color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
                      transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(6,182,212,0.2)',
                    }}
                    onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 8px 25px rgba(6,182,212,0.35)'; }}
                    onMouseLeave={e => { e.target.style.transform = ''; e.target.style.boxShadow = '0 4px 15px rgba(6,182,212,0.2)'; }}>
                    💰 Fund This Loan
                  </button>
                ) : (
                  // Active/Repaid/Defaulted
                  <div style={{ padding: '0.625rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {loan.status === 1 ? '✅ Fully Funded — Active' : loan.status === 2 ? '💚 Repaid' : loan.status === 3 ? '🔴 Defaulted' : loan.statusLabel}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── FUND MODAL ── */}
      {fundModal && (
        <div className="modal-overlay" onClick={() => setFundModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Fund Loan #{fundModal.id}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {fundModal.borrowerName} · {fundModal.purpose ? `"${fundModal.purpose}"` : ''}
            </p>

            {/* Loan summary */}
            <div style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.82rem' }}>
                {[
                  ['Total Loan',   `${parseFloat(fundModal.amount).toFixed(4)} ETH`],
                  ['Interest',     `${fundModal.interestRate}%`],
                  ['Duration',     `${fundModal.duration} days`],
                  ['Already Funded', `${parseFloat(fundModal.fundedAmount||0).toFixed(4)} ETH`],
                  ['Remaining',    `${(parseFloat(fundModal.amount) - parseFloat(fundModal.fundedAmount||0)).toFixed(4)} ETH`],
                  ['You Receive',  `${(parseFloat(fundModal.amount) * (1 + parseFloat(fundModal.interestRate)/100)).toFixed(4)} ETH`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginBottom: '2px' }}>{k}</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label">Amount to Fund (ETH)</label>
              <input type="number" step="0.001" min="0.001"
                max={(parseFloat(fundModal.amount) - parseFloat(fundModal.fundedAmount||0)).toFixed(4)}
                value={fundAmount}
                onChange={e => setFundAmount(e.target.value)}
                className="input-field" placeholder="e.g. 0.5" />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                {['25%','50%','75%','100%'].map(pct => {
                  const remaining = parseFloat(fundModal.amount) - parseFloat(fundModal.fundedAmount||0);
                  const amt = (remaining * parseInt(pct) / 100).toFixed(4);
                  return (
                    <button key={pct} onClick={() => setFundAmount(amt)}
                      style={{ flex: 1, padding: '0.3rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                      {pct}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.375rem' }}>
                You can fund any portion of the remaining amount
              </p>
            </div>

            {error && <p style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: '1rem' }}>⚠️ {error}</p>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setFundModal(null); setError(null); }} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleFund} disabled={loading || !fundAmount} className="btn-primary" style={{ flex: 2 }}>
                {loading ? '⏳ Processing...' : `💰 Fund ${fundAmount || '0'} ETH`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
