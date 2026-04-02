import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import GeoBg from '../components/GeoBg';

const TECH = ['Ethereum','Solidity','IPFS','MetaMask','Hardhat','OpenZeppelin','Pinata','Ethers.js','MongoDB','Razorpay','Vercel','Web3'];
const LOANS = [
  { t:'Education Loan', a:'0.50 ETH', r:'5%', s:'Repaid', by:'Priya S.' },
  { t:'MSME Capital', a:'2.00 ETH', r:'8%', s:'Active', by:'Raj Enterprises' },
  { t:'Medical Fund', a:'0.30 ETH', r:'3%', s:'Repaid', by:'Anita P.' },
  { t:'Housing Loan', a:'5.00 ETH', r:'7%', s:'Active', by:'Sharma Family' },
  { t:'Startup Seed', a:'1.00 ETH', r:'10%', s:'Repaid', by:'TechFlow Inc.' },
  { t:'Emergency Fund', a:'0.10 ETH', r:'2%', s:'Repaid', by:'Ravi K.' },
];
const FEATURES = [
  { icon:'🧠', h:'AI Credit Scoring', p:'On-chain algorithm analyses repayment history, wallet age and KYC. Score 300–850, fully transparent.' },
  { icon:'⛓️', h:'Smart Contract Escrow', p:'Funds locked in audited contracts. No human — not even us — can touch your money.' },
  { icon:'🌍', h:'IPFS KYC Storage', p:'Documents on the InterPlanetary File System. Cryptographically permanent. No server to hack.' },
  { icon:'👥', h:'Multi-Lender Pooling', p:'Multiple lenders co-fund one loan. Contract auto-splits repayment proportionally.' },
  { icon:'🛡️', h:'Investor Protection', p:'2% protection pool per loan. Partial refund if a borrower defaults. Capital stays safer.' },
  { icon:'💱', h:'ETH → INR Converter', p:'Live multi-currency conversion — INR, USD, EUR, GBP. Anyone can understand amounts.' },
];
const TESTIMONIALS = [
  { name:'Priya Sharma', role:'Borrower · Mumbai', r:5, t:'Funded in 48 hours. No paperwork, no collateral. My credit score went from 650 to 720 after repayment.', a:'P' },
  { name:'Rahul Mehta', role:'Lender · Bangalore', r:5, t:'8% returns on idle ETH. Smart contract handles everything. Invested in 12 loans so far.', a:'R' },
  { name:'Anita Patel', role:'MSME Owner · Gujarat', r:4, t:'Business loan funded by 3 global lenders. Blockchain proof of funding is great for my records.', a:'A' },
];

