// Collateral.jsx — ETH collateral deposit for secured loans
// Best collateral for EqualFund = ETH (same chain, instant liquidation)
import React, { useState } from 'react';
import { useWallet } from '../hooks/useWallet';

export const COLLATERAL_TYPES = [
  {
    id: 'eth',
    icon: '⟠',
    label: 'ETH Collateral',
    desc: 'Lock ETH as collateral. Auto-liquidated if loan defaults.',
    ratio: '150%',
    recommended: true,
  },
  {
    id: 'none',
    icon: '📋',
    label: 'Unsecured (KYC Only)',
    desc: 'No collateral. KYC + credit score required. Higher interest.',
    ratio: 'N/A',
    recommended: false,
  },
];

// ── Collateral Selector (in CreateLoan form) ─────────────
export function CollateralSelector({ value, onChange, loanAmount }) {
  const collateralRequired = loanAmount ? (parseFloat(loanAmount) * 1.5).toFixed(4) : '—';

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <label className="lbl">Collateral Type</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
        {COLLATERAL_TYPES.map(c => (
          <button key={c.id} onClick={() => onChange(c.id)}
            style={{
              padding: '1rem', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
              border: value === c.id ? '2px solid var(--mint)' : '1px solid var(--border)',
              background: value === c.id ? 'var(--mint-pale)' : 'var(--surface-3)',
              transition: 'all 0.2s', position: 'relative',
            }}>
            {c.recommended && (
              <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '10px', fontWeight: 800, color: 'var(--mint-dim)', background: 'rgba(0,232,122,0.12)', padding: '2px 6px', borderRadius: '99px' }}>
                RECOMMENDED
              </span>
            )}
            <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{c.icon}</div>
            <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '13px', marginBottom: '4px' }}>{c.label}</div>
            <div style={{ fontSize: '12px', color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: '6px' }}>{c.desc}</div>
            {c.id === 'eth' && loanAmount && (
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--mint-dim)' }}>
                Required: {collateralRequired} ETH (150%)
              </div>
            )}
          </button>
        ))}
      </div>

      {value === 'eth' && loanAmount && (
        <div style={{ marginTop: '10px', padding: '12px 14px', background: 'rgba(0,232,122,0.06)', border: '1px solid rgba(0,232,122,0.15)', borderRadius: '10px', fontSize: '13px' }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>✅ Secured Loan Benefits</div>
          <div style={{ color: 'var(--ink-3)', lineHeight: 1.6 }}>
            • Lower interest rates (lenders prefer secured)<br />
            • Higher funding success rate<br />
            • Collateral locked until loan repaid or liquidated<br />
            • <strong style={{ color: 'var(--mint-dim)' }}>You must deposit {collateralRequired} ETH alongside your loan request</strong>
          </div>
        </div>
      )}

      {value === 'none' && (
        <div style={{ marginTop: '10px', padding: '12px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '10px', fontSize: '13px' }}>
          <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>⚠️ Unsecured Loan Risks</div>
          <div style={{ color: 'var(--ink-3)', lineHeight: 1.6 }}>
            • Requires verified KYC + credit score ≥ 600<br />
            • Lenders may prefer secured loans<br />
            • Default will severely impact credit score<br />
            • Account may be restricted from future loans
          </div>
        </div>
      )}
    </div>
  );
}

// ── Collateral Info Display (on loan cards) ──────────────
export function CollateralBadge({ collateralType, collateralAmount }) {
  if (!collateralType || collateralType === 'none') {
    return <span className="pill pill-gray">Unsecured</span>;
  }
  return (
    <span className="pill pill-mint">
      ⟠ {parseFloat(collateralAmount || 0).toFixed(3)} ETH Collateral
    </span>
  );
}

// ── Collateral Status Panel ───────────────────────────────
export function CollateralPanel({ loan }) {
  if (!loan.collateralType || loan.collateralType === 'none') return null;

  const isLocked      = loan.status === 1 || loan.status === 0;
  const isReleased    = loan.status === 2;
  const isLiquidated  = loan.status === 3;

  return (
    <div style={{ padding: '1rem', background: isLocked ? 'rgba(0,232,122,0.05)' : isReleased ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${isLocked ? 'rgba(0,232,122,0.15)' : isReleased ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`, borderRadius: '10px' }}>
      <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '13px', marginBottom: '8px' }}>
        ⟠ Collateral Status
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
        <span style={{ color: 'var(--ink-3)' }}>Amount Locked</span>
        <span style={{ fontWeight: 800, color: 'var(--ink)', fontFamily: 'monospace' }}>{parseFloat(loan.collateralAmount || 0).toFixed(4)} ETH</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '4px' }}>
        <span style={{ color: 'var(--ink-3)' }}>Status</span>
        <span style={{ fontWeight: 700, color: isLocked ? 'var(--mint-dim)' : isReleased ? '#22c55e' : '#ef4444' }}>
          {isLocked ? '🔒 Locked' : isReleased ? '✅ Released' : '⚡ Liquidated'}
        </span>
      </div>
      {isLocked && (
        <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '8px', lineHeight: 1.5 }}>
          Collateral will be returned when loan is fully repaid.
          In case of default, it will be distributed to lenders.
        </div>
      )}
    </div>
  );
}
