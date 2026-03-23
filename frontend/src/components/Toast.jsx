import React, { useEffect } from 'react';

// Maps raw blockchain errors to human-readable messages
function parseError(message) {
  if (!message) return 'Something went wrong. Please try again.';
  if (message.includes('user rejected') || message.includes('User denied')) return 'Transaction cancelled — you rejected the MetaMask request.';
  if (message.includes('insufficient funds')) return 'Insufficient ETH balance to complete this transaction.';
  if (message.includes('Borrower cannot fund own loan')) return 'You cannot fund your own loan request.';
  if (message.includes('Exceeds loan amount')) return 'Your funding amount exceeds the remaining loan amount needed.';
  if (message.includes('Loan is not available for funding')) return 'This loan is no longer available for funding.';
  if (message.includes('Insufficient repayment amount')) return 'Repayment amount is too low. Please include principal + interest.';
  if (message.includes('Loan already repaid')) return 'This loan has already been fully repaid.';
  if (message.includes('Not the borrower')) return 'Only the original borrower can repay this loan.';
  if (message.includes('Loan is not active')) return 'This loan is not in an active state for repayment.';
  if (message.includes('Loan does not exist')) return 'This loan ID does not exist on the blockchain.';
  if (message.includes('Amount must be greater than 0')) return 'Loan amount must be greater than zero.';
  if (message.includes('Interest rate must be between')) return 'Interest rate must be between 0.01% and 50%.';
  if (message.includes('Duration must be between')) return 'Loan duration must be between 7 and 365 days.';
  if (message.includes('network changed') || message.includes('underlying network')) return 'Network changed. Please refresh the page.';
  if (message.includes('could not decode result') || message.includes('BAD_DATA')) return 'Contract not found at this address. Please re-deploy and refresh.';
  if (message.includes('nonce')) return 'Nonce mismatch. Reset MetaMask account in Settings → Advanced → Clear activity.';
  if (message.includes('gas')) return 'Transaction ran out of gas. Try increasing gas limit in MetaMask.';
  if (message.includes('CALL_EXCEPTION')) return 'Smart contract call failed. The transaction was reverted.';
  return message.length > 120 ? message.slice(0, 120) + '...' : message;
}

const CONFIGS = {
  success: { icon: '✅', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', color: '#34d399', label: 'Success' },
  error: { icon: '❌', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', color: '#f87171', label: 'Error' },
  loading: { icon: '⏳', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.25)', color: '#22d3ee', label: 'Processing' },
  warning: { icon: '⚠️', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', color: '#fbbf24', label: 'Warning' },
};

export default function Toast({ message, type = 'success', onClose, txHash }) {
  const cfg = CONFIGS[type] || CONFIGS.success;
  const displayMessage = type === 'error' ? parseError(message) : message;

  useEffect(() => {
    if (type === 'loading') return;
    const t = setTimeout(onClose, 7000);
    return () => clearTimeout(t);
  }, [onClose, type]);

  return (
    <div style={{
      position:'fixed', bottom:'1.5rem', right:'1.5rem',
      zIndex:100, maxWidth:'400px', width:'100%',
      animation:'slideInRight 0.3s ease',
    }}>
      <div style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius:'16px',
        padding:'1rem 1.25rem',
        backdropFilter:'blur(12px)',
        boxShadow:'0 20px 40px rgba(0,0,0,0.3)',
      }}>
        <div style={{display:'flex', alignItems:'flex-start', gap:'0.75rem'}}>
          <span style={{fontSize:'1.25rem', flexShrink:0}}>
            {type === 'loading'
              ? <span style={{display:'inline-block', animation:'spin 1s linear infinite'}}>⟳</span>
              : cfg.icon}
          </span>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:'0.75rem', fontWeight:700, color:cfg.color, marginBottom:'0.2rem', textTransform:'uppercase', letterSpacing:'0.06em'}}>
              {cfg.label}
            </div>
            <p style={{fontSize:'0.875rem', color:'var(--text-primary)', lineHeight:1.5, wordBreak:'break-word'}}>
              {displayMessage}
            </p>
            {txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank" rel="noreferrer"
                style={{fontSize:'0.72rem', color:'#06b6d4', fontFamily:'monospace', marginTop:'0.3rem', display:'block'}}>
                🔗 View on Etherscan: {txHash.slice(0,18)}...
              </a>
            )}
          </div>
          {type !== 'loading' && (
            <button onClick={onClose}
              style={{color:'var(--text-secondary)', background:'none', border:'none', cursor:'pointer', fontSize:'1.1rem', lineHeight:1, flexShrink:0}}>
              ×
            </button>
          )}
        </div>

        {/* Progress bar for auto-close */}
        {type !== 'loading' && (
          <div style={{marginTop:'0.75rem', height:'2px', background:'rgba(255,255,255,0.06)', borderRadius:'99px', overflow:'hidden'}}>
            <div style={{
              height:'100%', background:cfg.color, borderRadius:'99px',
              animation:'shrink 7s linear forwards',
              transformOrigin:'left',
            }} />
          </div>
        )}
      </div>
      <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
    </div>
  );
}