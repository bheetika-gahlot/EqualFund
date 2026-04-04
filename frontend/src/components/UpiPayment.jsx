// UpiPayment.jsx — Fixed Razorpay UPI + ETH→INR converter
import React, { useState, useEffect, useRef } from 'react';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee',     flag: '🇮🇳' },
  { code: 'USD', symbol: '$', name: 'US Dollar',         flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro',              flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound',     flag: '🇬🇧' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham',     flag: '🇦🇪' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬' },
];

// Fallback rates (if CoinGecko unavailable)
const FALLBACK = { inr: 252000, usd: 3020, eur: 2790, gbp: 2350, aed: 11100, sgd: 4060 };

let _cache = null, _cacheTime = 0;
const getPrices = async () => {
  if (_cache && Date.now() - _cacheTime < 300000) return _cache;
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr,usd,eur,gbp,aed,sgd');
    const d = await r.json();
    _cache = d.ethereum; _cacheTime = Date.now();
    return _cache;
  } catch { return FALLBACK; }
};

const fmt = (amount, code) => {
  const c = CURRENCIES.find(x => x.code === code);
  const n = Number(amount);
  const s = n.toLocaleString('en-IN', { maximumFractionDigits: code === 'JPY' ? 0 : 0 });
  return `${c?.symbol}${s}`;
};

// ── Load Razorpay script once ─────────────────────────────
const loadRazorpay = () => new Promise((res, rej) => {
  if (window.Razorpay) { res(true); return; }
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.onload  = () => res(true);
  s.onerror = () => rej(new Error('Razorpay load failed'));
  document.head.appendChild(s);
});

