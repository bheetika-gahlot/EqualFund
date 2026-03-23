import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import Toast from '../components/Toast';
import ConnectWalletPrompt from '../components/ConnectWalletPrompt';

const STATUS_CONFIG = {
  Pending: { color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', label: '🟡 Seeking Funds' },
  Active: { color: '#22d3ee', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)', label: '🟢 Active' },
  Repaid: { color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', label: '✅ Fully Repaid' },
  Defaulted: { color: '#f87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', label: '❌ Defaulted' },
};

export default function LoanDetail() {
  const { id } = useParams();
  const { isConnected, account } = useWallet();
  const { loading, error, execute, contractService, setError } = useContract();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast] = useState(null);
  const [fundAmount, setFundAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [showFundModal, setShowFundModal] = useState(false);
  const [showRepayModal, setShowRepayModal] = useState(false);

  const showToast = (message, type, txHash) => setToast({ message, type, txHash });

  const fetchLoan = async () => {
    if (!isConnected) return;
    setFetching(true);
    try {
      const data = await contractService.getLoan(id);
      setLoan(data);
      if (data.status === 'Active') {
        const repay = await contractService.calculateRepaymentAmount(id);
        setRepayAmount(repay);
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { if (isConnected) fetchLoan(); }, [isConnected, id]);

  const handleFund = async () => {
    showToast('Waiting for MetaMask...', 'loading');
    try {
      const receipt = await execute(contractService.fundLoan.bind(contractService), parseInt(id), fundAmount);
      setShowFundModal(false);
      showToast('Loan funded successfully!', 'success', receipt?.hash);
      fetchLoan();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleRepay = async () => {
    showToast('Waiting for MetaMask...', 'loading');
    try {
      const receipt = await execute(contractService.repayLoan.bind(contractService), parseInt(id), repayAmount);
      setShowRepayModal(false);
      showToast('Loan repaid! Credit score updated.', 'success', receipt?.hash);
      fetchLoan();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  if (!isConnected) return <ConnectWalletPrompt />;

  const cfg = loan ? (STATUS_CONFIG[loan.status] || STATUS_CONFIG.Pending) : null;
  const isBorrower = loan?.borrower?.toLowerCase() === account?.toLowerCase();
  const isLender = !isBorrower;
  const progress = loan ? Math.min(100, (parseFloat(loan.fundedAmount) / parseFloat(loan.amount)) * 100) : 0;
  const interest = loan ? (parseFloat(loan.amount) * loan.interestRate / 10000).toFixed(4) : 0;

  return (
    <div style={{maxWidth:'800px', margin:'0 auto', padding:'2rem 1rem'}}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Back */}
      <button onClick={() => navigate(-1)} className="btn-secondary" style={{marginBottom:'1.5rem', fontSize:'0.85rem'}}>
        ← Back
      </button>

      {fetching ? (
        <div style={{display:'grid', gap:'1rem'}}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{height:'80px'}} />)}
        </div>
      ) : !loan ? (
        <div style={{textAlign:'center', padding:'4rem 0', color:'var(--text-secondary)'}}>Loan not found</div>
      ) : (
        <>
          {/* Header */}
          <div className="glass-card" style={{padding:'1.75rem', marginBottom:'1.25rem'}}>
            <div style={{display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem'}}>
              <div>
                <div style={{display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.5rem'}}>
                  <span style={{fontSize:'0.8rem', color:'var(--text-secondary)', fontFamily:'monospace'}}>LOAN #{loan.id}</span>
                  <span style={{
                    padding:'0.2rem 0.75rem', borderRadius:'99px', fontSize:'0.75rem', fontWeight:700,
                    background:cfg.bg, border:`1px solid ${cfg.border}`, color:cfg.color
                  }}>{cfg.label}</span>
                </div>
                <div style={{fontSize:'2.5rem', fontWeight:800, color:'var(--text-primary)'}}>
                  {parseFloat(loan.amount).toFixed(4)} <span style={{color:'#06b6d4', fontSize:'1.5rem'}}>ETH</span>
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'0.75rem', color:'var(--text-secondary)', marginBottom:'0.25rem'}}>Annual Interest</div>
                <div style={{fontSize:'2rem', fontWeight:800, color:'#8b5cf6'}}>{(loan.interestRate / 100).toFixed(1)}%</div>
              </div>
            </div>

            {/* Progress */}
            <div style={{marginTop:'1.25rem'}}>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.8rem', color:'var(--text-secondary)', marginBottom:'0.5rem'}}>
                <span>Funded: {parseFloat(loan.fundedAmount).toFixed(4)} ETH</span>
                <span>Goal: {parseFloat(loan.amount).toFixed(4)} ETH</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width:`${progress}%`}} />
              </div>
              <div style={{textAlign:'right', fontSize:'0.75rem', color:'#06b6d4', marginTop:'0.25rem', fontWeight:600}}>{progress.toFixed(1)}% funded</div>
            </div>
          </div>

          {/* Details Grid */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'0.875rem', marginBottom:'1.25rem'}}>
            {[
              { label: 'Duration', value: `${loan.duration} days`, icon: '📅' },
              { label: 'Interest', value: `+${interest} ETH`, icon: '💰' },
              { label: 'Total Repayment', value: `${(parseFloat(loan.amount) + parseFloat(interest)).toFixed(4)} ETH`, icon: '🔁' },
              { label: 'Status', value: loan.repaid ? 'Repaid ✓' : loan.status, icon: '📊' },
            ].map(stat => (
              <div key={stat.label} className="stat-card animate-fade-in-up">
                <span style={{fontSize:'1.25rem'}}>{stat.icon}</span>
                <span style={{fontSize:'0.72rem', color:'var(--text-secondary)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em'}}>{stat.label}</span>
                <span style={{fontSize:'1rem', fontWeight:700, color:'var(--text-primary)'}}>{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Borrower Info */}
          <div className="glass-card" style={{padding:'1.25rem', marginBottom:'1.25rem'}}>
            <h3 style={{fontSize:'0.85rem', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.875rem'}}>
              Borrower
            </h3>
            <div style={{display:'flex', alignItems:'center', gap:'0.875rem'}}>
              <div style={{
                width:'44px', height:'44px', borderRadius:'12px',
                background:'linear-gradient(135deg,rgba(6,182,212,0.2),rgba(139,92,246,0.2))',
                border:'1px solid rgba(6,182,212,0.2)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'monospace', fontSize:'0.8rem', fontWeight:700, color:'#06b6d4'
              }}>
                {loan.borrower?.slice(2,4).toUpperCase()}
              </div>
              <div>
                <div style={{fontFamily:'monospace', fontSize:'0.875rem', color:'var(--text-primary)', wordBreak:'break-all'}}>
                  {loan.borrower}
                </div>
                {isBorrower && <span style={{fontSize:'0.72rem', color:'#06b6d4', fontWeight:600}}>← This is you</span>}
              </div>
            </div>
            {loan.kycHash && (
              <div style={{marginTop:'0.875rem', padding:'0.625rem 0.875rem', background:'rgba(6,182,212,0.05)', borderRadius:'10px', border:'1px solid rgba(6,182,212,0.1)'}}>
                <span style={{fontSize:'0.72rem', color:'var(--text-secondary)'}}>IPFS KYC Hash: </span>
                <span style={{fontFamily:'monospace', fontSize:'0.72rem', color:'#06b6d4'}}>{loan.kycHash}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{display:'flex', gap:'0.875rem', flexWrap:'wrap'}}>
            {isLender && loan.status === 'Pending' && (
              <button onClick={() => { setFundAmount(''); setShowFundModal(true); }} className="btn-primary" style={{flex:1, padding:'0.875rem', fontSize:'1rem'}}>
                <span>⚡ Fund This Loan</span>
              </button>
            )}
            {isBorrower && loan.status === 'Active' && !loan.repaid && (
              <button onClick={() => setShowRepayModal(true)} className="btn-purple" style={{flex:1, padding:'0.875rem', fontSize:'1rem'}}>
                🔁 Repay Loan
              </button>
            )}
          </div>
        </>
      )}

      {/* Fund Modal */}
      {showFundModal && loan && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowFundModal(false)}>
          <div className="modal-content">
            <h3 style={{fontSize:'1.25rem', fontWeight:800, color:'var(--text-primary)', marginBottom:'0.5rem'}}>Fund Loan #{loan.id}</h3>
            <p style={{color:'var(--text-secondary)', fontSize:'0.875rem', marginBottom:'1.25rem'}}>
              Remaining: {(parseFloat(loan.amount) - parseFloat(loan.fundedAmount)).toFixed(4)} ETH needed
            </p>
            <label className="label">Amount to Fund (ETH)</label>
            <input type="number" step="0.001" value={fundAmount} onChange={e => setFundAmount(e.target.value)}
              className="input-field" placeholder="0.0" style={{marginBottom:'1.25rem'}} />
            {error && <p style={{color:'#f87171', fontSize:'0.85rem', marginBottom:'0.875rem'}}>{error}</p>}
            <div style={{display:'flex', gap:'0.75rem'}}>
              <button onClick={() => { setShowFundModal(false); setError(null); }} className="btn-secondary" style={{flex:1}}>Cancel</button>
              <button onClick={handleFund} disabled={loading || !fundAmount} className="btn-primary" style={{flex:1}}>
                <span>{loading ? 'Processing...' : 'Confirm Fund'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repay Modal */}
      {showRepayModal && loan && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowRepayModal(false)}>
          <div className="modal-content">
            <h3 style={{fontSize:'1.25rem', fontWeight:800, marginBottom:'0.5rem', color:'var(--text-primary)'}}>Repay Loan #{loan.id}</h3>
            <div style={{background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'1rem', marginBottom:'1.25rem'}}>
              {[
                ['Principal', `${parseFloat(loan.amount).toFixed(4)} ETH`],
                [`Interest (${(loan.interestRate/100).toFixed(1)}%)`, `+${interest} ETH`],
                ['Total Due', `${parseFloat(repayAmount || 0).toFixed(4)} ETH`],
              ].map(([k,v],i) => (
                <div key={k} style={{display:'flex', justifyContent:'space-between', padding:'0.375rem 0', borderTop: i===2?'1px solid var(--border)':'none', marginTop:i===2?'0.375rem':'0'}}>
                  <span style={{color:'var(--text-secondary)', fontSize:'0.875rem'}}>{k}</span>
                  <span style={{fontWeight: i===2?800:600, color: i===2?'var(--text-primary)':'#8b5cf6', fontFamily:'monospace', fontSize:'0.875rem'}}>{v}</span>
                </div>
              ))}
            </div>
            {error && <p style={{color:'#f87171', fontSize:'0.85rem', marginBottom:'0.875rem'}}>{error}</p>}
            <div style={{display:'flex', gap:'0.75rem'}}>
              <button onClick={() => { setShowRepayModal(false); setError(null); }} className="btn-secondary" style={{flex:1}}>Cancel</button>
              <button onClick={handleRepay} disabled={loading} className="btn-purple" style={{flex:1}}>
                {loading ? 'Processing...' : 'Confirm Repayment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}