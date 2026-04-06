// UpiPayment.jsx — Fixed: remove "method" config entirely (Razorpay handles it)
import React, { useState, useEffect, useRef } from 'react';

const CURRENCIES = [
  { code:'INR', symbol:'₹',   name:'Indian Rupee',    flag:'🇮🇳', fb:252000 },
  { code:'USD', symbol:'$',   name:'US Dollar',        flag:'🇺🇸', fb:3020   },
  { code:'EUR', symbol:'€',   name:'Euro',             flag:'🇪🇺', fb:2790   },
  { code:'GBP', symbol:'£',   name:'British Pound',    flag:'🇬🇧', fb:2350   },
  { code:'AED', symbol:'د.إ', name:'UAE Dirham',       flag:'🇦🇪', fb:11100  },
  { code:'SGD', symbol:'S$',  name:'Singapore Dollar', flag:'🇸🇬', fb:4060   },
];

let _cache = null, _cacheTime = 0;

async function getPrices() {
  if (_cache && Date.now() - _cacheTime < 300000) return _cache;
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr,usd,eur,gbp,aed,sgd');
    const d = await r.json();
    _cache = d.ethereum; _cacheTime = Date.now();
    return _cache;
  } catch {
    const fb = {};
    CURRENCIES.forEach(c => { fb[c.code.toLowerCase()] = c.fb; });
    return fb;
  }
}

function fmt(n, code) {
  const c = CURRENCIES.find(x => x.code === code);
  return `${c?.symbol}${Math.round(n).toLocaleString('en-IN')}`;
}