// ── UPI Pay Button ────────────────────────────────────────
export function UpiPayButton({ ethAmount, purpose, borrowerName, onSuccess }) {
  const [prices,  setPrices]   = useState(null);
  const [paying,  setPaying]   = useState(false);
  const [showTip, setShowTip]  = useState(false);
  const eth = parseFloat(ethAmount || 0);

  useEffect(() => { getPrices().then(setPrices); }, []);

  const inrAmount = prices ? Math.max(1, Math.round(eth * prices.inr)) : 0;

  const handlePay = async () => {
    if (!inrAmount || paying) return;
    setPaying(true);
    try {
      await loadRazorpay();

      // ── FIXED Razorpay config — only card method (UPI requires backend order) ──
      const options = {
        key:      'rzp_test_1DP5mmOlF5G5ag',
        amount:   inrAmount * 100,       // paise
        currency: 'INR',
        name:     'EqualFund',
        description: `P2P Loan · ${eth.toFixed(4)} ETH`,
        image:    'https://equalfund.vercel.app/favicon.ico',
        prefill: {
          name:    borrowerName || 'EqualFund User',
          email:   'demo@equalfund.com',
          contact: '9999999999',
        },
        theme:  { color: '#00e87a' },
        method: {
          // !! FIX: Only enable methods that work in test mode without backend
          card:    true,
          netbanking: true,
          wallet:  true,
          upi:     false,   // UPI requires backend order creation — disabled for demo
          emi:     false,
        },
        notes: {
          eth_amount:  `${eth} ETH`,
          inr_amount:  `₹${inrAmount.toLocaleString('en-IN')}`,
          loan_purpose: purpose || 'P2P Loan',
          platform:    'EqualFund Demo',
        },
        handler: response => {
          setPaying(false);
          onSuccess?.({ paymentId: response.razorpay_payment_id, inrAmount, ethAmount: eth });
        },
        modal: {
          ondismiss:     () => setPaying(false),
          escape:        false,
          backdropclose: false,
          confirm_close: true,
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => { setPaying(false); });
      rzp.open();
    } catch (e) {
      setPaying(false);
      alert('Payment gateway error: ' + e.message);
    }
  };

  if (!inrAmount) return null;

  return (
    <div>
      <button onClick={handlePay} disabled={paying}
        style={{ padding: '10px 20px', borderRadius: '10px', background: paying ? 'rgba(0,200,100,0.3)' : 'linear-gradient(135deg,#00e87a,#00c965)', color: '#000', fontWeight: 800, border: 'none', cursor: paying ? 'not-allowed' : 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.2s', width: '100%', justifyContent: 'center' }}>
        {paying ? '⏳ Opening payment...' : `💳 Pay ₹${inrAmount.toLocaleString('en-IN')} (Demo)`}
      </button>

      <button onClick={() => setShowTip(!showTip)} style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--ink-3)', cursor: 'pointer', marginTop: '5px', display: 'block', width: '100%', textAlign: 'center' }}>
        ℹ️ Test card details {showTip ? '▲' : '▼'}
      </button>

      {showTip && (
        <div style={{ marginTop: '6px', padding: '10px 12px', background: 'var(--surface-3)', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--ink-3)', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>Test credentials:</strong>
          <div>Card: <code style={{ background: 'var(--border)', padding: '1px 5px', borderRadius: '3px', fontSize: '11px' }}>4111 1111 1111 1111</code></div>
          <div>Expiry: <code style={{ background: 'var(--border)', padding: '1px 5px', borderRadius: '3px', fontSize: '11px' }}>12/28</code> · CVV: <code style={{ background: 'var(--border)', padding: '1px 5px', borderRadius: '3px', fontSize: '11px' }}>123</code></div>
          <div style={{ color: '#00c965', marginTop: '4px' }}>✅ No real money charged · Test mode only</div>
        </div>
      )}
    </div>
  );
}

// ── ETH Amount with currency switcher ────────────────────
export function ETHAmount({ eth, size = 'normal' }) {
  const [prices,   setPrices]   = useState(null);
  const [currency, setCurrency] = useState('INR');
  const [open,     setOpen]     = useState(false);
  const dropRef = useRef(null);

  useEffect(() => { getPrices().then(setPrices); }, []);
  useEffect(() => {
    const handler = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const rate      = prices?.[currency.toLowerCase()] || FALLBACK[currency.toLowerCase()] || 0;
  const converted = fmt(parseFloat(eth || 0) * rate, currency);
  const curr      = CURRENCIES.find(c => c.code === currency);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 900, color: '#00c965', fontFamily: 'monospace', fontSize: size === 'large' ? '1.4rem' : '0.95rem' }}>
        {parseFloat(eth || 0).toFixed(4)} ETH
      </span>
      <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>≈</span>
      <span style={{ fontWeight: 700, color: '#22c55e', fontSize: size === 'large' ? '1rem' : '0.78rem' }}>{converted}</span>
      <div ref={dropRef} style={{ position: 'relative' }}>
        <button onClick={() => setOpen(!open)}
          style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '11px', background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--ink-3)', cursor: 'pointer', fontWeight: 700 }}>
          {curr?.flag} {currency} ▾
        </button>
        {open && (
          <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 200, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '5px', minWidth: '195px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', marginTop: '4px' }}>
            {CURRENCIES.map(c => {
              const r = prices?.[c.code.toLowerCase()] || FALLBACK[c.code.toLowerCase()] || 0;
              return (
                <button key={c.code} onClick={() => { setCurrency(c.code); setOpen(false); }}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '7px', border: 'none', background: currency === c.code ? 'var(--surface-3)' : 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--ink)' }}>
                  <span>{c.flag} {c.name}</span>
                  <span style={{ fontFamily: 'monospace', color: '#22c55e', fontSize: '11px' }}>
                    {fmt(parseFloat(eth || 0) * r, c.code)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Currency Converter Widget ─────────────────────────────
export function CurrencyConverter({ defaultEth = '1' }) {
  const [eth,     setEth]     = useState(defaultEth);
  const [prices,  setPrices]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPrices().then(p => { setPrices(p); setLoading(false); });
  }, []);

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>💱 ETH Converter</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <input type="number" value={eth} onChange={e => setEth(e.target.value)} min="0" step="0.01"
          style={{ width: '90px', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-3)', color: 'var(--ink)', fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, outline: 'none' }} />
        <span style={{ fontWeight: 800, color: '#00c965', fontSize: '14px' }}>ETH</span>
        {loading && <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Loading...</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {CURRENCIES.map(c => {
          const rate   = prices?.[c.code.toLowerCase()] || FALLBACK[c.code.toLowerCase()] || 0;
          const amount = parseFloat(eth || 0) * rate;
          return (
            <div key={c.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: c.code === 'INR' ? 'rgba(0,232,122,0.06)' : 'var(--surface-3)', borderRadius: '8px', border: c.code === 'INR' ? '1px solid rgba(0,232,122,0.2)' : '1px solid var(--border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--ink)' }}>{c.flag} {c.name}</span>
              <span style={{ fontWeight: 800, fontFamily: 'monospace', color: c.code === 'INR' ? '#00c965' : 'var(--ink)', fontSize: '13px' }}>
                {fmt(amount, c.code)}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--ink-3)', marginTop: '8px', textAlign: 'right' }}>Live via CoinGecko · ~5 min cache</div>
    </div>
  );
}
