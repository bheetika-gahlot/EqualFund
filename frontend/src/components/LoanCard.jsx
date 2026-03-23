import React from 'react';
import { Link } from 'react-router-dom';

const CATEGORY_CONFIG = {
  education: { icon: '🎓', color: '#06b6d4', label: 'Education' },
  medical:   { icon: '🏥', color: '#f43f5e', label: 'Medical' },
  business:  { icon: '💼', color: '#f59e0b', label: 'Business' },
  emergency: { icon: '🚨', color: '#ef4444', label: 'Emergency' },
  housing:   { icon: '🏠', color: '#8b5cf6', label: 'Housing' },
  other:     { icon: '📌', color: '#6b7280', label: 'Other' },
};

const STATUS_CONFIG = {
  0: { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  1: { label: 'Active',    color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
  2: { label: 'Repaid',    color: '#06b6d4', bg: 'rgba(6,182,212,0.1)'   },
  3: { label: 'Defaulted', color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
};

export default function LoanCard({ loan, onFund, onRepay, isOwner }) {
  const status = STATUS_CONFIG[loan.status] || STATUS_CONFIG[0];
  const category = loan.category || 'other';
  const cat = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;

  const fundingPercent = loan.fundedAmount && loan.amount
    ? Math.min(100, Math.round((parseFloat(loan.fundedAmount) / parseFloat(loan.amount)) * 100))
    : 0;

  const formatAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';

  return (
    <div className="glass-card"
      style={{ padding: '1.5rem', transition: 'transform 0.2s, box-shadow 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}>

      {/* Top Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: '8px',
          background: `${cat.color}18`, color: cat.color, border: `1px solid ${cat.color}30`,
        }}>
          {cat.icon} {cat.label}
        </span>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: '8px',
          background: status.bg, color: status.color,
        }}>
          {status.label}
        </span>
      </div>

      {/* Purpose snippet */}
      {loan.purpose && (
        <p style={{
          fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6,
          marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
          borderLeft: `3px solid ${cat.color}`, paddingLeft: '0.75rem',
        }}>
          "{loan.purpose}"
        </p>
      )}

      {/* Amount + Interest */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Loan Amount</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#06b6d4', fontFamily: 'monospace', lineHeight: 1 }}>
            {loan.amount} <span style={{ fontSize: '1rem' }}>ETH</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Interest</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#8b5cf6' }}>{loan.interestRate}%</div>
        </div>
      </div>

      {/* Funding Progress */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
          <span>Funded: {loan.fundedAmount || '0'} ETH</span>
          <span style={{ fontWeight: 700, color: fundingPercent >= 100 ? '#22c55e' : 'var(--text-secondary)' }}>
            {fundingPercent}%
          </span>
        </div>
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '3px', width: `${fundingPercent}%`,
            background: fundingPercent >= 100
              ? 'linear-gradient(90deg,#22c55e,#16a34a)'
              : `linear-gradient(90deg,${cat.color},#8b5cf6)`,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
        <span>⏱ {loan.duration}d</span>
        <span>👤 {formatAddress(loan.borrower)}</span>
        {loan.kycVerified && <span style={{ color: '#22c55e' }}>✓ KYC</span>}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.625rem' }}>
        <Link to={`/loan/${loan.id}`}
          style={{
            flex: 1, textAlign: 'center', padding: '0.625rem', borderRadius: '10px',
            fontSize: '0.82rem', fontWeight: 600, border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)',
            textDecoration: 'none', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#06b6d4'; e.currentTarget.style.color = '#06b6d4'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
          👁 View Details
        </Link>

        {loan.status === 0 && !isOwner && onFund && (
          <button onClick={() => onFund(loan)}
            style={{
              flex: 1, padding: '0.625rem', borderRadius: '10px',
              background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)',
              border: 'none', color: 'white', fontSize: '0.82rem',
              fontWeight: 700, cursor: 'pointer',
            }}>
            💰 Fund Loan
          </button>
        )}

        {loan.status === 1 && isOwner && onRepay && (
          <button onClick={() => onRepay(loan)}
            style={{
              flex: 1, padding: '0.625rem', borderRadius: '10px',
              background: 'linear-gradient(135deg,#22c55e,#16a34a)',
              border: 'none', color: 'white', fontSize: '0.82rem',
              fontWeight: 700, cursor: 'pointer',
            }}>
            💸 Repay
          </button>
        )}
      </div>
    </div>
  );
}
