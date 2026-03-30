import React, { useState, useEffect } from 'react';
import { getPrices, convertETH, CURRENCIES } from '../services/conversionService';

// ── ETH Amount with live currency conversion ──────────────
export default function ETHConverter({ eth, size = 'normal', showDropdown = true }) {
  const [prices,   setPrices]   = useState(null);
  const [currency, setCurrency] = useState('INR');
  const [open,     setOpen]     = useState(false);

  useEffect(() => {
    getPrices().then(setPrices);
  }, []);

  const curr     = CURRENCIES.find(c => c.code === currency);
  const converted = prices ? convertETH(eth, prices, currency) : '...';
  const ethFloat  = parseFloat(eth || 0);

  if (size === 'inline') {
    return (
      <span style={{ fontSize: '0.72rem', color: '#22c55e', marginLeft: '0.5rem' }}>
        ≈ {converted}
      </span>
    );
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {/* ETH Amount */}
        <span style={{
          fontSize: size === 'large' ? '1.5rem' : '1rem',
          fontWeight: 800, color: '#06b6d4', fontFamily: 'monospace'
        }}>
          {ethFloat.toFixed(4)} ETH
        </span>

        {/* Converted Amount */}
        {prices && (
          <span style={{ fontSize: size === 'large' ? '1rem' : '0.8rem', color: '#22c55e', fontWeight: 600 }}>
            ≈ {converted}
          </span>
        )}

        {/* Currency Selector */}
        {showDropdown && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setOpen(!open)}
              style={{
                padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem',
                background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)',
                color: '#06b6d4', cursor: 'pointer', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
              {curr?.flag} {currency} ▼
            </button>

            {open && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, zIndex: 100,
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '0.5rem', minWidth: '180px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              }}>
                {CURRENCIES.map(c => (
                  <button key={c.code}
                    onClick={() => { setCurrency(c.code); setOpen(false); }}
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px',
                      background: currency === c.code ? 'rgba(6,182,212,0.1)' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      color: 'var(--text-primary)', fontSize: '0.8rem',
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                    <span>{c.flag}</span>
                    <span style={{ flex: 1 }}>{c.name}</span>
                    <span style={{ fontFamily: 'monospace', color: '#22c55e', fontSize: '0.72rem' }}>
                      {prices ? convertETH(eth, prices, c.code) : '...'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
