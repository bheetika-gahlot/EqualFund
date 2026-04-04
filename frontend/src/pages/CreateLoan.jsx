import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import GeoBg from '../components/GeoBg';
import ConnectWalletPrompt from '../components/ConnectWalletPrompt';
import Toast from '../components/Toast';
import KYCGate from '../components/KYCGate';
import { activityAPI, notificationsAPI } from '../services/apiService';
import { ipfsService } from '../services/ipfsService';
import { saveLoanToMongoDB } from '../services/loanService';

const CATEGORIES = [
  { value:'education', label:'🎓 Education',  desc:'Tuition, courses, books'  },
  { value:'medical',   label:'🏥 Medical',    desc:'Treatment, surgery'        },
  { value:'business',  label:'💼 Business',   desc:'Startup, expansion'        },
  { value:'emergency', label:'🚨 Emergency',  desc:'Urgent personal crisis'    },
  { value:'housing',   label:'🏠 Housing',    desc:'Rent, repairs, deposits'   },
  { value:'other',     label:'📌 Other',      desc:'Any other purpose'         },
];

export default function CreateLoan() {
  const { isConnected, account } = useWallet();
  const { loading, error, execute, contractService, setError } = useContract();
  const navigate    = useNavigate();
  const [toast, setToast]       = useState(null);
  const [step, setStep]         = useState(1);
  const [docHash, setDocHash]   = useState('');
  const [docName, setDocName]   = useState('');
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    amount: '', interestRate: '', duration: '',
    category: '', purpose: '',
    collateralType: 'none',
  });

  const set   = (k, v) => { setForm(p => ({...p, [k]: v})); setError?.(null); };
  const repay = form.amount && form.interestRate
    ? (parseFloat(form.amount) * (1 + parseFloat(form.interestRate)/100)).toFixed(4)
    : '—';
  const collNeeded = form.amount ? (parseFloat(form.amount) * 1.5).toFixed(4) : '0';

  const uploadDoc = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const hash = await ipfsService.uploadFile(file);
      setDocHash(hash); setDocName(file.name);
      setToast({ message:`✅ "${file.name}" saved to IPFS!`, type:'success' });
    } catch {
      setDocHash('QmDemo'); setDocName(file.name);
      setToast({ message:'Demo mode — using placeholder hash', type:'error' });
    } finally { setUploading(false); }
  };

  const canStep2 = form.amount && form.interestRate && form.duration && form.category && form.purpose.trim().length >= 10;

  const submit = async () => {
    setToast({ message:'⏳ Confirm in MetaMask...', type:'loading' });
    try {
      const rate    = parseFloat(form.interestRate);
      const receipt = await execute(
        contractService.createLoan.bind(contractService),
        form.amount, rate, parseInt(form.duration), docHash || 'QmEqualFundKYC'
      );

      let loanId = 1;
      try { loanId = Number(await contractService.contract.loanCounter()); } catch {}

      await activityAPI.log('loan_created', { amount:form.amount, txHash:receipt?.hash, description:`[${form.category}] ${form.purpose}` });
      await notificationsAPI.create(
        `💸 Loan #${loanId} Created!`,
        `Your ${form.category} loan for ${form.amount} ETH at ${form.interestRate}% is live on the marketplace.`,
        'loan_created', null, receipt?.hash, form.amount
      );

      await saveLoanToMongoDB({
        id: loanId, borrower: account, amount: form.amount,
        interestRate: rate, duration: parseInt(form.duration),
        purpose: form.purpose, category: form.category,
        ipfsHash: docHash || 'QmEqualFundKYC',
        collateralType: form.collateralType,
        collateralAmount: form.collateralType === 'eth' ? collNeeded : '0',
      });

      setToast({ message:`✅ Loan #${loanId} created!`, type:'success', txHash:receipt?.hash });
      setTimeout(() => navigate('/borrow'), 2000);
    } catch (e) {
      setToast({ message: e.message || 'Transaction failed', type:'error' });
    }
  };

  if (!isConnected) return <ConnectWalletPrompt message="Connect wallet to create a loan request." />;

  return (
    <KYCGate action="create loan requests">
      <div className="page" style={{ position:'relative', minHeight:'100vh' }}>
        <GeoBg />
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        <div className="container" style={{ padding:'2.5rem 1.5rem', maxWidth:'700px' }}>

          <h1 style={{ fontSize:'clamp(1.75rem,4vw,2.5rem)', fontWeight:900, color:'var(--ink)', letterSpacing:'-0.04em', marginBottom:'6px' }}>Create Loan Request</h1>
          <p style={{ color:'var(--ink-3)', fontSize:'13px', marginBottom:'2rem' }}>Request a loan from global lenders via Ethereum smart contract</p>

          {/* Step bar */}
          <div style={{ display:'flex', alignItems:'center', gap:'4px', marginBottom:'2rem', padding:'1rem', background:'var(--surface-3)', borderRadius:'12px', border:'1px solid var(--border)' }}>
            {[{n:1,l:'Details'},{n:2,l:'Collateral'},{n:3,l:'Submit'}].map((s,i) => (
              <React.Fragment key={s.n}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', flex:1 }}>
                  <div style={{ width:'26px', height:'26px', borderRadius:'50%', background:step>s.n?'#00e87a':step===s.n?'var(--ink)':'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:800, color:step>s.n?'#000':step===s.n?'var(--card-bg)':'var(--ink-3)', cursor:step>s.n?'pointer':'default', transition:'all 0.2s', flexShrink:0 }} onClick={() => step>s.n && setStep(s.n)}>
                    {step>s.n?'✓':s.n}
                  </div>
                  <span style={{ fontSize:'12px', fontWeight:600, color:step===s.n?'var(--ink)':'var(--ink-3)', whiteSpace:'nowrap' }}>{s.l}</span>
                </div>
                {i<2 && <div style={{ flex:1, height:'1px', background:step>s.n?'#00e87a':'var(--border)', transition:'background 0.3s' }} />}
              </React.Fragment>
            ))}
          </div>

          <div className="card" style={{ padding:'2rem' }}>

            {/* ══ STEP 1 ══════════════════════════════════ */}
            {step===1 && (
              <div>
                {/* Category */}
                <label className="lbl" style={{ marginBottom:'8px', display:'block' }}>Category *</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'1.75rem' }}>
                  {CATEGORIES.map(c => (
                    <button key={c.value} onClick={() => set('category', c.value)}
                      style={{ padding:'0.75rem', borderRadius:'10px', cursor:'pointer', textAlign:'left', border:form.category===c.value?'2px solid #00e87a':'1px solid var(--border)', background:form.category===c.value?'rgba(0,232,122,0.08)':'var(--surface-3)', transition:'all 0.2s' }}>
                      <div style={{ fontSize:'1rem', marginBottom:'3px' }}>{c.label}</div>
                      <div style={{ fontSize:'11px', color:'var(--ink-3)' }}>{c.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Purpose */}
                <label className="lbl" style={{ marginBottom:'6px', display:'block' }}>Purpose * <span style={{ color:form.purpose.length>=10?'#00c965':'var(--ink-3)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>({form.purpose.length} chars)</span></label>
                <textarea value={form.purpose} onChange={e => set('purpose', e.target.value)} rows={3}
                  className="input-f" placeholder="Explain in detail why you need this loan (min 10 chars)..." style={{ marginBottom:'1.75rem', resize:'vertical', lineHeight:1.6 }} />

                {/* Amount + Rate */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1.75rem' }}>
                  <div>
                    <label className="lbl" style={{ marginBottom:'6px', display:'block' }}>Amount (ETH) *</label>
                    <input type="number" step="0.001" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} className="input-f" placeholder="e.g. 0.5" />
                  </div>
                  <div>
                    <label className="lbl" style={{ marginBottom:'6px', display:'block' }}>Interest Rate (%) *</label>
                    <input type="number" step="0.5" min="0" max="50" value={form.interestRate} onChange={e => set('interestRate', e.target.value)} className="input-f" placeholder="e.g. 5" />
                    <div style={{ fontSize:'11px', color:'var(--ink-3)', marginTop:'4px' }}>Enter 5 for 5%</div>
                  </div>
                </div>

                {/* Duration */}
                <label className="lbl" style={{ marginBottom:'8px', display:'block' }}>Duration (days) *</label>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'1.75rem' }}>
                  {[7,14,30,60,90,180].map(d => (
                    <button key={d} onClick={() => set('duration', String(d))}
                      style={{ padding:'6px 14px', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer', border:form.duration===String(d)?'2px solid #00e87a':'1px solid var(--border)', background:form.duration===String(d)?'rgba(0,232,122,0.08)':'var(--surface-3)', color:form.duration===String(d)?'#00c965':'var(--ink-3)', transition:'all 0.2s' }}>
                      {d}d
                    </button>
                  ))}
                </div>

                {/* Document */}
                <label className="lbl" style={{ marginBottom:'6px', display:'block' }}>Supporting Document (optional)</label>
                <div style={{ border:'1.5px dashed var(--border)', borderRadius:'12px', padding:'1.25rem', textAlign:'center', background:'var(--surface-3)', marginBottom:'1.5rem' }}>
                  {docHash ? (
                    <div>
                      <div style={{ fontSize:'1.5rem' }}>✅</div>
                      <div style={{ fontSize:'13px', color:'#00c965', fontWeight:600, margin:'4px 0' }}>{docName}</div>
                      <button onClick={() => {setDocHash('');setDocName('');}} style={{ fontSize:'12px', color:'#ef4444', background:'none', border:'none', cursor:'pointer' }}>Remove</button>
                    </div>
                  ) : (
                    <label style={{ cursor:'pointer' }}>
                      <div style={{ fontSize:'1.75rem', marginBottom:'6px' }}>📎</div>
                      <div style={{ fontSize:'13px', color:'var(--ink-3)', marginBottom:'10px' }}>Upload medical bill, admission letter, etc.</div>
                      <span style={{ padding:'6px 16px', background:'rgba(0,232,122,0.08)', border:'1px solid rgba(0,232,122,0.2)', borderRadius:'8px', fontSize:'12px', color:'#00c965', fontWeight:700 }}>
                        {uploading?'⏳ Uploading to IPFS...':'📤 Choose File'}
                      </span>
                      <input type="file" onChange={uploadDoc} style={{ display:'none' }} accept=".pdf,.jpg,.jpeg,.png" disabled={uploading} />
                    </label>
                  )}
                </div>

                {error && <div style={{ padding:'10px 12px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'10px', color:'#ef4444', fontSize:'13px', marginBottom:'1rem' }}>⚠️ {error}</div>}

                <button onClick={() => setStep(2)} disabled={!canStep2}
                  className="btn btn-dark" style={{ width:'100%', padding:'0.875rem', justifyContent:'center', opacity:canStep2?1:0.5 }}>
                  Next: Choose Collateral →
                </button>
              </div>
            )}

            {/* ══ STEP 2: Collateral ══════════════════════ */}
            {step===2 && (
              <div>
                <h3 style={{ fontWeight:800, color:'var(--ink)', marginBottom:'8px', fontSize:'1rem' }}>⟠ Choose Collateral</h3>
                <p style={{ fontSize:'13px', color:'var(--ink-3)', marginBottom:'1.5rem', lineHeight:1.65 }}>
                  Secured loans get funded faster and at lower interest rates because lenders have more protection.
                </p>

                <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'1.5rem' }}>
                  {/* Unsecured */}
                  <button onClick={() => set('collateralType','none')}
                    style={{ padding:'1.25rem', borderRadius:'12px', textAlign:'left', cursor:'pointer', border:form.collateralType==='none'?'2px solid var(--ink)':'1px solid var(--border)', background:form.collateralType==='none'?'var(--surface-3)':'transparent', transition:'all 0.2s' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                      <span style={{ fontSize:'1.5rem' }}>📋</span>
                      <div>
                        <div style={{ fontWeight:800, color:'var(--ink)', fontSize:'14px' }}>Unsecured (KYC Only)</div>
                        <div style={{ fontSize:'12px', color:'var(--ink-3)' }}>No collateral · Higher interest expected</div>
                      </div>
                    </div>
                    <div style={{ fontSize:'12px', padding:'8px 10px', background:'rgba(245,158,11,0.06)', borderRadius:'8px', border:'1px solid rgba(245,158,11,0.15)', color:'#f59e0b', lineHeight:1.6 }}>
                      ⚠️ Default = credit score penalty + 30-day account restriction
                    </div>
                  </button>

                  {/* ETH Collateral */}
                  <button onClick={() => set('collateralType','eth')}
                    style={{ padding:'1.25rem', borderRadius:'12px', textAlign:'left', cursor:'pointer', border:form.collateralType==='eth'?'2px solid #00e87a':'1px solid var(--border)', background:form.collateralType==='eth'?'rgba(0,232,122,0.05)':'transparent', transition:'all 0.2s', position:'relative' }}>
                    <div style={{ position:'absolute', top:'10px', right:'12px', fontSize:'11px', fontWeight:800, color:'#00c965', background:'rgba(0,232,122,0.1)', padding:'2px 8px', borderRadius:'99px' }}>RECOMMENDED</div>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                      <span style={{ fontSize:'1.5rem' }}>⟠</span>
                      <div>
                        <div style={{ fontWeight:800, color:'var(--ink)', fontSize:'14px' }}>ETH Collateral (Secured)</div>
                        <div style={{ fontSize:'12px', color:'var(--ink-3)' }}>Lock 150% of loan amount in ETH</div>
                      </div>
                    </div>
                    {form.amount && (
                      <div style={{ fontSize:'13px', fontWeight:700, color:'#00c965', marginBottom:'8px' }}>
                        Required: {collNeeded} ETH (for your {form.amount} ETH loan)
                      </div>
                    )}
                    <div style={{ fontSize:'12px', padding:'8px 10px', background:'rgba(0,232,122,0.05)', borderRadius:'8px', border:'1px solid rgba(0,232,122,0.15)', color:'#00c965', lineHeight:1.6 }}>
                      ✅ Lower interest · Higher funding rate · Collateral returned on repayment<br/>
                      ⚠️ Liquidated to lenders if you default
                    </div>
                  </button>
                </div>

                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => setStep(1)} className="btn btn-out" style={{ flex:1, padding:'0.875rem', justifyContent:'center' }}>← Back</button>
                  <button onClick={() => setStep(3)} className="btn btn-dark" style={{ flex:2, padding:'0.875rem', justifyContent:'center' }}>Next: Review →</button>
                </div>
              </div>
            )}

            {/* ══ STEP 3: Review ══════════════════════════ */}
            {step===3 && (
              <div>
                <h3 style={{ fontWeight:800, color:'var(--ink)', marginBottom:'1.25rem', fontSize:'1rem' }}>📋 Review Loan Request</h3>

                <div style={{ display:'flex', flexDirection:'column', gap:'7px', marginBottom:'1.25rem' }}>
                  {[
                    ['Category',   CATEGORIES.find(c=>c.value===form.category)?.label||'—'],
                    ['Amount',     `${form.amount} ETH`],
                    ['Interest',   `${form.interestRate}%`],
                    ['Duration',   `${form.duration} days`],
                    ['Total Repay',`${repay} ETH`],
                    ['Collateral', form.collateralType==='eth'?`⟠ ${collNeeded} ETH (150% secured)`:'❌ None (Unsecured)'],
                    ['Document',   docName||'None'],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'var(--surface-3)', borderRadius:'8px' }}>
                      <span style={{ fontSize:'13px', color:'var(--ink-3)', fontWeight:600 }}>{k}</span>
                      <span style={{ fontSize:'13px', color:'var(--ink)', fontWeight:700 }}>{v}</span>
                    </div>
                  ))}
                </div>

                <div style={{ padding:'10px 12px', background:'rgba(0,232,122,0.05)', borderRadius:'10px', border:'1px solid rgba(0,232,122,0.15)', fontSize:'13px', color:'var(--ink-3)', marginBottom:'1.25rem', lineHeight:1.6 }}>
                  <strong style={{ color:'var(--ink)' }}>Purpose:</strong> "{form.purpose}"
                </div>

                {form.collateralType==='eth' && (
                  <div style={{ padding:'10px 12px', background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'8px', fontSize:'12px', color:'#f59e0b', marginBottom:'1.25rem', lineHeight:1.6 }}>
                    ⚠️ By submitting, you agree to lock {collNeeded} ETH as collateral. This will be included in your MetaMask transaction. Defaulting results in liquidation.
                  </div>
                )}

                {error && <div style={{ padding:'10px 12px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'10px', color:'#ef4444', fontSize:'13px', marginBottom:'1rem' }}>⚠️ {error}</div>}

                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => setStep(2)} className="btn btn-out" style={{ flex:1, padding:'0.875rem', justifyContent:'center' }}>← Back</button>
                  <button onClick={submit} disabled={loading}
                    className="btn btn-mint" style={{ flex:2, padding:'0.875rem', justifyContent:'center', color:'#000000' }}>
                    {loading?'⏳ Submitting...':'🚀 Submit Loan Request'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </KYCGate>
  );
}
