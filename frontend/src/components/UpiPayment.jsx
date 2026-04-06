// UpiPayment.jsx
// ROOT CAUSE OF "No appropriate payment method":
// The test key rzp_test_1DP5mmOlF5G5ag has payment methods restricted in Razorpay dashboard.
// FIX: Use Razorpay Standard Checkout with amount >= 100 paise (₹1 min)
// and do NOT pass config.method at all — let Razorpay decide available methods.
// Also ensure amount is an INTEGER in paise, not float.

import React, { useState, useEffect, useRef } from 'react';

const CURRENCIES = [
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee',    flag: '🇮🇳', fb: 252000 },
  { code: 'USD', symbol: '$',   name: 'US Dollar',        flag: '🇺🇸', fb: 3020   },
  { code: 'EUR', symbol: '€',   name: 'Euro',             flag: '🇪🇺', fb: 2790   },
  { code: 'GBP', symbol: '£',   name: 'British Pound',    flag: '🇬🇧', fb: 2350   },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham',       flag: '🇦🇪', fb: 11100  },
  { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar', flag: '🇸🇬', fb: 4060   },
];

let _priceCache = null, _priceTime = 0;

async function getLiveRates() {
  if (_priceCache && Date.now() - _priceTime < 300000) return _priceCache;
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr,usd,eur,gbp,aed,sgd');
    const d = await r.json();
    _priceCache = d.ethereum;
    _priceTime  = Date.now();
    return _priceCache;
  } catch {
    const fb = {};
    CURRENCIES.forEach(c => { fb[c.code.toLowerCase()] = c.fb; });
    return fb;
  }
}

function loadRzp() {
  return new Promise((ok, fail) => {
    if (window.Razorpay) { ok(); return; }
    const s   = document.createElement('script');
    s.src     = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = ok;
    s.onerror = () => fail(new Error('Could not load Razorpay script'));
    document.head.appendChild(s);
  });
}

// ── UPI Pay Button ────────────────────────────────────────
export function UpiPayButton({ ethAmount, purpose, borrowerName, onSuccess }) {
  const [rates,   setRates]   = useState(null);
  const [paying,  setPaying]  = useState(false);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => { getLiveRates().then(setRates); }, []);

  const eth = parseFloat(ethAmount || 0);
  // !! FIX: amount must be integer paise, minimum 100 (₹1)
  const inrFloat  = rates ? eth * (rates.inr || 252000) : 0;
  const inrPaise  = Math.max(100, Math.round(inrFloat * 100)); // in paise
  const inrRupees = Math.round(inrPaise / 100);

  const handlePay = async () => {
    if (inrPaise < 100 || paying) return;
    setPaying(true);

    try {
      await loadRzp();

      // !! KEY FIX: minimal config, NO method restrictions whatsoever
      const options = {
        key:         'rzp_test_1DP5mmOlF5G5ag',
        amount:      inrPaise,         // ← integer paise, e.g. 10000 = ₹100
        currency:    'INR',
        name:        'EqualFund',
        description: purpose ? `Loan: ${purpose.slice(0, 60)}` : 'P2P Loan Funding',
        prefill: {
          name:    borrowerName || 'EqualFund User',
          email:   'test@equalfund.com',
          contact: '9000000000',
        },
        theme: { color: '#00e87a' },
        // !! Do NOT include: method, config, or any payment restriction
        handler(response) {
          setPaying(false);
          onSuccess?.({
            paymentId:  response.razorpay_payment_id,
            inrAmount:  inrRupees,
            ethAmount:  eth,
          });
          alert(`✅ Payment Successful!\nPayment ID: ${response.razorpay_payment_id}\nAmount: ₹${inrRupees.toLocaleString('en-IN')}\n\n(Test mode — no real money charged)`);
        },
        modal: {
          ondismiss() { setPaying(false); },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', ev => {
        setPaying(false);
        console.error('Razorpay failed:', ev.error);
      });
      rzp.open();

    } catch (e) {
      setPaying(false);
      alert('Payment gateway error: ' + e.message);
    }
  };

  return (
    <div>
      {/* Pay button */}
      <button
        onClick={handlePay}
        disabled={paying || inrPaise < 100}
        style={{
          width: '100%', padding: '11px 20px',
          borderRadius: '10px',
          background: (paying || inrPaise < 100)
            ? 'rgba(0,200,100,0.25)'
            : 'linear-gradient(135deg,#00e87a,#00c965)',
          color: '#000', fontWeight: 800, border: 'none',
          cursor: (paying || inrPaise < 100) ? 'not-allowed' : 'pointer',
          fontSize: '13px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '7px', transition: 'all 0.2s',
        }}>
        {paying
          ? '⏳ Opening payment...'
          : inrPaise < 100
            ? '⏳ Calculating...'
            : `💳 Pay ₹${inrRupees.toLocaleString('en-IN')} via Card / UPI`
        }
      </button>

      {/* Test credentials toggle */}
      <button
        onClick={() => setShowTip(s => !s)}
        style={{ background:'none', border:'none', fontSize:'11px', color:'var(--ink-3)', cursor:'pointer', marginTop:'6px', width:'100%', textAlign:'center' }}>
        ℹ️ Test credentials {showTip ? '▲' : '▼'}
      </button>

      {showTip && (
        <div style={{ marginTop:'8px', padding:'12px 14px', background:'var(--surface-3)', borderRadius:'10px', border:'1px solid var(--border)', fontSize:'12px', lineHeight:2 }}>
          <strong style={{ display:'block', color:'var(--ink)', marginBottom:'4px' }}>Razorpay test mode — no real payment:</strong>
          <div style={{ color:'var(--ink-3)' }}>Card:   <code style={{ background:'var(--border)', padding:'1px 5px', borderRadius:'3px' }}>4111 1111 1111 1111</code></div>
          <div style={{ color:'var(--ink-3)' }}>Expiry: <code style={{ background:'var(--border)', padding:'1px 5px', borderRadius:'3px' }}>12/28</code>
            &nbsp;CVV: <code style={{ background:'var(--border)', padding:'1px 5px', borderRadius:'3px' }}>123</code>
          </div>
          <div style={{ color:'var(--ink-3)' }}>UPI:    <code style={{ background:'var(--border)', padding:'1px 5px', borderRadius:'3px' }}>success@razorpay</code></div>
          <div style={{ color:'#00c965', fontWeight:700, marginTop:'4px' }}>✅ Zero real money charged in test mode</div>
        </div>
      )}
    </div>
  );
}

