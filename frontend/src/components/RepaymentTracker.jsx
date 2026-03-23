import React, { useState, useEffect } from 'react';

function getDaysRemaining(fundedAt, durationDays) {
  if (!fundedAt) return durationDays;
  const due = new Date(fundedAt);
  due.setDate(due.getDate() + durationDays);
  const now = new Date();
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function getUrgencyColor(daysLeft) {
  if (daysLeft <= 0) return '#ef4444';
  if (daysLeft <= 2) return '#ef4444';
  if (daysLeft <= 5) return '#f59e0b';
  return '#22c55e';
}

export default function RepaymentTracker({ loan, investments = [], onRepay }) {
  const [timeLeft, setTimeLeft] = useState('');

  const daysLeft = getDaysRemaining(loan.fundedAt, loan.duration);
  const urgencyColor = getUrgencyColor(daysLeft);
  const isOverdue = daysLeft <= 0;
  const isUrgent = daysLeft <= 3 && daysLeft > 0;

  // Live countdown timer
  useEffect(() => {
    if (!loan.fundedAt) return;
    const tick = () => {
      const due = new Date(loan.fundedAt);
      due.setDate(due.getDate() + loan.duration);
      const now = new Date();
      const diff = due - now;
      if (diff <= 0) { setTimeLeft('OVERDUE'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${d}d ${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [loan.fundedAt, loan.duration]);

  const totalRepayment = parseFloat(loan.amount) * (1 + parseFloat(loan.interestRate) / 100);
  const platformFee = totalRepayment * 0.005;
  const netRepayment = totalRepayment - platformFee;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Countdown */}
      <div style={{
        background: `${urgencyColor}10`,
        border: `1px solid ${urgencyColor}30`,
        borderRadius: '16px', padding: '1.5rem', textAlign: 'center',
      }}>
        {isOverdue ? (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚨</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ef4444', marginBottom: '0.5rem' }}>OVERDUE</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Your loan is past due. Please repay immediately to avoid default and credit score penalty.
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              {isUrgent ? '🚨 URGENT — Repayment Due Soon' : '⏰ Time Until Repayment Due'}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: urgencyColor, fontFamily: 'monospace', marginBottom: '0.25rem' }}>
              {timeLeft || `${daysLeft} days`}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {loan.duration - daysLeft} of {loan.duration} days elapsed
            </div>

            {/* Progress bar */}
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', marginTop: '0.875rem', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '3px',
                width: `${Math.min(100, ((loan.duration - daysLeft) / loan.duration) * 100)}%`,
                background: urgencyColor, transition: 'width 0.5s ease',
              }} />
            </div>
          </>
        )}
      </div>

      {/* Repayment Breakdown */}
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '1.5rem',
      }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          💰 Repayment Breakdown
        </h3>
        {[
          ['Principal', `${loan.amount} ETH`, 'var(--text-primary)'],
          [`Interest (${loan.interestRate}%)`, `${(parseFloat(loan.amount) * parseFloat(loan.interestRate) / 100).toFixed(4)} ETH`, '#8b5cf6'],
          ['Platform Fee (0.5%)', `${platformFee.toFixed(4)} ETH`, '#f59e0b'],
        ].map(([label, val, color]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ color, fontWeight: 600, fontFamily: 'monospace' }}>{val}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0 0', fontSize: '1rem' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total to Repay</span>
          <span style={{ fontWeight: 900, color: '#06b6d4', fontFamily: 'monospace' }}>{totalRepayment.toFixed(4)} ETH</span>
        </div>
      </div>

      {/* Multi-Lender Split */}
      {investments.length > 0 && (
        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '1.5rem',
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            👥 Lender Repayment Split
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Smart contract automatically distributes repayment proportionally.
          </p>
          {investments.map((inv, i) => {
            const share = (parseFloat(inv.amount) / parseFloat(loan.amount)) * 100;
            const receives = (parseFloat(inv.amount) / parseFloat(loan.amount)) * netRepayment;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                padding: '0.75rem', borderRadius: '10px',
                background: 'rgba(255,255,255,0.02)', marginBottom: '0.5rem',
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                  background: `hsl(${i * 60 + 180},70%,50%)22`,
                  border: `1px solid hsl(${i * 60 + 180},70%,50%)44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, color: `hsl(${i * 60 + 180},70%,60%)`,
                }}>
                  L{i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {inv.lender?.slice(0, 8)}...{inv.lender?.slice(-4)}
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '4px' }}>
                    <div style={{ height: '100%', width: `${share}%`, background: `hsl(${i * 60 + 180},70%,50%)`, borderRadius: '2px' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {receives.toFixed(4)} ETH
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{share.toFixed(1)}% share</div>
                </div>
              </div>
            );
          })}
          <div style={{
            marginTop: '0.75rem', padding: '0.75rem', borderRadius: '10px',
            background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)',
            fontSize: '0.78rem', color: 'var(--text-secondary)',
          }}>
            ✅ When you repay, the smart contract splits funds automatically. No manual action needed from lenders.
          </div>
        </div>
      )}

      {/* Reminder Timeline */}
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '1.5rem',
      }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          🔔 Reminder Schedule
        </h3>
        {[
          { when: `Day 1 onwards`, msg: 'Daily reminder: "X days left to repay"', color: '#22c55e', done: (loan.duration - daysLeft) >= 1 },
          { when: `Day ${Math.max(1, loan.duration - 4)}`, msg: '⚠️ Warning: 3 days remaining', color: '#f59e0b', done: daysLeft <= 4 },
          { when: `Day ${loan.duration - 1}`, msg: '🚨 Final reminder: Repay tomorrow!', color: '#ef4444', done: daysLeft <= 1 },
          { when: `Day ${loan.duration}`, msg: '🔴 Due date — repay now', color: '#ef4444', done: daysLeft <= 0 },
          { when: `Day ${loan.duration + 3}`, msg: '❌ Grace period ends — marked defaulted', color: '#7f1d1d', done: false },
        ].map((r, i) => (
          <div key={i} style={{
            display: 'flex', gap: '0.875rem', padding: '0.625rem 0',
            borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            opacity: r.done ? 0.5 : 1,
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: r.color, marginTop: '5px', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>{r.when}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{r.msg}</div>
            </div>
            {r.done && <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#22c55e', fontWeight: 700, flexShrink: 0 }}>SENT ✓</span>}
          </div>
        ))}
      </div>

      {/* What happens if defaulted */}
      <div style={{
        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: '16px', padding: '1.5rem',
      }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f87171', marginBottom: '0.875rem' }}>
          ⚠️ Consequences of Non-Payment
        </h3>
        {[
          '❌ Credit score -100 points (e.g. 650 → 550)',
          '🚫 Blocked from creating new loan requests',
          '🔴 Wallet flagged as "Defaulter" on all loan cards',
          '📢 All your lenders notified of the default',
          '📉 Future loans restricted to lower amounts & higher rates',
        ].map(item => (
          <div key={item} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '0.3rem 0' }}>{item}</div>
        ))}
      </div>

      {/* Repay Button */}
      {loan.status === 1 && onRepay && (
        <button onClick={onRepay}
          style={{
            width: '100%', padding: '1rem', borderRadius: '14px', border: 'none',
            background: isOverdue
              ? 'linear-gradient(135deg,#ef4444,#dc2626)'
              : 'linear-gradient(135deg,#22c55e,#16a34a)',
            color: 'white', fontWeight: 800, fontSize: '1rem',
            cursor: 'pointer', boxShadow: `0 0 20px ${isOverdue ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
          }}>
          {isOverdue ? '🚨 Repay Now (Overdue)' : `💸 Repay ${totalRepayment.toFixed(4)} ETH`}
        </button>
      )}
    </div>
  );
}
