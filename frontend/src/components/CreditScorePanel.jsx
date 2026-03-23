import React from 'react';

const TIERS = [
  { min: 800, max: 850, label: '🏆 Excellent', color: '#06b6d4', maxLoan: '10 ETH', rate: '1–5%',  desc: 'Best terms available' },
  { min: 700, max: 799, label: '💎 Very Good', color: '#22c55e', maxLoan: '5 ETH',  rate: '3–7%',  desc: 'Premium borrower' },
  { min: 600, max: 699, label: '🟢 Good',      color: '#84cc16', maxLoan: '2 ETH',  rate: '5–10%', desc: 'Standard terms' },
  { min: 500, max: 599, label: '🟡 Fair',      color: '#f59e0b', maxLoan: '0.5 ETH',rate: '10–15%',desc: 'Limited access' },
  { min: 300, max: 499, label: '🔴 High Risk', color: '#ef4444', maxLoan: '0.1 ETH',rate: '15–20%',desc: 'Restricted borrowing' },
];

function getTier(score) {
  return TIERS.find(t => score >= t.min && score <= t.max) || TIERS[4];
}

function getScorePercent(score) {
  return Math.round(((score - 300) / 550) * 100);
}

export default function CreditScorePanel({ score = 650, compact = false }) {
  const tier = getTier(score);
  const pct = getScorePercent(score);

  if (compact) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
        background: `${tier.color}15`, border: `1px solid ${tier.color}30`,
        borderRadius: '10px', padding: '0.375rem 0.75rem',
      }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: tier.color, fontSize: '1rem' }}>{score}</span>
        <span style={{ fontSize: '0.75rem', color: tier.color, fontWeight: 600 }}>{tier.label}</span>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
      borderRadius: '16px', padding: '1.5rem',
    }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
        📊 Credit Score & Loan Eligibility
      </h3>

      {/* Score Display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0,
          background: `conic-gradient(${tier.color} ${pct * 3.6}deg, rgba(255,255,255,0.07) 0deg)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'var(--bg-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column',
          }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.1rem', color: tier.color, lineHeight: 1 }}>{score}</span>
            <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>/ 850</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: tier.color, marginBottom: '0.25rem' }}>{tier.label}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{tier.desc}</div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
            <span>Max Loan: <strong style={{ color: 'var(--text-primary)' }}>{tier.maxLoan}</strong></span>
            <span>Rate: <strong style={{ color: '#06b6d4' }}>{tier.rate}</strong></span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px', overflow: 'visible', position: 'relative' }}>
          {/* Tier markers */}
          {[500, 600, 700, 800].map(mark => (
            <div key={mark} style={{
              position: 'absolute', left: `${getScorePercent(mark)}%`,
              top: '-3px', width: '2px', height: '14px',
              background: 'rgba(255,255,255,0.15)', borderRadius: '1px',
            }} />
          ))}
          <div style={{
            height: '100%', borderRadius: '4px', width: `${pct}%`,
            background: `linear-gradient(90deg, #ef4444, #f59e0b, #84cc16, #22c55e, #06b6d4)`,
            transition: 'width 0.8s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.375rem' }}>
          <span>300</span><span>500</span><span>600</span><span>700</span><span>800</span><span>850</span>
        </div>
      </div>

      {/* All Tiers Table */}
      <div style={{ fontSize: '0.8rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          ALL TIERS
        </div>
        {TIERS.map(t => (
          <div key={t.min}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: '0.5rem', padding: '0.5rem 0.625rem', borderRadius: '8px', marginBottom: '0.25rem',
              background: score >= t.min && score <= t.max ? `${t.color}12` : 'transparent',
              border: score >= t.min && score <= t.max ? `1px solid ${t.color}25` : '1px solid transparent',
            }}>
            <span style={{ color: t.color, fontWeight: 600 }}>{t.label}</span>
            <span style={{ color: 'var(--text-secondary)' }}>{t.min}–{t.max}</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{t.maxLoan}</span>
            <span style={{ color: '#06b6d4' }}>{t.rate}</span>
          </div>
        ))}
      </div>

      {/* How to improve */}
      {score < 750 && (
        <div style={{
          marginTop: '1.25rem', padding: '0.875rem',
          background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)',
          borderRadius: '10px', fontSize: '0.8rem',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>💡 How to improve your score:</div>
          <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span>✓ Repay loans on time → <strong style={{ color: '#22c55e' }}>+50 points</strong></span>
            <span>✓ Complete KYC verification → <strong style={{ color: '#22c55e' }}>+25 points</strong></span>
            <span>✗ Late/no repayment → <strong style={{ color: '#ef4444' }}>−100 points</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