export default function Home() {
  const [visible, setVisible] = useState(new Set());
  const refs = useRef({});

  useEffect(() => {
    const io = new IntersectionObserver(
      es => es.forEach(e => {
        if (e.isIntersecting) setVisible(p => new Set([...p, e.target.dataset.sec]));
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('[data-sec]').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const vis = id => visible.has(id);

  return (
    <div className="page" style={{ position:'relative' }}>
      <GeoBg />

      {/* ── HERO ──────────────────────────────────────────── */}
      <section style={{ minHeight:'100vh', display:'flex', alignItems:'center', padding:'6rem 1.5rem 4rem', position:'relative' }}>
        <div className="container">

          {/* Live badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'5px 14px', borderRadius:'99px', background:'rgba(0,232,122,0.08)', border:'1px solid rgba(0,232,122,0.2)', marginBottom:'2rem', animation:'fadeUp 0.6s ease both' }}>
            <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:'var(--mint)', animation:'pulse-dot 2s infinite' }} />
            <span style={{ fontSize:'12px', color:'var(--mint-dim)', fontWeight:700, letterSpacing:'0.04em' }}>LIVE ON ETHEREUM SEPOLIA</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize:'clamp(2.6rem,7vw,5.5rem)', fontWeight:900, lineHeight:1.0, letterSpacing:'-0.05em', marginBottom:'1.5rem', animation:'fadeUp 0.7s ease 0.1s both' }}>
            Decentralized<br />
            <span style={{ color:'var(--mint-dim)' }}>P2P Lending.</span><br />
            For Everyone.
          </h1>

          <p style={{ fontSize:'clamp(1rem,1.4vw,1.15rem)', color:'var(--ink-3)', maxWidth:'500px', lineHeight:1.75, marginBottom:'2.5rem', animation:'fadeUp 0.7s ease 0.2s both' }}>
            EqualFund connects borrowers and lenders through Ethereum smart contracts. No banks. No middlemen. <strong style={{ color:'var(--ink)' }}>0.5% fee</strong> vs 18–36% from traditional banks.
          </p>

          <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', marginBottom:'4rem', animation:'fadeUp 0.7s ease 0.3s both' }}>
            <Link to="/create-loan" className="btn btn-dark" style={{ fontSize:'15px', padding:'1rem 2.25rem' }}>
              Apply for a Loan →
            </Link>
            <Link to="/marketplace" className="btn btn-out" style={{ fontSize:'15px', padding:'1rem 2.25rem' }}>
              Browse Marketplace ↗
            </Link>
          </div>

          {/* Stats */}
          <div className="grid-border reveal" data-sec="hero" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', maxWidth:'680px', animation:'fadeUp 0.7s ease 0.4s both', opacity:1 }}>
            {[
              { v:'₹2.4Cr+', l:'Total Funded',    m:true  },
              { v:'1,240+',  l:'Active Users',     m:false },
              { v:'98.2%',   l:'Repayment Rate',   m:false },
              { v:'0.5%',    l:'Platform Fee',     m:false },
            ].map((s, i) => (
              <div key={i} className="grid-cell stat-card">
                <div className={`stat-val${s.m ? ' mint' : ''}`}>{s.v}</div>
                <div className="stat-lbl">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* ── WORK MARQUEE ──────────────────────────────────── */}
      <div style={{ padding:'2rem 0', overflow:'hidden' }}>
        <div className="container-wide" style={{ marginBottom:'1rem', display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontSize:'11px', fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.12em' }}>Live Loan Activity</span>
          <Link to="/marketplace" style={{ fontSize:'12px', color:'var(--ink-3)', fontWeight:600 }}>View all →</Link>
        </div>
        <div className="marquee-track marquee-track-slow" style={{ display:'flex', gap:'1rem', padding:'0 1.5rem' }}>
          {[...LOANS,...LOANS,...LOANS].map((loan, i) => (
            <div key={i} style={{ minWidth:'195px', flexShrink:0, background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'14px', padding:'1.25rem' }}>
              <span className={`pill ${loan.s==='Repaid'?'pill-mint':'pill-amber'}`} style={{ marginBottom:'12px', display:'inline-flex' }}>
                {loan.s === 'Repaid' ? '✅' : '⚡'} {loan.s}
              </span>
              <div style={{ fontSize:'13px', fontWeight:700, color:'var(--ink)', marginBottom:'3px' }}>{loan.t}</div>
              <div style={{ fontSize:'1.15rem', fontWeight:900, color:'var(--ink)', letterSpacing:'-0.03em', marginBottom:'3px' }}>{loan.a}</div>
              <div style={{ fontSize:'11px', color:'var(--ink-3)' }}>{loan.r} APR · {loan.by}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section data-sec="how" style={{ padding:'5rem 1.5rem' }}>
        <div className="container">
          <div style={{ opacity:vis('how')?1:0, transform:vis('how')?'none':'translateY(20px)', transition:'all 0.6s ease', marginBottom:'3rem' }}>
            <div className="sec-label">Simple Process</div>
            <h2 className="sec-title">From Application<br/>to Funded in Hours.</h2>
          </div>
          <div className="grid-border" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(230px, 1fr))' }}>
            {[
              { n:'01', icon:'🪪', h:'KYC Verification', p:'Upload your ID. Stored permanently on IPFS — tamper-proof, decentralised forever.' },
              { n:'02', icon:'📝', h:'Create Loan Request', p:'Set amount, rate and purpose. AI credit score sets your eligibility instantly.' },
              { n:'03', icon:'💰', h:'Get Funded', p:'Global lenders fund via smart contract. Auto-releases when 100% funded.' },
              { n:'04', icon:'✅', h:'Repay & Grow', p:'Repay on time. Smart contract auto-splits principal + interest to all lenders.' },
            ].map((item, i) => (
              <div key={i} className="grid-cell" style={{
                padding:'2rem', position:'relative', overflow:'hidden',
                opacity:vis('how')?1:0, transform:vis('how')?'none':'translateY(20px)',
                transition:`all 0.55s ease ${i*0.08}s`,
              }}>
                <div style={{ position:'absolute', top:'-4px', right:'14px', fontSize:'4.5rem', fontWeight:900, color:'var(--border)', lineHeight:1, userSelect:'none', fontVariantNumeric:'tabular-nums' }}>{item.n}</div>
                <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'var(--mint-pale)', border:'1px solid rgba(0,232,122,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', marginBottom:'1rem' }}>{item.icon}</div>
                <div style={{ fontSize:'14px', fontWeight:800, color:'var(--ink)', marginBottom:'7px', letterSpacing:'-0.02em' }}>{item.h}</div>
                <div style={{ fontSize:'13px', color:'var(--ink-3)', lineHeight:1.65 }}>{item.p}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section data-sec="features" style={{ padding:'5rem 1.5rem', background:'var(--surface-3)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
        <div className="container">
          <div style={{ opacity:vis('features')?1:0, transform:vis('features')?'none':'translateY(20px)', transition:'all 0.6s ease', marginBottom:'3rem' }}>
            <div className="sec-label">Why EqualFund</div>
            <h2 className="sec-title">Built for Real World.<br/>Secured by Blockchain.</h2>
          </div>
          <div className="grid-border" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))' }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="grid-cell" style={{
                padding:'1.875rem', display:'flex', gap:'1rem',
                opacity:vis('features')?1:0, transform:vis('features')?'none':'translateY(15px)',
                transition:`all 0.55s ease ${i*0.06}s`,
              }}>
                <div style={{ width:'42px', height:'42px', flexShrink:0, borderRadius:'10px', background:'var(--surface-3)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', alignSelf:'flex-start' }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:800, color:'var(--ink)', marginBottom:'5px' }}>{f.h}</div>
                  <div style={{ fontSize:'12.5px', color:'var(--ink-3)', lineHeight:1.65 }}>{f.p}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* ── TESTIMONIALS ──────────────────────────────────── */}
      <section data-sec="testimonials" style={{ padding:'5rem 1.5rem', background:'var(--surface-3)', borderTop:'1px solid var(--border)' }}>
        <div className="container">
          <div style={{ opacity:vis('testimonials')?1:0, transform:vis('testimonials')?'none':'translateY(20px)', transition:'all 0.6s ease', textAlign:'center', marginBottom:'3rem' }}>
            <div className="sec-label">Real Stories</div>
            <h2 className="sec-title">Trusted by Real People</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(290px, 1fr))', gap:'1.25rem' }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card card-hover card-mint" style={{
                padding:'1.875rem',
                opacity:vis('testimonials')?1:0, transform:vis('testimonials')?'none':'translateY(20px)',
                transition:`all 0.55s ease ${i*0.1}s`,
              }}>
                <div style={{ display:'flex', gap:'3px', marginBottom:'1.125rem' }}>
                  {Array(t.r).fill(0).map((_,j) => <span key={j} style={{ color:'var(--mint-dim)', fontSize:'14px' }}>★</span>)}
                </div>
                <p style={{ fontSize:'14px', color:'var(--ink-3)', lineHeight:1.7, marginBottom:'1.25rem', fontStyle:'italic' }}>"{t.t}"</p>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', borderTop:'1px solid var(--border)', paddingTop:'1.125rem' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'9px', background:'var(--mint-pale)', border:'1px solid rgba(0,232,122,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'var(--mint-dim)', fontSize:'14px' }}>{t.a}</div>
                  <div>
                    <div style={{ fontWeight:700, color:'var(--ink)', fontSize:'14px' }}>{t.name}</div>
                    <div style={{ fontSize:'12px', color:'var(--ink-3)' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section style={{ padding:'7rem 1.5rem', textAlign:'center' }}>
        <div className="container" style={{ maxWidth:'600px' }}>
          <h2 style={{ fontSize:'clamp(2rem,5vw,3.75rem)', fontWeight:900, letterSpacing:'-0.05em', color:'var(--ink)', lineHeight:1.0, marginBottom:'1.25rem' }}>
            Access Fair Finance.<br />
            <span style={{ WebkitTextStroke:'2px var(--ink)', color:'transparent' }}>Start Today.</span>
          </h2>
          <p style={{ color:'var(--ink-3)', fontSize:'1rem', marginBottom:'2.25rem', lineHeight:1.7 }}>
            No bank account needed — just a MetaMask wallet and a vision.
          </p>
          {/* FIXED: mint button with explicit black text */}
          <div style={{ display:'flex', gap:'1rem', justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/login" className="btn btn-mint" style={{ fontSize:'15px', padding:'1rem 2.5rem', color:'#000000' }}>
              Get Started Free →
            </Link>
            <a href="https://sepolia.etherscan.io/address/0xa6b4Eb5a8e1C01C16de6E32BADec9c2c9BCa117C"
              target="_blank" rel="noreferrer"
              className="btn btn-out" style={{ fontSize:'15px', padding:'1rem 2.5rem' }}>
              View Contract ↗
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid var(--border)', padding:'2.5rem 1.5rem', background:'var(--surface-3)' }}>
        <div className="container-wide" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1.5rem' }}>
          <div style={{ fontWeight:900, fontSize:'15px', color:'var(--ink)', letterSpacing:'-0.02em' }}>EqualFund</div>
          <div style={{ fontSize:'12px', color:'var(--ink-3)' }}>© 2025 EqualFund · Decentralised P2P Lending · Ethereum</div>
          <div style={{ display:'flex', gap:'2rem' }}>
            {[['Contract','https://sepolia.etherscan.io/address/0xa6b4Eb5a8e1C01C16de6E32BADec9c2c9BCa117C',true],[' Marketplace','/marketplace',false],['KYC','/kyc',false]].map(([l,h,ext]) =>
              ext
                ? <a key={l} href={h} target="_blank" rel="noreferrer" style={{ fontSize:'12px', color:'var(--ink-3)' }}>{l}</a>
                : <Link key={l} to={h} style={{ fontSize:'12px', color:'var(--ink-3)' }}>{l}</Link>
            )}
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.8)} }
      `}</style>
    </div>
  );
}
