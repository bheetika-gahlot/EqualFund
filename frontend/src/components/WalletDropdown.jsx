// WalletDropdown.jsx — fixed button contrast for both modes
import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';

export default function WalletDropdown() {
  const { account, balance, isConnected, isConnecting, connectWallet, disconnect, formatAddress } = useWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!isConnected) {
    return (
      <button
        onClick={connectWallet}
        disabled={isConnecting}
        style={{
          background: 'var(--mint)',
          color: '#000000',            /* ALWAYS BLACK — never white */
          border: 'none',
          padding: '0.45rem 1.25rem',
          borderRadius: '99px',
          fontSize: '13px',
          fontWeight: 700,
          cursor: isConnecting ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity='0.9'; e.currentTarget.style.transform='translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform=''; }}>
        {isConnecting ? '⏳ Connecting...' : '🦊 Connect Wallet'}
      </button>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '0.4rem 1rem 0.4rem 0.5rem',
          borderRadius: '99px',
          background: 'var(--mint-pale)',
          border: '1px solid rgba(0,232,122,0.25)',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 700,
          color: 'var(--mint-dim)',      /* visible in both modes */
          fontFamily: 'inherit',
          transition: 'all 0.2s',
        }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--mint)', animation: 'blink 2s infinite', flexShrink: 0 }} />
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{formatAddress(account)}</span>
        <span style={{ fontSize: '10px', color: 'var(--ink-3)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 300,
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: '14px', padding: '1rem', minWidth: '220px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          animation: 'slideDown 0.2s ease',
        }}>
          <div style={{ marginBottom: '10px', padding: '10px', background: 'var(--surface-3)', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Connected</div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--ink)', fontWeight: 700 }}>{account?.slice(0,12)}...{account?.slice(-6)}</div>
          </div>

          <div style={{ padding: '10px', background: 'var(--mint-pale)', borderRadius: '10px', marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--mint-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Balance</div>
            <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 900, color: 'var(--ink)' }}>{parseFloat(balance||0).toFixed(4)} ETH</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <a href={`https://sepolia.etherscan.io/address/${account}`} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: 'var(--surface-3)', fontSize: '13px', fontWeight: 600, color: 'var(--ink)', textDecoration: 'none', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--border)'}
              onMouseLeave={e => e.currentTarget.style.background='var(--surface-3)'}>
              🔍 View on Etherscan
            </a>
            <button onClick={() => { disconnect(); setOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#ef4444', cursor: 'pointer', transition: 'background 0.15s', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              🔌 Disconnect
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
      `}</style>
    </div>
  );
}
