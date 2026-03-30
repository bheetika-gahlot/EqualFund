import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { useAuth } from '../context/AuthContext';
import ConnectWalletPrompt from '../components/ConnectWalletPrompt';
import Toast from '../components/Toast';
import KYCGate from '../components/KYCGate';
import api from '../services/apiService';

const STATUS_LABELS = ['⏳ Pending', '✅ Active', '💚 Repaid', '🔴 Defaulted'];
const STATUS_COLORS = ['#f59e0b', '#06b6d4', '#22c55e', '#ef4444'];

export default function BorrowerDashboard() {
  const { isConnected, account } = useWallet();
  const { contractService, execute } = useContract();
  const { user, updateUser } = useAuth();
  const [loans, setLoans]         = useState([]);
  const [history, setHistory]     = useState([]);
  const [fetching, setFetching]   = useState(true);
  const [toast, setToast]         = useState(null);
  const [repaying, setRepaying]   = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [creditScore, setCreditScore] = useState(user?.creditScore || 650);

  const fetchLoans = useCallback(async () => {
    if (!account || !contractService) return;
    setFetching(true);
    try {
      const allLoans = await contractService.getAllLoans();
      const mine = allLoans.filter(l => l.borrower?.toLowerCase() === account?.toLowerCase());

      // ── FIX: Get live credit score from blockchain ──
      try {
        const score = await contractService.getCreditScore(account);
        if (score && score !== creditScore) {
          setCreditScore(score);
          updateUser({ creditScore: score }); // sync to MongoDB too
        }
      } catch { /* use existing score */ }

      // Enrich with MongoDB
      try {
        const res = await api.get(`/loans?borrowerAddress=${account.toLowerCase()}`);
        const mongoLoans = res.data.loans || [];
        const enriched = mine.map(chainLoan => {
          const mongoLoan = mongoLoans.find(m => m.loanId === chainLoan.id);
          return {
            ...chainLoan,
            purpose:      mongoLoan?.purpose      || '',
            category:     mongoLoan?.category     || 'other',
            borrowerName: mongoLoan?.borrowerName || user?.name || '',
          };
        });
        setLoans(enriched.filter(l => l.status !== 2));
        setHistory(enriched.filter(l => l.status === 2));
      } catch {
        setLoans(mine.filter(l => l.status !== 2));
        setHistory(mine.filter(l => l.status === 2));
      }
    } catch (e) {
      setToast({ message: 'Failed to load loans: ' + e.message, type: 'error' });
    } finally {
      setFetching(false);
    }
  }, [account, contractService]);

  useEffect(() => {
    if (isConnected && contractService) fetchLoans();
  }, [isConnected, contractService, fetchLoans]);

  // ── AUTO REFRESH every 15 seconds ──────────────────────
  useEffect(() => {
    if (!isConnected || !account) return;
    const timer = setInterval(fetchLoans, 15000);
    return () => clearInterval(timer);
  }, [isConnected, account, fetchLoans]);

  const handleRepay = async (loan) => {
    if (repaying) return;
    setRepaying(loan.id);
    setToast({ message: '⏳ Confirm repayment in MetaMask...', type: 'loading' });
    try {
      const totalRepay = (parseFloat(loan.amount) * (1 + parseFloat(loan.interestRate) / 100)).toFixed(6);
      const receipt = await execute(
        contractService.repayLoan.bind(contractService),
        loan.id,
        loan.amount,
        loan.interestRate
      );

      // Save to MongoDB
      try {
        await api.post(`/loans/${loan.id}/repay`, {
          repaidAmount:    totalRepay,
          borrowerAddress: account,
        }, { headers: { Authorization: `Bearer ${localStorage.getItem('ef-token')}` } });
      } catch (e) { console.warn('Repayment save failed:', e.message); }

      setToast({ message: `✅ Repaid ${totalRepay} ETH!`, type: 'success', txHash: receipt?.hash });

      // Refresh immediately to show updated credit score
      setTimeout(fetchLoans, 3000);
    } catch (e) {
      setToast({ message: e.message || 'Repayment failed', type: 'error' });
    } finally {
      setRepaying(null);
    }
  };

  if (!isConnected) return <ConnectWalletPrompt message="Connect your wallet to view your loans." />;

  return (
    <KYCGate action="create loan requests">
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem' }}>
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>My Loans</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Credit Score: <strong style={{ color: creditScore >= 700 ? '#22c55e' : creditScore >= 600 ? '#06b6d4' : '#f59e0b' }}>{creditScore}</strong>
              {' · '}Wallet: <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{account?.slice(0,8)}...{account?.slice(-4)}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={fetchLoans} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4', cursor: 'pointer', fontSize: '0.8rem' }}>
              🔄 Refresh
            </button>
            <Link to="/create-loan" className="btn-primary" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem' }}>
              + New Loan Request
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[
            { id: 'active',  label: `Active Loans (${loans.length})` },
            { id: 'history', label: `Repaid History (${history.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                padding: '0.625rem 1.25rem', borderRadius: '10px', border: 'none',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                background: activeTab === t.id ? 'linear-gradient(135deg,#06b6d4,#8b5cf6)' : 'rgba(255,255,255,0.05)',
                color: activeTab === t.id ? 'white' : 'var(--text-secondary)',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {fetching ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>⏳ Loading from blockchain...</div>
        ) : activeTab === 'active' ? (
          loans.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💸</div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No active loans</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Create your first loan request.</p>
              <Link to="/create-loan" className="btn-primary" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem' }}>Create Loan →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {loans.map(loan => <LoanCard key={loan.id} loan={loan} onRepay={() => handleRepay(loan)} repaying={repaying === loan.id} />)}
            </div>
          )
        ) : (
          history.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
              <p style={{ color: 'var(--text-secondary)' }}>No repaid loans yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {history.map(loan => <LoanCard key={loan.id} loan={loan} isHistory />)}
            </div>
          )
        )}
      </div>
    </KYCGate>
  );
}

function LoanCard({ loan, onRepay, repaying, isHistory }) {
  const totalRepay  = (parseFloat(loan.amount||0) * (1 + parseFloat(loan.interestRate||0)/100)).toFixed(4);
  const fundedPct   = loan.amount ? Math.min(100,(parseFloat(loan.fundedAmount||0)/parseFloat(loan.amount))*100) : 0;
  const isActive    = loan.status === 1;
  const isRepaid    = loan.status === 2;
  const statusColor = STATUS_COLORS[loan.status] || '#6b7280';

  let daysLeft = null;
  if (isActive && loan.fundedAt) {
    const due = new Date(loan.fundedAt);
    due.setDate(due.getDate() + loan.duration);
    daysLeft = Math.ceil((due - new Date()) / 86400000);
  }

  return (
    <div className="glass-card" style={{ padding: '1.5rem', border: isActive && daysLeft !== null && daysLeft <= 3 ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>Loan #{loan.id}</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: '99px', background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>
              {STATUS_LABELS[loan.status] || 'Unknown'}
            </span>
            {loan.category && (
              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>
                {loan.category}
              </span>
            )}
          </div>

          {loan.purpose && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
              "{loan.purpose}"
            </p>
          )}

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {[
              ['Amount',      `${parseFloat(loan.amount).toFixed(2)} ETH`, '#06b6d4'],
              ['Interest',    `${loan.interestRate}%`,                     '#8b5cf6'],
              ['Duration',    `${loan.duration} days`,                     'var(--text-primary)'],
              ['Total Repay', `${totalRepay} ETH`,                        '#22c55e'],
              ...(daysLeft !== null ? [['Days Left', daysLeft <= 0 ? '🚨 OVERDUE' : `${daysLeft}d`, daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : '#22c55e']] : []),
            ].map(([label, val, color]) => (
              <div key={label}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.68rem', marginBottom: '2px' }}>{label}</div>
                <div style={{ fontWeight: 700, color, fontFamily: val.includes('ETH') ? 'monospace' : 'inherit' }}>{val}</div>
              </div>
            ))}
          </div>

          {!isRepaid && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                <span>Funded: {parseFloat(loan.fundedAmount||0).toFixed(4)} ETH</span>
                <span>{fundedPct.toFixed(0)}%</span>
              </div>
              <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${fundedPct}%`, background: fundedPct >= 100 ? '#22c55e' : 'linear-gradient(90deg,#06b6d4,#8b5cf6)', borderRadius: '99px' }} />
              </div>
            </div>
          )}
        </div>

        {isActive && onRepay && (
          <button onClick={onRepay} disabled={!!repaying}
            style={{
              padding: '0.875rem 1.75rem', borderRadius: '12px', border: 'none',
              background: repaying ? 'rgba(34,197,94,0.3)' : daysLeft !== null && daysLeft <= 0 ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#22c55e,#16a34a)',
              color: 'white', fontWeight: 800, fontSize: '0.9rem',
              cursor: repaying ? 'not-allowed' : 'pointer',
              boxShadow: '0 0 20px rgba(34,197,94,0.2)', whiteSpace: 'nowrap',
            }}>
            {repaying ? '⏳ Processing...' : `💸 Repay ${totalRepay} ETH`}
          </button>
        )}

        {isRepaid && (
          <div style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontWeight: 700, fontSize: '0.85rem' }}>
            ✅ Fully Repaid
          </div>
        )}
      </div>
    </div>
  );
}
