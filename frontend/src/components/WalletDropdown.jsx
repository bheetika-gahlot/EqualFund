import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';

export default function WalletDropdown() {
  const { account, balance, isConnected, isConnecting, connectWallet, disconnect, formatAddress } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const switchWallet = async () => {
    setOpen(false);
    disconnect();
    setTimeout(() => connectWallet(), 300);
  };

  const displayBalance = balance ? parseFloat(balance).toFixed(4) : '0.0000';

  if (!isConnected) {
    return (
      <button onClick={connectWallet} disabled={isConnecting}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)',
          border: 'none', borderRadius: '12px',
          padding: '0.5rem 1rem', cursor: 'pointer',
          fontSize: '0.8rem', fontWeight: 700, color: 'white',
          boxShadow: '0 0 20px rgba(6,182,212,0.3)',
          transition: 'all 0.2s',
        }}>
        <span style={{ fontSize: '1rem' }}>🦊</span>
        <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
      </button>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Wallet Button */}
      <button onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(6,182,212,0.08)',
          border: '1px solid rgba(6,182,212,0.25)',
          borderRadius: '12px', padding: '0.4rem 0.75rem',
          cursor: 'pointer', transition: 'all 0.2s',
        }}>
        <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 6px #22c55e' }} />
        <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>
          {formatAddress(account)}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '48px', right: 0,
          width: '280px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          animation: 'fadeInUp 0.2s ease',
          zIndex: 100, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '1rem 1.25rem',
            background: 'linear-gradient(135deg,rgba(6,182,212,0.1),rgba(139,92,246,0.1))',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Wallet Avatar */}
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', flexShrink: 0,
              }}>🦊</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Connected Wallet</div>
                <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {account}
                </div>
              </div>
            </div>

            {/* Balance */}
            <div style={{
              marginTop: '0.875rem',
              padding: '0.625rem 0.875rem',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '10px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Balance</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#06b6d4', fontFamily: 'monospace' }}>
                {displayBalance} ETH
              </span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: '0.5rem' }}>
            {/* Copy Address */}
            <button onClick={copyAddress}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: '10px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500,
                transition: 'background 0.15s', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: '1.1rem' }}>{copied ? '✅' : '📋'}</span>
              <span>{copied ? 'Address Copied!' : 'Copy Address'}</span>
            </button>

            {/* Switch Wallet */}
            <button onClick={switchWallet}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: '10px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500,
                transition: 'background 0.15s', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: '1.1rem' }}>🔄</span>
              <span>Switch Wallet</span>
            </button>

            {/* View on Explorer */}
            <a href={`https://sepolia.etherscan.io/address/${account}`} target="_blank" rel="noreferrer"
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: '10px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500,
                transition: 'background 0.15s', textDecoration: 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: '1.1rem' }}>🔍</span>
              <span>View on Etherscan</span>
            </a>

            <div style={{ height: '1px', background: 'var(--border)', margin: '0.375rem 0.5rem' }} />

            {/* Disconnect */}
            <button onClick={() => { disconnect(); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: '10px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: '#f87171', fontSize: '0.85rem', fontWeight: 600,
                transition: 'background 0.15s', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: '1.1rem' }}>🔌</span>
              <span>Disconnect Wallet</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
