// UpiPayment.jsx — ETH to INR conversion + Razorpay UPI payment
import React, { useState, useEffect } from 'react';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee',     flag: '🇮🇳', rate: 250000 },
  { code: 'USD', symbol: '$', name: 'US Dollar',         flag: '🇺🇸', rate: 3000   },
  { code: 'EUR', symbol: '€', name: 'Euro',              flag: '🇪🇺', rate: 2800   },
  { code: 'GBP', symbol: '£', name: 'British Pound',     flag: '🇬🇧', rate: 2400   },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham',     flag: '🇦🇪', rate: 11000  },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', rate: 4000   },
];

// ── Live ETH price fetcher ────────────────────────────────
let priceCache = null;
let priceCacheTime = 0;

const getETHPrices = async () => {
  if (priceCache && Date.now() - priceCacheTime < 300000) return priceCache;
  try {
    const codes = CURRENCIES.map(c => c.code.toLowerCase()).join(',');
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=${codes}`);
    const d = await r.json();
    priceCache     = d.ethereum;
    priceCacheTime = Date.now();
    return d.ethereum;
  } catch {
    const fallback = {};
    CURRENCIES.forEach(c => { fallback[c.code.toLowerCase()] = c.rate; });
    return fallback;
  }
};

const fmt = (amount, currency) => {
  const curr = CURRENCIES.find(c => c.code === currency);
  return `${curr?.symbol || ''}${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: currency === 'JPY' ? 0 : 2 })}`;
};

// ── ETH Amount Display with currency dropdown ─────────────
export function ETHAmount({ eth, size = 'normal' }) {
  const [prices,   setPrices]   = useState(null);
  const [currency, setCurrency] = useState('INR');
  const [open,     setOpen]     = useState(false);

  useEffect(() => { getETHPrices().then(setPrices); }, []);

  const converted = prices
    ? fmt(parseFloat(eth || 0) * (prices[currency.toLowerCase()] || 0), currency)
    : '...';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 900, color: 'var(--mint-dim)', fontFamily: 'monospace', fontSize: size === 'large' ? '1.5rem' : '1rem' }}>
        {parseFloat(eth || 0).toFixed(4)} ETH
      </span>
      <span style={{ fontSize: size === 'large' ? '1rem' : '0.8rem', color: 'var(--ink-3)' }}>≈</span>
      <span style={{ fontWeight: 700, color: '#22c55e', fontSize: size === 'large' ? '1rem' : '0.8rem' }}>{converted}</span>
      <div style={{ position: 'relative' }}>
        <button onClick={() => setOpen(!open)}
          style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--ink-3)', cursor: 'pointer', fontWeight: 700 }}>
          {CURRENCIES.find(c => c.code === currency)?.flag} {currency} ▾
        </button>
        {open && (
          <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 100, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '6px', minWidth: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
            {CURRENCIES.map(c => (
              <button key={c.code} onClick={() => { setCurrency(c.code); setOpen(false); }}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '7px', border: 'none', background: currency === c.code ? 'var(--surface-3)' : 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--ink)' }}>
                <span>{c.flag} {c.name}</span>
                <span style={{ fontFamily: 'monospace', color: '#22c55e', fontSize: '11px' }}>
                  {prices ? fmt(parseFloat(eth || 0) * (prices[c.code.toLowerCase()] || 0), c.code) : '...'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Razorpay UPI Payment (for demo) ──────────────────────
export function UpiPayButton({ ethAmount, purpose, borrowerName, onSuccess }) {
  const [prices,  setPrices]  = useState(null);
  const [paying,  setPaying]  = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => { getETHPrices().then(setPrices); }, []);

  const inrAmount = prices ? Math.round(parseFloat(ethAmount || 0) * prices.inr) : 0;

  const handlePay = async () => {
    if (!inrAmount) return;
    setPaying(true);

    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.body.appendChild(script);

    script.onload = () => {
      const rzp = new window.Razorpay({
        key:         'rzp_test_1DP5mmOlF5G5ag', // Test key — safe to show
        amount:      inrAmount * 100, // paise
        currency:    'INR',
        name:        'EqualFund',
        description: `Loan: ${purpose || 'P2P Loan'} | ${ethAmount} ETH`,
        image:       'https://equalfund.vercel.app/favicon.ico',
        prefill:     { name: borrowerName || 'Borrower', email: 'demo@equalfund.com', contact: '9999999999' },
        theme:       { color: '#00e87a' },
        notes:       { ethAmount: `${ethAmount} ETH`, inrEquivalent: `₹${inrAmount.toLocaleString('en-IN')}`, platform: 'EqualFund Demo' },
        handler: (response) => {
          setPaying(false);
          onSuccess?.({
            paymentId: response.razorpay_payment_id,
            inrAmount,
            ethAmount,
          });
          alert(`✅ Payment Successful!\nPayment ID: ${response.razorpay_payment_id}\nAmount: ₹${inrAmount.toLocaleString('en-IN')}\nEquivalent: ${ethAmount} ETH\n\n(Demo mode — no real money charged)`);
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    };
    script.onerror = () => { setPaying(false); alert('Failed to load payment gateway'); };
  };

  return (
    <div>
      <button onClick={handlePay} disabled={paying || !inrAmount}
        style={{ padding: '10px 20px', borderRadius: '10px', background: paying ? 'rgba(0,200,100,0.3)' : 'linear-gradient(135deg,#00e87a,#00c965)', color: '#000', fontWeight: 800, border: 'none', cursor: paying ? 'not-allowed' : 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
        {paying ? '⏳ Processing...' : `🇮🇳 Pay ₹${inrAmount.toLocaleString('en-IN')} via UPI`}
      </button>

      <button onClick={() => setShowInfo(!showInfo)}
        style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--ink-3)', cursor: 'pointer', marginTop: '4px' }}>
        ℹ️ Test cards & UPI IDs
      </button>

      {showInfo && (
        <div style={{ marginTop: '8px', padding: '10px 12px', background: 'var(--surface-3)', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--ink-3)', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>Test credentials (Razorpay test mode):</strong>
          <div>Card: <code style={{ background: 'var(--border)', padding: '1px 4px', borderRadius: '3px' }}>4111 1111 1111 1111</code> · Exp: 12/25 · CVV: 123</div>
          <div>UPI: <code style={{ background: 'var(--border)', padding: '1px 4px', borderRadius: '3px' }}>success@razorpay</code></div>
          <div style={{ color: '#22c55e', marginTop: '4px' }}>✅ No real money is charged in test mode</div>
        </div>
      )}
    </div>
  );
}

// ── Full Currency Converter Widget ────────────────────────
export function CurrencyConverter() {
  const [eth,      setEth]      = useState('1');
  const [prices,   setPrices]   = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    getETHPrices().then(p => { setPrices(p); setLoading(false); });
  }, []);

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
        💱 ETH Currency Converter
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
        <input type="number" value={eth} onChange={e => setEth(e.target.value)} min="0" step="0.01"
          style={{ width: '100px', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-3)', color: 'var(--ink)', fontSize: '15px', fontFamily: 'monospace', fontWeight: 700, outline: 'none' }} />
        <span style={{ fontWeight: 800, color: 'var(--mint-dim)', fontSize: '15px' }}>ETH</span>
      </div>
      {loading ? (
        <div style={{ color: 'var(--ink-3)', fontSize: '13px' }}>Fetching live prices...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {CURRENCIES.map(c => {
            const amount = parseFloat(eth || 0) * (prices?.[c.code.toLowerCase()] || c.rate);
            return (
              <div key={c.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: c.code === 'INR' ? 'var(--mint-pale)' : 'var(--surface-3)', borderRadius: '8px', border: c.code === 'INR' ? '1px solid rgba(0,232,122,0.2)' : '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px' }}>{c.flag} {c.name}</span>
                <span style={{ fontWeight: 800, fontFamily: 'monospace', color: c.code === 'INR' ? 'var(--mint-dim)' : 'var(--ink)', fontSize: '13px' }}>
                  {fmt(amount, c.code)}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ fontSize: '10px', color: 'var(--ink-3)', marginTop: '8px', textAlign: 'right' }}>Live via CoinGecko · Updates every 5 min</div>
    </div>
  );
}