function loadRzp() {
  return new Promise((res, rej) => {
    if (window.Razorpay) { res(); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = res;
    s.onerror = () => rej(new Error('Razorpay failed to load'));
    document.head.appendChild(s);
  });
}

// ── UPI Pay Button ────────────────────────────────────────
export function UpiPayButton({ ethAmount, purpose, borrowerName, onSuccess }) {
  const [prices,  setPrices]  = useState(null);
  const [paying,  setPaying]  = useState(false);
  const [showTip, setShowTip] = useState(false);
  const eth = parseFloat(ethAmount || 0);

  useEffect(() => { getPrices().then(setPrices); }, []);

  const inrAmount = prices ? Math.max(100, Math.round(eth * (prices.inr || 252000))) : 0;

  const handlePay = async () => {
    if (!inrAmount || paying) return;
    setPaying(true);
    try {
      await loadRzp();
      // ── FIX: Do NOT pass "method" config at all — Razorpay auto-shows available methods ──
      const options = {
        key:         'rzp_test_1DP5mmOlF5G5ag',
        amount:      inrAmount * 100,
        currency:    'INR',
        name:        'EqualFund',
        description: `P2P Loan · ${eth.toFixed(4)} ETH`,
        image:       'https://equalfund.vercel.app/favicon.ico',
        prefill: {
          name:    borrowerName || 'EqualFund User',
          email:   'demo@equalfund.com',
          contact: '9000000000',
        },
        theme: { color: '#00e87a' },
        // !! NO "method" key — this was causing "No appropriate payment method found"
        notes: {
          eth_amount:   eth + ' ETH',
          loan_purpose: purpose || 'P2P Loan',
        },
        handler: response => {
          setPaying(false);
          onSuccess?.({ paymentId: response.razorpay_payment_id, inrAmount, ethAmount: eth });
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => setPaying(false));
      rzp.open();
    } catch (e) {
      setPaying(false);
      alert('Payment error: ' + e.message);
    }
  };

  if (!inrAmount) return (
    <div style={{ fontSize:'12px', color:'var(--ink-3)', padding:'8px', textAlign:'center' }}>
      Loading INR amount...
    </div>
  );

  return (
    <div>
      <button onClick={handlePay} disabled={paying}
        style={{ width:'100%', padding:'10px 20px', borderRadius:'10px', background: paying ? 'rgba(0,200,100,0.3)' : 'linear-gradient(135deg,#00e87a,#00c965)', color:'#000', fontWeight:800, border:'none', cursor: paying ? 'not-allowed' : 'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center', gap:'7px', transition:'all 0.2s' }}>
        {paying ? '⏳ Opening payment...' : `💳 Pay ₹${inrAmount.toLocaleString('en-IN')} (Demo)`}
      </button>

      <button onClick={() => setShowTip(s => !s)}
        style={{ background:'none', border:'none', fontSize:'11px', color:'var(--ink-3)', cursor:'pointer', marginTop:'5px', width:'100%', textAlign:'center' }}>
        ℹ️ Test credentials {showTip ? '▲' : '▼'}
      </button>

      {showTip && (
        <div style={{ marginTop:'6px', padding:'10px 12px', background:'var(--surface-3)', borderRadius:'10px', border:'1px solid var(--border)', fontSize:'12px', lineHeight:1.9 }}>
          <strong style={{ display:'block', color:'var(--ink)', marginBottom:'4px' }}>Test card (no real payment):</strong>
          <div style={{ color:'var(--ink-3)' }}>Number: <code style={{ background:'var(--border)', padding:'1px 5px', borderRadius:'3px' }}>4111 1111 1111 1111</code></div>
          <div style={{ color:'var(--ink-3)' }}>Expiry: <code style={{ background:'var(--border)', padding:'1px 5px', borderRadius:'3px' }}>12/28</code> &nbsp; CVV: <code style={{ background:'var(--border)', padding:'1px 5px', borderRadius:'3px' }}>123</code></div>
          <div style={{ color:'#00c965', marginTop:'4px', fontWeight:600 }}>✅ No real money charged</div>
        </div>
      )}
    </div>
  );
}

// ── ETH → Currency dropdown ───────────────────────────────
export function ETHAmount({ eth, size = 'normal' }) {
  const [prices,   setPrices]   = useState(null);
  const [currency, setCurrency] = useState('INR');
  const [open,     setOpen]     = useState(false);
  const dropRef = useRef(null);

  useEffect(() => { getPrices().then(setPrices); }, []);
  useEffect(() => {
    const h = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const curr     = CURRENCIES.find(c => c.code === currency);
  const rate     = prices?.[currency.toLowerCase()] || curr?.fb || 0;
  const converted = fmt(parseFloat(eth || 0) * rate, currency);

  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
      <span style={{ fontWeight:900, color:'#00c965', fontFamily:'monospace', fontSize: size === 'large' ? '1.3rem' : '0.95rem' }}>
        {parseFloat(eth || 0).toFixed(4)} ETH
      </span>
      <span style={{ color:'var(--ink-3)', fontSize:'11px' }}>≈</span>
      <span style={{ fontWeight:700, color:'#22c55e', fontSize: size === 'large' ? '1rem' : '0.78rem' }}>{converted}</span>
      <span ref={dropRef} style={{ position:'relative', display:'inline-block' }}>
        <button onClick={() => setOpen(o => !o)}
          style={{ padding:'1px 6px', borderRadius:'5px', fontSize:'11px', background:'var(--surface-3)', border:'1px solid var(--border)', color:'var(--ink-3)', cursor:'pointer', fontWeight:700 }}>
          {curr?.flag} {currency} ▾
        </button>
        {open && (
          <div style={{ position:'absolute', top:'100%', right:0, zIndex:400, background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'10px', padding:'5px', minWidth:'190px', boxShadow:'0 8px 24px rgba(0,0,0,0.15)', marginTop:'4px' }}>
            {CURRENCIES.map(c => {
              const r = prices?.[c.code.toLowerCase()] || c.fb;
              return (
                <button key={c.code} onClick={() => { setCurrency(c.code); setOpen(false); }}
                  style={{ width:'100%', padding:'5px 8px', borderRadius:'7px', border:'none', background: currency === c.code ? 'var(--surface-3)' : 'transparent', cursor:'pointer', textAlign:'left', display:'flex', justifyContent:'space-between', fontSize:'12px', color:'var(--ink)' }}>
                  <span>{c.flag} {c.name}</span>
                  <span style={{ fontFamily:'monospace', color:'#22c55e', fontSize:'11px' }}>
                    {fmt(parseFloat(eth || 0) * r, c.code)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </span>
    </span>
  );
}
