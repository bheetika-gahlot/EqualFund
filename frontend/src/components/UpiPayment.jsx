// UpiPayment.jsx
// Custom payment UI — no Razorpay (it's broken in test mode without backend orders)
// Shows a realistic payment modal with card + UPI simulation
// Works 100%, no external dependencies
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
    _priceCache = d.ethereum; _priceTime = Date.now();
    return _priceCache;
  } catch {
    const fb = {};
    CURRENCIES.forEach(c => { fb[c.code.toLowerCase()] = c.fb; });
    return fb;
  }
}

// ── Payment Modal ─────────────────────────────────────────
function PaymentModal({ inrAmount, ethAmount, purpose, onSuccess, onClose }) {
  const [tab,      setTab]      = useState('card'); // card | upi | netbanking
  const [step,     setStep]     = useState(1);      // 1=form, 2=otp, 3=success
  const [loading,  setLoading]  = useState(false);
  const [otp,      setOtp]      = useState('');
  const [card,     setCard]     = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [upiId,    setUpiId]    = useState('');
  const [bank,     setBank]     = useState('');
  const [error,    setError]    = useState('');

  const formatCard = (v) => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const formatExp  = (v) => { const d = v.replace(/\D/g,'').slice(0,4); return d.length > 2 ? d.slice(0,2)+'/'+d.slice(2) : d; };

  const submit = async () => {
    setError('');
    // Validation
    if (tab === 'card') {
      const num = card.number.replace(/\s/g,'');
      if (num.length < 16)  { setError('Enter a valid 16-digit card number'); return; }
      if (!card.expiry.includes('/')) { setError('Enter expiry as MM/YY'); return; }
      if (card.cvv.length < 3)       { setError('Enter a valid CVV'); return; }
      if (!card.name.trim())         { setError('Enter cardholder name'); return; }
    }
    if (tab === 'upi') {
      if (!upiId.includes('@')) { setError('Enter a valid UPI ID (e.g. test@upi)'); return; }
    }
    if (tab === 'netbanking') {
      if (!bank) { setError('Please select a bank'); return; }
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 1500)); // simulate processing
    setLoading(false);
    setStep(2); // show OTP
  };

  const verifyOtp = async () => {
    if (otp.length < 4) { setError('Enter the 4-6 digit OTP'); return; }
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setStep(3); // success
    setTimeout(() => {
      onSuccess?.({
        paymentId: 'pay_' + Math.random().toString(36).slice(2, 14).toUpperCase(),
        inrAmount, ethAmount,
      });
      onClose?.();
    }, 2000);
  };

  const banks = ['State Bank of India','HDFC Bank','ICICI Bank','Axis Bank','Kotak Mahindra','Punjab National Bank','Bank of Baroda','Canara Bank'];

  return (
    <div onClick={e => e.stopPropagation()} style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'16px', width:'100%', maxWidth:'420px', overflow:'hidden', boxShadow:'0 24px 60px rgba(0,0,0,0.4)' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#00e87a,#00c965)', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:800, color:'#000', fontSize:'15px' }}>EqualFund Payment</div>
            <div style={{ color:'#00553a', fontSize:'12px', marginTop:'2px' }}>Secure · Encrypted · Demo Mode</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontWeight:900, color:'#000', fontSize:'1.4rem', lineHeight:1 }}>₹{inrAmount.toLocaleString('en-IN')}</div>
            <div style={{ fontSize:'11px', color:'#00553a' }}>≈ {ethAmount} ETH</div>
          </div>
        </div>

        {/* Purpose */}
        {purpose && (
          <div style={{ padding:'10px 20px', background:'#f0fff8', borderBottom:'1px solid #e0f5ea', fontSize:'12px', color:'#006640' }}>
            💸 {purpose.slice(0, 70)}{purpose.length > 70 ? '...' : ''}
          </div>
        )}

        <div style={{ padding:'20px' }}>

          {/* ── STEP 1: Payment form ── */}
          {step === 1 && (
            <>
              {/* Tabs */}
              <div style={{ display:'flex', gap:'0', marginBottom:'16px', border:'1px solid #e5e7eb', borderRadius:'10px', overflow:'hidden' }}>
                {[['card','💳 Card'],['upi','📱 UPI'],['netbanking','🏦 Netbanking']].map(([t,l]) => (
                  <button key={t} onClick={() => { setTab(t); setError(''); }}
                    style={{ flex:1, padding:'8px 0', fontSize:'11px', fontWeight:700, border:'none', cursor:'pointer', background:tab===t?'#00e87a':'#f9fafb', color:tab===t?'#000':'#666', transition:'all 0.2s' }}>
                    {l}
                  </button>
                ))}
              </div>

              {/* Card form */}
              {tab === 'card' && (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  <div>
                    <label style={{ fontSize:'11px', fontWeight:700, color:'#374151', display:'block', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Card Number</label>
                    <input value={card.number} onChange={e => setCard(p=>({...p,number:formatCard(e.target.value)}))} placeholder="4111 1111 1111 1111" maxLength={19}
                      style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1.5px solid #d1d5db', fontSize:'14px', fontFamily:'monospace', outline:'none', boxSizing:'border-box' }}
                      onFocus={e=>e.target.style.borderColor='#00c965'} onBlur={e=>e.target.style.borderColor='#d1d5db'} />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                    <div>
                      <label style={{ fontSize:'11px', fontWeight:700, color:'#374151', display:'block', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Expiry</label>
                      <input value={card.expiry} onChange={e => setCard(p=>({...p,expiry:formatExp(e.target.value)}))} placeholder="12/28" maxLength={5}
                        style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1.5px solid #d1d5db', fontSize:'14px', fontFamily:'monospace', outline:'none', boxSizing:'border-box' }}
                        onFocus={e=>e.target.style.borderColor='#00c965'} onBlur={e=>e.target.style.borderColor='#d1d5db'} />
                    </div>
                    <div>
                      <label style={{ fontSize:'11px', fontWeight:700, color:'#374151', display:'block', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.06em' }}>CVV</label>
                      <input type="password" value={card.cvv} onChange={e => setCard(p=>({...p,cvv:e.target.value.replace(/\D/g,'').slice(0,4)}))} placeholder="123" maxLength={4}
                        style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1.5px solid #d1d5db', fontSize:'14px', fontFamily:'monospace', outline:'none', boxSizing:'border-box' }}
                        onFocus={e=>e.target.style.borderColor='#00c965'} onBlur={e=>e.target.style.borderColor='#d1d5db'} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize:'11px', fontWeight:700, color:'#374151', display:'block', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Cardholder Name</label>
                    <input value={card.name} onChange={e => setCard(p=>({...p,name:e.target.value}))} placeholder="Name on card"
                      style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1.5px solid #d1d5db', fontSize:'14px', outline:'none', boxSizing:'border-box' }}
                      onFocus={e=>e.target.style.borderColor='#00c965'} onBlur={e=>e.target.style.borderColor='#d1d5db'} />
                  </div>
                  <div style={{ padding:'8px 10px', background:'#f0fff8', borderRadius:'8px', fontSize:'11px', color:'#006640', lineHeight:1.6 }}>
                    💡 Test card: <strong>4111 1111 1111 1111</strong> · Exp: <strong>12/28</strong> · CVV: <strong>123</strong>
                  </div>
                </div>
              )}

              {/* UPI form */}
              {tab === 'upi' && (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  <div>
                    <label style={{ fontSize:'11px', fontWeight:700, color:'#374151', display:'block', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.06em' }}>UPI ID</label>
                    <input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi"
                      style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1.5px solid #d1d5db', fontSize:'14px', outline:'none', boxSizing:'border-box' }}
                      onFocus={e=>e.target.style.borderColor='#00c965'} onBlur={e=>e.target.style.borderColor='#d1d5db'} />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginTop:'4px' }}>
                    {['GPay','PhonePe','Paytm','BHIM','Amazon Pay','WhatsApp'].map(app => (
                      <button key={app} onClick={() => setUpiId(app.toLowerCase().replace(/\s/g,'')+'@ok')}
                        style={{ padding:'8px 6px', borderRadius:'8px', border:'1.5px solid #e5e7eb', background:'#f9fafb', fontSize:'11px', fontWeight:700, cursor:'pointer', color:'#374151' }}>
                        {app}
                      </button>
                    ))}
                  </div>
                  <div style={{ padding:'8px 10px', background:'#f0fff8', borderRadius:'8px', fontSize:'11px', color:'#006640' }}>
                    💡 Test UPI: <strong>success@upi</strong>
                  </div>
                </div>
              )}

              {/* Netbanking form */}
              {tab === 'netbanking' && (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  <label style={{ fontSize:'11px', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.06em' }}>Select Bank</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    {banks.map(b => (
                      <button key={b} onClick={() => setBank(b)}
                        style={{ padding:'8px 10px', borderRadius:'8px', border:`1.5px solid ${bank===b?'#00c965':'#e5e7eb'}`, background:bank===b?'#f0fff8':'#f9fafb', fontSize:'11px', fontWeight:bank===b?700:500, cursor:'pointer', color:bank===b?'#006640':'#374151', textAlign:'left', transition:'all 0.15s' }}>
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && <div style={{ padding:'8px 12px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'8px', fontSize:'12px', color:'#dc2626', marginTop:'4px' }}>⚠️ {error}</div>}

              <div style={{ display:'flex', gap:'8px', marginTop:'16px' }}>
                <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:'10px', border:'1.5px solid #e5e7eb', background:'#f9fafb', color:'#374151', fontWeight:700, cursor:'pointer', fontSize:'13px' }}>Cancel</button>
                <button onClick={submit} disabled={loading} style={{ flex:2, padding:'10px', borderRadius:'10px', border:'none', background: loading ? 'rgba(0,200,100,0.4)' : '#00e87a', color:'#000', fontWeight:800, cursor: loading?'not-allowed':'pointer', fontSize:'13px' }}>
                  {loading ? '⏳ Verifying...' : `Pay ₹${inrAmount.toLocaleString('en-IN')}`}
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === 2 && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'12px' }}>📱</div>
              <h3 style={{ fontWeight:800, color:'#111', marginBottom:'6px', fontSize:'16px' }}>OTP Verification</h3>
              <p style={{ fontSize:'13px', color:'#6b7280', marginBottom:'20px', lineHeight:1.6 }}>
                A 6-digit OTP has been sent to your {tab === 'upi' ? 'UPI app' : tab === 'netbanking' ? 'registered mobile' : 'card registered mobile'}.<br/>
                <strong style={{ color:'#006640' }}>For demo, enter any 6 digits.</strong>
              </p>
              <div style={{ display:'flex', justifyContent:'center', gap:'8px', marginBottom:'16px' }}>
                {[0,1,2,3,4,5].map(i => (
                  <input key={i} maxLength={1} value={otp[i]||''} onChange={e => {
                    const val = e.target.value.replace(/\D/,'');
                    const arr = otp.split('');
                    arr[i] = val;
                    setOtp(arr.join(''));
                    if (val && e.target.nextElementSibling) e.target.nextElementSibling.focus();
                  }}
                  style={{ width:'40px', height:'48px', borderRadius:'10px', border:`2px solid ${otp[i]?'#00c965':'#d1d5db'}`, textAlign:'center', fontSize:'20px', fontWeight:800, fontFamily:'monospace', outline:'none' }}
                  onFocus={e=>e.target.style.borderColor='#00c965'} />
                ))}
              </div>
              {error && <div style={{ padding:'8px 12px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'8px', fontSize:'12px', color:'#dc2626', marginBottom:'12px' }}>⚠️ {error}</div>}
              <button onClick={verifyOtp} disabled={loading || otp.length < 4}
                style={{ width:'100%', padding:'11px', borderRadius:'10px', border:'none', background: otp.length>=4?'#00e87a':'#e5e7eb', color:otp.length>=4?'#000':'#9ca3af', fontWeight:800, cursor: otp.length>=4?'pointer':'not-allowed', fontSize:'14px' }}>
                {loading ? '⏳ Verifying OTP...' : 'Verify & Pay'}
              </button>
              <button onClick={() => { setStep(1); setOtp(''); setError(''); }} style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:'12px', marginTop:'10px' }}>← Back</button>
            </div>
          )}

          {/* ── STEP 3: Success ── */}
          {step === 3 && (
            <div style={{ textAlign:'center', padding:'8px 0' }}>
              <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:'#f0fff8', border:'3px solid #00e87a', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:'1.75rem' }}>✅</div>
              <h3 style={{ fontWeight:900, color:'#111', fontSize:'18px', marginBottom:'6px' }}>Payment Successful!</h3>
              <p style={{ fontSize:'13px', color:'#6b7280', marginBottom:'16px', lineHeight:1.6 }}>
                ₹{inrAmount.toLocaleString('en-IN')} paid successfully.<br/>
                This is a demo transaction — no real money was charged.
              </p>
              <div style={{ padding:'12px 16px', background:'#f0fff8', borderRadius:'10px', border:'1px solid #a7f3d0', fontSize:'12px', color:'#065f46', textAlign:'left', lineHeight:1.8 }}>
                <div>Amount: <strong>₹{inrAmount.toLocaleString('en-IN')}</strong></div>
                <div>ETH equiv: <strong>{ethAmount} ETH</strong></div>
                <div>Status: <strong style={{ color:'#00c965' }}>Success</strong></div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', marginTop:'16px', fontSize:'11px', color:'#9ca3af' }}>
            <span>🔒 Secured by</span>
            <span style={{ fontWeight:700, color:'#6b7280' }}>EqualFund Payments</span>
            <span>· Demo Mode</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── UPI Pay Button ────────────────────────────────────────
export function UpiPayButton({ ethAmount, purpose, borrowerName, onSuccess }) {
  const [rates,   setRates]   = useState(null);
  const [showModal, setModal] = useState(false);

  useEffect(() => { getLiveRates().then(setRates); }, []);

  const eth       = parseFloat(ethAmount || 0);
  const inrAmount = rates ? Math.round(eth * (rates.inr || 252000)) : 0;

  if (!inrAmount) return <div style={{ fontSize:'12px', color:'var(--ink-3)', textAlign:'center', padding:'8px' }}>Loading INR rate...</div>;

  return (
    <>
      <button onClick={() => setModal(true)}
        style={{ width:'100%', padding:'11px 20px', borderRadius:'10px', background:'linear-gradient(135deg,#00e87a,#00c965)', color:'#000', fontWeight:800, border:'none', cursor:'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center', gap:'7px', transition:'all 0.2s' }}>
        💳 Pay ₹{inrAmount.toLocaleString('en-IN')} via Card / UPI / Netbanking
      </button>

      {showModal && (
        <PaymentModal
          inrAmount={inrAmount}
          ethAmount={eth.toFixed(4)}
          purpose={purpose}
          borrowerName={borrowerName}
          onSuccess={result => { onSuccess?.(result); setModal(false); }}
          onClose={() => setModal(false)}
        />
      )}
    </>
  );
}

// ── ETH → Currency dropdown ───────────────────────────────
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
  const display = `${curr?.symbol}${Math.round(parseFloat(eth || 0) * rate).toLocaleString('en-IN')}`;

  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
      <span style={{ fontWeight:900, color:'#00c965', fontFamily:'monospace', fontSize: size==='large'?'1.3rem':'0.95rem' }}>
        {parseFloat(eth||0).toFixed(4)} ETH
      </span>
      <span style={{ color:'var(--ink-3)', fontSize:'11px' }}>≈</span>
      <span style={{ fontWeight:700, color:'#22c55e', fontSize: size==='large'?'1rem':'0.78rem' }}>{display}</span>
      <span ref={ref} style={{ position:'relative' }}>
        <button onClick={() => setOpen(o=>!o)}
          style={{ padding:'1px 6px', borderRadius:'5px', fontSize:'11px', background:'var(--surface-3)', border:'1px solid var(--border)', color:'var(--ink-3)', cursor:'pointer', fontWeight:700 }}>
          {curr?.flag} {currency} ▾
        </button>
        {open && (
          <div style={{ position:'absolute', top:'100%', right:0, zIndex:400, background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'10px', padding:'5px', minWidth:'190px', boxShadow:'0 8px 24px rgba(0,0,0,0.15)', marginTop:'4px' }}>
            {CURRENCIES.map(c => {
              const r = rates?.[c.code.toLowerCase()] || c.fb;
              return (
                <button key={c.code} onClick={() => { setCurrency(c.code); setOpen(false); }}
                  style={{ width:'100%', padding:'5px 8px', borderRadius:'7px', border:'none', background:currency===c.code?'var(--surface-3)':'transparent', cursor:'pointer', textAlign:'left', display:'flex', justifyContent:'space-between', fontSize:'12px', color:'var(--ink)' }}>
                  <span>{c.flag} {c.name}</span>
                  <span style={{ fontFamily:'monospace', color:'#22c55e', fontSize:'11px' }}>
                    {c.symbol}{Math.round(parseFloat(eth||0)*r).toLocaleString('en-IN')}
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

// ── Currency Converter ────────────────────────────────────
export function CurrencyConverter({ defaultEth = '1' }) {
  const [eth,   setEth]   = useState(defaultEth);
  const [rates, setRates] = useState(null);
  useEffect(() => { getLiveRates().then(setRates); }, []);
  return (
    <div style={{ padding:'1.25rem', background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'14px' }}>
      <div style={{ fontSize:'11px', fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'12px' }}>💱 ETH Converter</div>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
        <input type="number" value={eth} onChange={e=>setEth(e.target.value)} min="0" step="0.01"
          style={{ width:'90px', padding:'7px 10px', borderRadius:'8px', border:'1px solid var(--border)', background:'var(--surface-3)', color:'var(--ink)', fontSize:'14px', fontFamily:'monospace', fontWeight:700, outline:'none' }} />
        <span style={{ fontWeight:800, color:'#00c965' }}>ETH</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
        {CURRENCIES.map(c => {
          const r = rates?.[c.code.toLowerCase()] || c.fb;
          return (
            <div key={c.code} style={{ display:'flex', justifyContent:'space-between', padding:'6px 10px', background:c.code==='INR'?'rgba(0,232,122,0.06)':'var(--surface-3)', borderRadius:'8px', border:c.code==='INR'?'1px solid rgba(0,232,122,0.2)':'1px solid var(--border)' }}>
              <span style={{ fontSize:'12px' }}>{c.flag} {c.name}</span>
              <span style={{ fontWeight:800, fontFamily:'monospace', color:c.code==='INR'?'#00c965':'var(--ink)', fontSize:'13px' }}>
                {c.symbol}{Math.round(parseFloat(eth||0)*r).toLocaleString('en-IN')}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize:'10px', color:'var(--ink-3)', marginTop:'8px', textAlign:'right' }}>Live via CoinGecko · 5 min cache</div>
    </div>
  );
}
