// FraudDetection.jsx — Fraud risk display + actions
import React, { useState, useEffect } from 'react';
import api from '../services/apiService';

// ── Risk Level Badge ─────────────────────────────────────
export function RiskBadge({ riskLevel, fraudFlags = [] }) {
  if (!riskLevel || riskLevel === 'low') return null;

  const config = {
    high:   { label: '🚨 High Risk',   bg: 'rgba(239,68,68,0.1)',  color: '#ef4444', border: 'rgba(239,68,68,0.3)'  },
    medium: { label: '⚠️ Medium Risk', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  };
  const c = config[riskLevel];

  return (
    <div style={{ padding: '10px 14px', borderRadius: '10px', background: c.bg, border: `1px solid ${c.border}`, marginBottom: '12px' }}>
      <div style={{ fontWeight: 800, color: c.color, fontSize: '13px', marginBottom: '6px' }}>{c.label}</div>
      {fraudFlags.map((f, i) => (
        <div key={i} style={{ fontSize: '12px', color: c.color, opacity: 0.85, marginBottom: '3px' }}>
          • {FLAG_MESSAGES[f.type] || f.type}
          {f.count ? ` (${f.count}x)` : ''}
        </div>
      ))}
    </div>
  );
}

const FLAG_MESSAGES = {
  new_account:       'Account created less than 3 days ago',
  low_score:         'Credit score below 400',
  previous_defaults: 'Has defaulted on previous loans',
  multiple_kyc:      'Multiple KYC submission attempts',
  suspicious_amount: 'Loan amount exceeds credit limit',
  no_repayment:      'No successful repayments on record',
};

// ── Fraud History Panel ──────────────────────────────────
export function FraudHistoryPanel({ borrowerAddress, loans = [] }) {
  const defaults    = loans.filter(l => l.status === 3);
  const completed   = loans.filter(l => l.status === 2);
  const repayRate   = loans.length > 0 ? Math.round((completed.length / loans.length) * 100) : 0;

  if (loans.length === 0) return null;

  return (
    <div style={{ padding: '1rem', background: 'var(--surface-3)', borderRadius: '12px', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
        📊 Borrower Track Record
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
        {[
          { l: 'Total Loans',  v: loans.length,        c: 'var(--ink)'      },
          { l: 'Repaid',       v: completed.length,     c: 'var(--mint-dim)' },
          { l: 'Defaults',     v: defaults.length,      c: defaults.length > 0 ? '#ef4444' : 'var(--mint-dim)' },
        ].map(s => (
          <div key={s.l} style={{ textAlign: 'center', padding: '8px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 900, color: s.c, fontSize: '1.1rem' }}>{s.v}</div>
            <div style={{ fontSize: '10px', color: 'var(--ink-3)', marginTop: '2px' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Repayment rate bar */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink-3)', marginBottom: '4px' }}>
          <span>Repayment Rate</span>
          <span style={{ fontWeight: 700, color: repayRate >= 80 ? 'var(--mint-dim)' : repayRate >= 50 ? '#f59e0b' : '#ef4444' }}>{repayRate}%</span>
        </div>
        <div style={{ height: '5px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${repayRate}%`, background: repayRate >= 80 ? 'var(--mint)' : repayRate >= 50 ? '#f59e0b' : '#ef4444', borderRadius: '99px', transition: 'width 0.8s ease' }} />
        </div>
      </div>

      {/* Default warning */}
      {defaults.length > 0 && (
        <div style={{ padding: '8px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>
          ⚠️ This borrower has {defaults.length} defaulted loan{defaults.length > 1 ? 's' : ''} on record
        </div>
      )}
    </div>
  );
}

// ── Default Actions (for admin / smart contract) ─────────
export function DefaultActions({ loan, onAction }) {
  const [acting, setActing] = useState(false);

  const now      = new Date();
  const dueDate  = loan.fundedAt ? new Date(new Date(loan.fundedAt).getTime() + loan.duration * 86400000) : null;
  const isOverdue = dueDate && now > dueDate && loan.status === 1;
  const daysOverdue = dueDate ? Math.floor((now - dueDate) / 86400000) : 0;

  if (!isOverdue) return null;

  return (
    <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px' }}>
      <div style={{ fontWeight: 800, color: '#ef4444', fontSize: '13px', marginBottom: '8px' }}>
        🚨 Loan Overdue by {daysOverdue} day{daysOverdue > 1 ? 's' : ''}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--ink-3)', marginBottom: '12px', lineHeight: 1.6 }}>
        Automatic actions have been triggered:
        <br />• Credit score has been reduced by {Math.min(daysOverdue * 10, 100)} points
        <br />• Borrower has been notified {Math.min(daysOverdue, 7)} times
        <br />• Account flagged as high-risk for future lenders
      </div>
      {daysOverdue >= 7 && (
        <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700 }}>
          ⛔ Account restricted from creating new loans until debt is settled
        </div>
      )}
    </div>
  );
}

// ── Fraud Warning on Marketplace Card ───────────────────
export function FraudWarningBadge({ riskLevel }) {
  if (!riskLevel || riskLevel === 'low') return null;
  return (
    <span style={{
      fontSize: '10px', fontWeight: 800, padding: '2px 7px',
      borderRadius: '99px',
      background: riskLevel === 'high' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
      color:       riskLevel === 'high' ? '#ef4444' : '#f59e0b',
      border: `1px solid ${riskLevel === 'high' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
    }}>
      {riskLevel === 'high' ? '🚨 HIGH RISK' : '⚠️ CAUTION'}
    </span>
  );
}
