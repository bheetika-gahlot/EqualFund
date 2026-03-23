import React from 'react';

export default function CreditScoreBadge({ score }) {
  const getConfig = (s) => {
    if (s >= 750) return { label: 'Excellent', color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', bar: 'linear-gradient(90deg,#10b981,#34d399)', emoji: '🏆' };
    if (s >= 700) return { label: 'Good', color: '#22d3ee', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)', bar: 'linear-gradient(90deg,#06b6d4,#22d3ee)', emoji: '✨' };
    if (s >= 650) return { label: 'Fair', color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', bar: 'linear-gradient(90deg,#f59e0b,#fbbf24)', emoji: '👍' };
    if (s >= 600) return { label: 'Poor', color: '#fb923c', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', bar: 'linear-gradient(90deg,#f97316,#fb923c)', emoji: '⚠️' };
    return { label: 'Very Poor', color: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', bar: 'linear-gradient(90deg,#ef4444,#f87171)', emoji: '🔴' };
  };

  const config = getConfig(score);
  const percent = ((score - 300) / (850 - 300)) * 100;

  return (
    <div style={{
      background: config.bg,
      border: `1px solid ${config.border}`,
      borderRadius:'16px', padding:'1.25rem',
      transition:'all 0.3s ease',
    }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
        <div>
          <div style={{fontSize:'0.72rem', color:'var(--text-secondary)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.25rem'}}>
            Credit Score
          </div>
          <div style={{display:'flex', alignItems:'baseline', gap:'0.5rem'}}>
            <span style={{fontSize:'2.5rem', fontWeight:800, color:config.color, lineHeight:1}}>{score}</span>
            <span style={{fontSize:'0.75rem', color:'var(--text-secondary)'}}> / 850</span>
          </div>
        </div>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'2rem', marginBottom:'0.25rem'}}>{config.emoji}</div>
          <div style={{
            padding:'0.25rem 0.75rem', borderRadius:'99px', fontSize:'0.72rem', fontWeight:700,
            background:config.bg, color:config.color, border:`1px solid ${config.border}`,
          }}>{config.label}</div>
        </div>
      </div>

      <div style={{marginBottom:'0.5rem'}}>
        <div style={{height:'8px', background:'rgba(255,255,255,0.06)', borderRadius:'99px', overflow:'hidden'}}>
          <div style={{
            height:'100%', width:`${percent}%`,
            background: config.bar,
            borderRadius:'99px',
            transition:'width 0.8s cubic-bezier(0.4,0,0.2,1)',
            boxShadow:`0 0 10px ${config.color}40`,
          }} />
        </div>
        <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.68rem', color:'var(--text-secondary)', marginTop:'0.375rem'}}>
          <span>300 — Very Poor</span>
          <span>850 — Excellent</span>
        </div>
      </div>

      <div style={{fontSize:'0.72rem', color:'var(--text-secondary)', marginTop:'0.5rem', padding:'0.5rem 0.75rem', background:'rgba(255,255,255,0.03)', borderRadius:'8px'}}>
        💡 Repay loans on time to increase your score. +50 pts per completed loan.
      </div>
    </div>
  );
}