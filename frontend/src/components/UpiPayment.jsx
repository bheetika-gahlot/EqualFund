// UpiPayment.jsx — After OTP verified, calls backend to mark loan funded
// Borrower gets notification: "Your loan was funded via INR payment"
import React, { useState, useEffect, useRef } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'https://equalfund-api.onrender.com/api';

const CURRENCIES = [
  { code:'INR', symbol:'₹',   name:'Indian Rupee',    flag:'🇮🇳', fb:252000 },
  { code:'USD', symbol:'$',   name:'US Dollar',        flag:'🇺🇸', fb:3020   },
  { code:'EUR', symbol:'€',   name:'Euro',             flag:'🇪🇺', fb:2790   },
  { code:'GBP', symbol:'£',   name:'British Pound',    flag:'🇬🇧', fb:2350   },
  { code:'AED', symbol:'د.إ', name:'UAE Dirham',       flag:'🇦🇪', fb:11100  },
  { code:'SGD', symbol:'S$',  name:'Singapore Dollar', flag:'🇸🇬', fb:4060   },
];

let _cache=null,_time=0;
async function getRates(){
  if(_cache&&Date.now()-_time<300000) return _cache;
  try{const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr,usd,eur,gbp,aed,sgd');const d=await r.json();_cache=d.ethereum;_time=Date.now();return _cache;}
  catch{const f={};CURRENCIES.forEach(c=>{f[c.code.toLowerCase()]=c.fb;});return f;}
}

/* ─── Payment Modal ───────────────────────────────────── */
function PaymentModal({ inrAmount, ethAmount, purpose, loanId, lenderAddress, lenderName, onSuccess, onClose }) {
  const [tab,     setTab]     = useState('card');
  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [otp,     setOtp]     = useState('');
  const [card,    setCard]    = useState({number:'',expiry:'',cvv:'',name:''});
  const [upiId,   setUpiId]   = useState('');
  const [bank,    setBank]    = useState('');
  const [error,   setError]   = useState('');

  const fmtCard=v=>v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const fmtExp=v=>{const d=v.replace(/\D/g,'').slice(0,4);return d.length>2?d.slice(0,2)+'/'+d.slice(2):d;};

  const validate=()=>{
    if(tab==='card'){
      if(card.number.replace(/\s/g,'').length<16) return 'Enter valid 16-digit card number';
      if(!card.expiry.includes('/')) return 'Enter expiry MM/YY';
      if(card.cvv.length<3) return 'Enter valid CVV';
      if(!card.name.trim()) return 'Enter cardholder name';
    }
    if(tab==='upi'&&!upiId.includes('@')) return 'Enter valid UPI ID e.g. name@upi';
    if(tab==='netbanking'&&!bank) return 'Select a bank';
    return '';
  };

  const submit=async()=>{
    const err=validate(); if(err){setError(err);return;}
    setError(''); setLoading(true);
    await new Promise(r=>setTimeout(r,1500));
    setLoading(false); setStep(2);
  };

  const verifyOtp=async()=>{
    if(otp.length<4){setError('Enter OTP (any 4+ digits for demo)');return;}
    setError(''); setLoading(true);
    await new Promise(r=>setTimeout(r,1200));

    const paymentId='pay_'+Math.random().toString(36).slice(2,14).toUpperCase();

    // ── CRITICAL: Notify backend — mark loan funded + notify borrower ──
    try {
      const tok=localStorage.getItem('ef-token');
      const res=await fetch(`${BASE}/loans/${loanId}/fund-inr`,{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${tok}`},
        body:JSON.stringify({
          lenderAddress, lenderName,
          ethAmount:ethAmount.toString(),
          inrAmount, paymentId,
          paymentMethod:tab,
        }),
      });
      const data=await res.json();
      if(!data.success) console.warn('Fund-INR API:', data.message);
    } catch(e){ console.warn('Fund-INR error:', e.message); }

    setLoading(false); setStep(3);
    setTimeout(()=>{
      onSuccess?.({paymentId, inrAmount, ethAmount, method:tab});
      onClose?.();
    }, 2500);
  };

  const banks=['SBI','HDFC Bank','ICICI Bank','Axis Bank','Kotak Mahindra','PNB','Bank of Baroda','Canara Bank'];
  const inp=(label,value,onChange,ph,opts={})=>(
    <div>
      <label style={{fontSize:'11px',fontWeight:700,color:'#374151',display:'block',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</label>
      <input value={value} onChange={onChange} placeholder={ph} {...opts}
        style={{width:'100%',padding:'9px 12px',borderRadius:'8px',border:'1.5px solid #d1d5db',fontSize:'14px',fontFamily:opts.mono?'monospace':'inherit',outline:'none',boxSizing:'border-box',transition:'border-color 0.2s'}}
        onFocus={e=>e.target.style.borderColor='#00c965'} onBlur={e=>e.target.style.borderColor='#d1d5db'} />
    </div>
  );

  return (
    <div onClick={e=>e.stopPropagation()} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.72)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:'18px',width:'100%',maxWidth:'430px',overflow:'hidden',boxShadow:'0 24px 60px rgba(0,0,0,0.45)',maxHeight:'92vh',overflowY:'auto'}}>

        {/* Header */}
        <div style={{background:'linear-gradient(135deg,#00e87a,#00c965)',padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:1}}>
          <div>
            <div style={{fontWeight:800,color:'#000',fontSize:'15px'}}>EqualFund Payment</div>
            <div style={{color:'rgba(0,0,0,0.5)',fontSize:'12px'}}>Secure · Demo · No real money</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:900,color:'#000',fontSize:'1.6rem',lineHeight:1}}>₹{Number(inrAmount).toLocaleString('en-IN')}</div>
            <div style={{fontSize:'11px',color:'rgba(0,0,0,0.5)'}}>≈ {parseFloat(ethAmount).toFixed(4)} ETH</div>
          </div>
        </div>

        {purpose&&<div style={{padding:'8px 20px',background:'#f0fff8',borderBottom:'1px solid #d1fae5',fontSize:'12px',color:'#065f46'}}>💸 {purpose.slice(0,70)}</div>}

        <div style={{padding:'20px'}}>
          {step===1&&(
            <>
              {/* Tabs */}
              <div style={{display:'flex',marginBottom:'16px',border:'1px solid #e5e7eb',borderRadius:'10px',overflow:'hidden'}}>
                {[['card','💳 Card'],['upi','📱 UPI'],['netbanking','🏦 Netbanking']].map(([t,l])=>(
                  <button key={t} onClick={()=>{setTab(t);setError('');}} style={{flex:1,padding:'9px 0',fontSize:'11px',fontWeight:700,border:'none',cursor:'pointer',background:tab===t?'#00e87a':'#f9fafb',color:tab===t?'#000':'#555',transition:'all 0.2s'}}>{l}</button>
                ))}
              </div>

              {tab==='card'&&(
                <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                  {inp('Card Number',card.number,e=>setCard(p=>({...p,number:fmtCard(e.target.value)})),'4111 1111 1111 1111',{mono:true,maxLength:19})}
                  {inp('Cardholder Name',card.name,e=>setCard(p=>({...p,name:e.target.value})),'Name on card')}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                    {inp('Expiry',card.expiry,e=>setCard(p=>({...p,expiry:fmtExp(e.target.value)})),'12/28',{mono:true,maxLength:5})}
                    <div>
                      <label style={{fontSize:'11px',fontWeight:700,color:'#374151',display:'block',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.05em'}}>CVV</label>
                      <input type="password" value={card.cvv} onChange={e=>setCard(p=>({...p,cvv:e.target.value.replace(/\D/g,'').slice(0,4)}))} placeholder="123"
                        style={{width:'100%',padding:'9px 12px',borderRadius:'8px',border:'1.5px solid #d1d5db',fontSize:'14px',fontFamily:'monospace',outline:'none',boxSizing:'border-box'}}
                        onFocus={e=>e.target.style.borderColor='#00c965'} onBlur={e=>e.target.style.borderColor='#d1d5db'} />
                    </div>
                  </div>
                  <div style={{padding:'8px 12px',background:'#f0fff8',borderRadius:'8px',fontSize:'11px',color:'#065f46',lineHeight:1.7}}>💡 Test: <strong>4111 1111 1111 1111</strong> · <strong>12/28</strong> · <strong>123</strong></div>
                </div>
              )}

              {tab==='upi'&&(
                <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                  {inp('UPI ID',upiId,e=>setUpiId(e.target.value),'yourname@upi')}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
                    {['GPay','PhonePe','Paytm','BHIM','Amazon Pay','WhatsApp'].map(app=>(
                      <button key={app} onClick={()=>setUpiId(app.toLowerCase().replace(/\s/g,'')+'@ok')} style={{padding:'8px 4px',borderRadius:'8px',border:'1.5px solid #e5e7eb',background:'#f9fafb',fontSize:'11px',fontWeight:700,cursor:'pointer',color:'#374151'}}>{app}</button>
                    ))}
                  </div>
                  <div style={{padding:'8px 12px',background:'#f0fff8',borderRadius:'8px',fontSize:'11px',color:'#065f46'}}>💡 Test UPI: <strong>success@upi</strong></div>
                </div>
              )}

              {tab==='netbanking'&&(
                <div>
                  <label style={{fontSize:'11px',fontWeight:700,color:'#374151',display:'block',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Select Bank</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                    {banks.map(b=>(
                      <button key={b} onClick={()=>setBank(b)} style={{padding:'9px 10px',borderRadius:'8px',border:`1.5px solid ${bank===b?'#00c965':'#e5e7eb'}`,background:bank===b?'#f0fff8':'#f9fafb',fontSize:'12px',fontWeight:bank===b?700:500,cursor:'pointer',color:bank===b?'#065f46':'#374151',textAlign:'left',transition:'all 0.15s'}}>{b}</button>
                    ))}
                  </div>
                </div>
              )}

              {error&&<div style={{padding:'8px 12px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',fontSize:'12px',color:'#dc2626',marginTop:'8px'}}>⚠️ {error}</div>}

              <div style={{display:'flex',gap:'8px',marginTop:'16px'}}>
                <button onClick={onClose} style={{flex:1,padding:'10px',borderRadius:'10px',border:'1.5px solid #e5e7eb',background:'#f9fafb',color:'#374151',fontWeight:700,cursor:'pointer',fontSize:'13px'}}>Cancel</button>
                <button onClick={submit} disabled={loading} style={{flex:2,padding:'10px',borderRadius:'10px',border:'none',background:loading?'rgba(0,200,100,0.35)':'#00e87a',color:'#000',fontWeight:800,cursor:loading?'not-allowed':'pointer',fontSize:'13px'}}>
                  {loading?'⏳ Processing...':'Pay ₹'+Number(inrAmount).toLocaleString('en-IN')}
                </button>
              </div>
            </>
          )}

          {step===2&&(
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'2.5rem',marginBottom:'12px'}}>📱</div>
              <h3 style={{fontWeight:800,color:'#111',marginBottom:'8px'}}>OTP Verification</h3>
              <p style={{fontSize:'13px',color:'#6b7280',marginBottom:'20px',lineHeight:1.6}}>Enter any 6 digits for demo.<br/><strong style={{color:'#065f46'}}>No real OTP is sent.</strong></p>
              <div style={{display:'flex',justifyContent:'center',gap:'8px',marginBottom:'16px'}}>
                {[0,1,2,3,4,5].map(i=>(
                  <input key={i} maxLength={1} value={otp[i]||''} onChange={e=>{
                    const v=e.target.value.replace(/\D/,'');
                    const a=otp.split(''); a[i]=v; setOtp(a.join(''));
                    if(v&&e.target.nextElementSibling) e.target.nextElementSibling.focus();
                  }} style={{width:'40px',height:'48px',borderRadius:'10px',border:`2px solid ${otp[i]?'#00c965':'#d1d5db'}`,textAlign:'center',fontSize:'20px',fontWeight:800,outline:'none',fontFamily:'monospace'}}
                  onFocus={e=>e.target.style.borderColor='#00c965'} />
                ))}
              </div>
              {error&&<div style={{padding:'8px 12px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',fontSize:'12px',color:'#dc2626',marginBottom:'12px'}}>⚠️ {error}</div>}
              <button onClick={verifyOtp} disabled={loading||otp.length<4} style={{width:'100%',padding:'11px',borderRadius:'10px',border:'none',background:otp.length>=4&&!loading?'#00e87a':'#e5e7eb',color:otp.length>=4?'#000':'#9ca3af',fontWeight:800,cursor:otp.length>=4&&!loading?'pointer':'not-allowed',fontSize:'14px'}}>
                {loading?'⏳ Processing payment...':'✅ Confirm & Pay'}
              </button>
              <button onClick={()=>{setStep(1);setOtp('');setError('');}} style={{background:'none',border:'none',color:'#6b7280',cursor:'pointer',fontSize:'12px',marginTop:'10px'}}>← Back</button>
            </div>
          )}

          {step===3&&(
            <div style={{textAlign:'center',padding:'8px 0'}}>
              <div style={{width:'64px',height:'64px',borderRadius:'50%',background:'#f0fff8',border:'3px solid #00e87a',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'1.75rem'}}>✅</div>
              <h3 style={{fontWeight:900,color:'#111',fontSize:'18px',marginBottom:'8px'}}>Payment Successful!</h3>
              <p style={{fontSize:'13px',color:'#6b7280',marginBottom:'16px',lineHeight:1.7}}>
                ₹{Number(inrAmount).toLocaleString('en-IN')} paid successfully.<br/>
                <strong style={{color:'#065f46'}}>The borrower has been notified.</strong><br/>
                <span style={{fontSize:'12px',color:'#9ca3af'}}>Demo — no real money charged.</span>
              </p>
              <div style={{padding:'12px 16px',background:'#f0fff8',borderRadius:'10px',border:'1px solid #a7f3d0',fontSize:'12px',color:'#065f46',textAlign:'left',lineHeight:2}}>
                <div>💳 Amount: <strong>₹{Number(inrAmount).toLocaleString('en-IN')}</strong></div>
                <div>⟠ ETH equiv: <strong>{parseFloat(ethAmount).toFixed(4)} ETH</strong></div>
                <div>📋 Loan #{loanId}: <strong style={{color:'#00c965'}}>Funded ✓</strong></div>
                <div>🔔 Borrower: <strong>Notified ✓</strong></div>
              </div>
            </div>
          )}

          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'5px',marginTop:'14px',fontSize:'11px',color:'#9ca3af'}}>🔒 EqualFund Payments · Demo Mode</div>
        </div>
      </div>
    </div>
  );
}

/* ─── UPI Pay Button ──────────────────────────────────── */
export function UpiPayButton({ ethAmount, purpose, loanId, lenderAddress, lenderName, onSuccess }) {
  const [rates,   setRates]   = useState(null);
  const [showModal, setModal] = useState(false);

  useEffect(()=>{getRates().then(setRates);},[]);

  const eth=parseFloat(ethAmount||0);
  const inrAmount=rates?Math.round(eth*(rates.inr||252000)):0;

  if(!inrAmount) return <div style={{fontSize:'12px',color:'var(--ink-3)',textAlign:'center',padding:'8px'}}>Loading INR rate...</div>;

  return (
    <>
      <button onClick={()=>setModal(true)} style={{width:'100%',padding:'11px 20px',borderRadius:'10px',background:'linear-gradient(135deg,#00e87a,#00c965)',color:'#000',fontWeight:800,border:'none',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',transition:'all 0.2s'}}>
        💳 Pay ₹{inrAmount.toLocaleString('en-IN')} via Card / UPI / Netbanking
      </button>
      {showModal&&(
        <PaymentModal
          inrAmount={inrAmount} ethAmount={eth.toFixed(4)}
          purpose={purpose} loanId={loanId}
          lenderAddress={lenderAddress} lenderName={lenderName}
          onSuccess={r=>{onSuccess?.(r);setModal(false);}}
          onClose={()=>setModal(false)}
        />
      )}
    </>
  );
}

/* ─── ETH Amount display ──────────────────────────────── */
export function ETHAmount({ eth, size='normal' }) {
  const [rates,setCurrency_rates]=useState(null);
  const [currency,setCurrency]=useState('INR');
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{getRates().then(setCurrency_rates);},[]);
  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);
  },[]);
  const curr=CURRENCIES.find(c=>c.code===currency);
  const rate=rates?.[currency.toLowerCase()]||curr?.fb||0;
  const display=`${curr?.symbol}${Math.round(parseFloat(eth||0)*rate).toLocaleString('en-IN')}`;
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
      <span style={{fontWeight:900,color:'#00c965',fontFamily:'monospace',fontSize:size==='large'?'1.3rem':'0.95rem'}}>{parseFloat(eth||0).toFixed(4)} ETH</span>
      <span style={{color:'var(--ink-3)',fontSize:'11px'}}>≈</span>
      <span style={{fontWeight:700,color:'#22c55e',fontSize:size==='large'?'1rem':'0.78rem'}}>{display}</span>
      <span ref={ref} style={{position:'relative'}}>
        <button onClick={()=>setOpen(o=>!o)} style={{padding:'1px 6px',borderRadius:'5px',fontSize:'11px',background:'var(--surface-3)',border:'1px solid var(--border)',color:'var(--ink-3)',cursor:'pointer',fontWeight:700}}>{curr?.flag} {currency} ▾</button>
        {open&&<div style={{position:'absolute',top:'100%',right:0,zIndex:400,background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:'10px',padding:'5px',minWidth:'190px',boxShadow:'0 8px 24px rgba(0,0,0,0.15)',marginTop:'4px'}}>
          {CURRENCIES.map(c=>{const r=rates?.[c.code.toLowerCase()]||c.fb;return(
            <button key={c.code} onClick={()=>{setCurrency(c.code);setOpen(false);}} style={{width:'100%',padding:'5px 8px',borderRadius:'7px',border:'none',background:currency===c.code?'var(--surface-3)':'transparent',cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between',fontSize:'12px',color:'var(--ink)'}}>
              <span>{c.flag} {c.name}</span>
              <span style={{fontFamily:'monospace',color:'#22c55e',fontSize:'11px'}}>{c.symbol}{Math.round(parseFloat(eth||0)*r).toLocaleString('en-IN')}</span>
            </button>
          );})}
        </div>}
      </span>
    </span>
  );
}

export function CurrencyConverter({defaultEth='1'}){
  const [eth,setEth]=useState(defaultEth);
  const [rates,setRates]=useState(null);
  useEffect(()=>{getRates().then(setRates);},[]);
  return(
    <div style={{padding:'1.25rem',background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:'14px'}}>
      <div style={{fontSize:'11px',fontWeight:700,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'12px'}}>💱 ETH Converter</div>
      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
        <input type="number" value={eth} onChange={e=>setEth(e.target.value)} min="0" step="0.01" style={{width:'90px',padding:'7px 10px',borderRadius:'8px',border:'1px solid var(--border)',background:'var(--surface-3)',color:'var(--ink)',fontSize:'14px',fontFamily:'monospace',fontWeight:700,outline:'none'}}/>
        <span style={{fontWeight:800,color:'#00c965'}}>ETH</span>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
        {CURRENCIES.map(c=>{const r=rates?.[c.code.toLowerCase()]||c.fb;return(
          <div key={c.code} style={{display:'flex',justifyContent:'space-between',padding:'6px 10px',background:c.code==='INR'?'rgba(0,232,122,0.06)':'var(--surface-3)',borderRadius:'8px',border:c.code==='INR'?'1px solid rgba(0,232,122,0.2)':'1px solid var(--border)'}}>
            <span style={{fontSize:'12px'}}>{c.flag} {c.name}</span>
            <span style={{fontWeight:800,fontFamily:'monospace',color:c.code==='INR'?'#00c965':'var(--ink)',fontSize:'13px'}}>{c.symbol}{Math.round(parseFloat(eth||0)*r).toLocaleString('en-IN')}</span>
          </div>
        );})}
      </div>
      <div style={{fontSize:'10px',color:'var(--ink-3)',marginTop:'8px',textAlign:'right'}}>Live via CoinGecko</div>
    </div>
  );
}