// ── ETH → Currency switcher ───────────────────────────────
export function ETHAmount({ eth, size = 'normal' }) {
  const [rates,    setRates]    = useState(null);
  const [currency, setCurrency] = useState('INR');
  const [open,     setOpen]     = useState(false);
  const ref = useRef(null);

  useEffect(() => { getLiveRates().then(setRates); }, []);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const curr    = CURRENCIES.find(c => c.code === currency);
  const rate    = rates?.[currency.toLowerCase()] || curr?.fb || 0;
  const amount  = Math.round(parseFloat(eth || 0) * rate);
  const display = `${curr?.symbol}${amount.toLocaleString('en-IN')}`;

  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
      <span style={{ fontWeight:900, color:'#00c965', fontFamily:'monospace', fontSize: size === 'large' ? '1.3rem' : '0.95rem' }}>
        {parseFloat(eth || 0).toFixed(4)} ETH
      </span>
      <span style={{ color:'var(--ink-3)', fontSize:'11px' }}>≈</span>
      <span style={{ fontWeight:700, color:'#22c55e', fontSize: size === 'large' ? '1rem' : '0.78rem' }}>{display}</span>
      <span ref={ref} style={{ position:'relative' }}>
        <button onClick={() => setOpen(o => !o)}
          style={{ padding:'1px 6px', borderRadius:'5px', fontSize:'11px', background:'var(--surface-3)', border:'1px solid var(--border)', color:'var(--ink-3)', cursor:'pointer', fontWeight:700 }}>
          {curr?.flag} {currency} ▾
        </button>
        {open && (
          <div style={{ position:'absolute', top:'100%', right:0, zIndex:400, background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'10px', padding:'5px', minWidth:'190px', boxShadow:'0 8px 24px rgba(0,0,0,0.15)', marginTop:'4px' }}>
            {CURRENCIES.map(c => {
              const r = rates?.[c.code.toLowerCase()] || c.fb;
              return (
                <button key={c.code} onClick={() => { setCurrency(c.code); setOpen(false); }}
                  style={{ width:'100%', padding:'5px 8px', borderRadius:'7px', border:'none', background: currency === c.code ? 'var(--surface-3)' : 'transparent', cursor:'pointer', textAlign:'left', display:'flex', justifyContent:'space-between', fontSize:'12px', color:'var(--ink)' }}>
                  <span>{c.flag} {c.name}</span>
                  <span style={{ fontFamily:'monospace', color:'#22c55e', fontSize:'11px' }}>
                    {c.symbol}{Math.round(parseFloat(eth || 0) * r).toLocaleString('en-IN')}
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

// ── Currency Converter Widget ─────────────────────────────
export function CurrencyConverter({ defaultEth = '1' }) {
  const [eth,   setEth]   = useState(defaultEth);
  const [rates, setRates] = useState(null);

  useEffect(() => { getLiveRates().then(setRates); }, []);

  return (
    <div style={{ padding:'1.25rem', background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'14px' }}>
      <div style={{ fontSize:'11px', fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'12px' }}>
        💱 ETH Converter
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
        <input type="number" value={eth} onChange={e => setEth(e.target.value)} min="0" step="0.01"
          style={{ width:'90px', padding:'7px 10px', borderRadius:'8px', border:'1px solid var(--border)', background:'var(--surface-3)', color:'var(--ink)', fontSize:'14px', fontFamily:'monospace', fontWeight:700, outline:'none' }} />
        <span style={{ fontWeight:800, color:'#00c965' }}>ETH</span>
        {!rates && <span style={{ fontSize:'11px', color:'var(--ink-3)' }}>Loading...</span>}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
        {CURRENCIES.map(c => {
          const r = rates?.[c.code.toLowerCase()] || c.fb;
          const v = Math.round(parseFloat(eth || 0) * r);
          return (
            <div key={c.code} style={{ display:'flex', justifyContent:'space-between', padding:'6px 10px', background: c.code === 'INR' ? 'rgba(0,232,122,0.06)' : 'var(--surface-3)', borderRadius:'8px', border: c.code === 'INR' ? '1px solid rgba(0,232,122,0.2)' : '1px solid var(--border)' }}>
              <span style={{ fontSize:'12px' }}>{c.flag} {c.name}</span>
              <span style={{ fontWeight:800, fontFamily:'monospace', color: c.code === 'INR' ? '#00c965' : 'var(--ink)', fontSize:'13px' }}>
                {c.symbol}{v.toLocaleString('en-IN')}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize:'10px', color:'var(--ink-3)', marginTop:'8px', textAlign:'right' }}>Live via CoinGecko · 5 min cache</div>
    </div>
  );
}
