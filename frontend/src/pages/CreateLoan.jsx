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
  { value: 'education', label: '🎓 Education',  desc: 'Tuition, courses, books'     },
  { value: 'medical',   label: '🏥 Medical',    desc: 'Treatment, surgery, medicine' },
  { value: 'business',  label: '💼 Business',   desc: 'Startup, expansion, stock'    },
  { value: 'emergency', label: '🚨 Emergency',  desc: 'Urgent personal crisis'       },
  { value: 'housing',   label: '🏠 Housing',    desc: 'Rent, repairs, deposits'      },
  { value: 'other',     label: '📌 Other',      desc: 'Any other purpose'            },
];

const DURATIONS = [7, 14, 30, 60, 90, 180];

export default function CreateLoan() {
  const { isConnected, account } = useWallet();
  const { loading, error, execute, contractService, setError } = useContract();
  const navigate = useNavigate();
  const [toast, setToast]           = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docHash, setDocHash]       = useState('');
  const [docName, setDocName]       = useState('');
  const [step, setStep]             = useState(1); // 1=details, 2=collateral, 3=review

  const [form, setForm] = useState({
    amount:           '',
    interestRate:     '',
    duration:         '',
    category:         '',
    purpose:          '',
    collateralType:   'none',  // 'none' | 'eth'
    collateralAmount: '',
  });

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError?.(null); };
  const totalRepay  = form.amount && form.interestRate ? (parseFloat(form.amount) * (1 + parseFloat(form.interestRate) / 100)).toFixed(4) : '—';
  const collNeeded  = form.amount ? (parseFloat(form.amount) * 1.5).toFixed(4) : '0';
  const isSecured   = form.collateralType === 'eth';

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const hash = await ipfsService.uploadFile(file);
      setDocHash(hash); setDocName(file.name);
      setToast({ message: `✅ "${file.name}" uploaded to IPFS!`, type: 'success' });
    } catch {
      setDocHash('QmDocDemo123'); setDocName(file.name);
      setToast({ message: 'Using demo hash (Pinata not configured)', type: 'error' });
    } finally { setUploadingDoc(false); }
  };

  const handleSubmit = async () => {
    if (!form.amount || !form.interestRate || !form.duration || !form.category || !form.purpose?.trim() || form.purpose.trim().length < 10) {
      setError('Please fill all fields. Purpose needs at least 10 characters.'); return;
    }

    setToast({ message: '⏳ Confirm in MetaMask...', type: 'loading' });
    try {
      const metaHash     = docHash || 'QmEqualFundKYC';
      const interestRate = parseFloat(form.interestRate);

      const receipt = await execute(
        contractService.createLoan.bind(contractService),
        form.amount, interestRate, parseInt(form.duration), metaHash
      );

      // Get loanId from contract
      let loanId = null;
      try {
        const count = await contractService.contract.loanCounter();
        loanId = Number(count);
      } catch {
        try {
          const count2 = await contractService.contract.loanCount?.();
          loanId = count2 ? Number(count2) : 1;
        } catch { loanId = Date.now(); }
      }

      // Log + notify
      await activityAPI.log('loan_created', { amount: form.amount, txHash: receipt?.hash, description: `[${form.category}] ${form.purpose}` });
      await notificationsAPI.create(
        `💸 Loan #${loanId} Created!`,
        `Your ${form.category} loan for ${form.amount} ETH at ${form.interestRate}% is now live on the marketplace.`,
        'loan_created', null, receipt?.hash, form.amount
      );

      // Save to MongoDB with collateral info
      await saveLoanToMongoDB({
        id: loanId, borrower: account, amount: form.amount,
        interestRate, duration: parseInt(form.duration),
        purpose: form.purpose, category: form.category,
        ipfsHash: metaHash,
        collateralType:   form.collateralType,
        collateralAmount: isSecured ? collNeeded : '0',
      });

      setToast({ message: `✅ Loan #${loanId} created!`, type: 'success', txHash: receipt?.hash });
      setTimeout(() => navigate('/borrow'), 2000);
    } catch (e) {
      setToast({ message: e.message || 'Transaction failed', type: 'error' });
    }
  };

  if (!isConnected) return <ConnectWalletPrompt message="Connect your wallet to create a loan request." />;

  return (
    <KYCGate action="create loan requests">
      <div className="page" style={{ position: 'relative', minHeight: '100vh' }}>
        <GeoBg />
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}

        <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '720px' }}>
          <h1 style={{ fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>Create Loan Request</h1>
          <p style={{ color: 'var(--ink-3)', fontSize: '14px', marginBottom: '2rem' }}>Request a loan and let global lenders fund it on-chain</p>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', padding: '1rem 1.25rem', background: 'var(--surface-3)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            {[{ n: 1, l: 'Loan Details' }, { n: 2, l: 'Collateral' }, { n: 3, l: 'Review & Submit' }].map((s, i) => (
              <React.Fragment key={s.n}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0, background: step === s.n ? 'var(--ink)' : step > s.n ? 'var(--mint)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: step >= s.n ? (step > s.n ? '#000' : 'var(--card-bg)') : 'var(--ink-3)', cursor: step > s.n ? 'pointer' : 'default', transition: 'all 0.2s' }} onClick={() => step > s.n && setStep(s.n)}>
                    {step > s.n ? '✓' : s.n}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: step === s.n ? 'var(--ink)' : 'var(--ink-3)' }}>{s.l}</span>
                </div>
                {i < 2 && <div style={{ width: '24px', height: '1px', background: step > s.n ? 'var(--mint)' : 'var(--border)', flexShrink: 0, alignSelf: 'center' }} />}
              </React.Fragment>
            ))}
          </div>

          <div className="card" style={{ padding: '2rem' }}>

            {/* ── STEP 1: Loan Details ── */}
            {step === 1 && (
              <div>
                {/* Category */}
                <div style={{ marginBottom: '1.75rem' }}>
                  <label className="lbl">Loan Category *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
                    {CATEGORIES.map(cat => (
                      <button key={cat.value} onClick={() => set('category', cat.value)}
                        style={{ padding: '0.75rem', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', border: form.category === cat.value ? '2px solid var(--mint)' : '1px solid var(--border)', background: form.category === cat.value ? 'var(--mint-pale)' : 'var(--surface-3)' }}>
                        <div style={{ fontSize: '1rem', marginBottom: '3px' }}>{cat.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>{cat.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purpose */}
                <div style={{ marginBottom: '1.75rem' }}>
                  <label className="lbl">Why do you need this loan? *</label>
                  <textarea value={form.purpose} onChange={e => set('purpose', e.target.value)} rows={3}
                    className="input-f" placeholder="Explain your situation in detail (min 10 characters)..."
                    style={{ resize: 'vertical', lineHeight: 1.6 }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: form.purpose.length >= 10 ? 'var(--mint-dim)' : 'var(--ink-3)', marginTop: '4px' }}>
                    {form.purpose.length} chars
                  </div>
                </div>

                {/* Amount + Rate */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>
                  <div>
                    <label className="lbl">Loan Amount (ETH) *</label>
                    <input type="number" step="0.001" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} className="input-f" placeholder="e.g. 0.5" />
                  </div>
                  <div>
                    <label className="lbl">Interest Rate (%) *</label>
                    <input type="number" step="0.5" min="0" max="50" value={form.interestRate} onChange={e => set('interestRate', e.target.value)} className="input-f" placeholder="e.g. 5" />
                    <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '4px' }}>Enter 5 for 5%</div>
                  </div>
                </div>

                {/* Duration */}
                <div style={{ marginBottom: '1.75rem' }}>
                  <label className="lbl">Duration (days) *</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {DURATIONS.map(d => (
                      <button key={d} onClick={() => set('duration', String(d))}
                        style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', border: form.duration === String(d) ? '2px solid var(--mint)' : '1px solid var(--border)', background: form.duration === String(d) ? 'var(--mint-pale)' : 'var(--surface-3)', color: form.duration === String(d) ? 'var(--mint-dim)' : 'var(--ink-3)' }}>
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                {/* Document */}
                <div style={{ marginBottom: '1.75rem' }}>
                  <label className="lbl">Supporting Document (optional)</label>
                  <div style={{ border: '1.5px dashed var(--border)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center', background: 'var(--surface-3)' }}>
                    {docHash ? (
                      <div>
                        <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>✅</div>
                        <div style={{ fontSize: '13px', color: 'var(--mint-dim)', fontWeight: 600 }}>{docName}</div>
                        <button onClick={() => { setDocHash(''); setDocName(''); }} style={{ marginTop: '6px', fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                      </div>
                    ) : (
                      <label style={{ cursor: 'pointer' }}>
                        <div style={{ fontSize: '1.75rem', marginBottom: '6px' }}>📎</div>
                        <div style={{ fontSize: '13px', color: 'var(--ink-3)', marginBottom: '10px' }}>Upload proof (medical bill, admission letter, etc.)</div>
                        <span style={{ padding: '6px 16px', background: 'var(--mint-pale)', border: '1px solid rgba(0,232,122,0.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--mint-dim)', fontWeight: 700 }}>
                          {uploadingDoc ? '⏳ Uploading to IPFS...' : '📤 Choose File'}
                        </span>
                        <input type="file" onChange={handleDocUpload} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" disabled={uploadingDoc} />
                      </label>
                    )}
                  </div>
                </div>

                {error && <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#ef4444', fontSize: '13px', marginBottom: '1rem' }}>⚠️ {error}</div>}
                <button onClick={() => setStep(2)} disabled={!form.amount || !form.interestRate || !form.duration || !form.category || form.purpose.length < 10}
                  className="btn btn-dark" style={{ width: '100%', padding: '0.875rem', justifyContent: 'center' }}>
                  Next: Choose Collateral →
                </button>
              </div>
            )}

            {/* ── STEP 2: Collateral ── */}
            {step === 2 && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '0.5rem' }}>Choose Collateral Type</h3>
                <p style={{ fontSize: '13px', color: 'var(--ink-3)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  Secured loans (with ETH collateral) are more trusted by lenders and get funded faster with lower interest.
                </p>

                <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                  {/* Unsecured */}
                  <button onClick={() => set('collateralType', 'none')}
                    style={{ padding: '1.25rem', borderRadius: '12px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', border: form.collateralType === 'none' ? '2px solid var(--border-2)' : '1px solid var(--border)', background: form.collateralType === 'none' ? 'var(--surface-3)' : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.5rem' }}>📋</span>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '14px' }}>Unsecured Loan (KYC Only)</div>
                        <div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>No collateral required · Higher interest rates</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-3)', lineHeight: 1.6, padding: '8px 10px', background: 'rgba(245,158,11,0.06)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.15)' }}>
                      ⚠️ Lenders have less protection · Default severely impacts credit score · Account blocked for 30+ days if overdue
                    </div>
                  </button>

                  {/* ETH Collateral */}
                  <button onClick={() => set('collateralType', 'eth')}
                    style={{ padding: '1.25rem', borderRadius: '12px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', border: form.collateralType === 'eth' ? '2px solid var(--mint)' : '1px solid var(--border)', background: form.collateralType === 'eth' ? 'var(--mint-pale)' : 'transparent', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '10px', right: '12px', fontSize: '11px', fontWeight: 800, color: 'var(--mint-dim)', background: 'rgba(0,232,122,0.12)', padding: '2px 8px', borderRadius: '99px' }}>RECOMMENDED</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.5rem' }}>⟠</span>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '14px' }}>ETH Collateral (Secured)</div>
                        <div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>Lock 150% ETH · Auto-liquidated on default</div>
                      </div>
                    </div>
                    {form.amount && (
                      <div style={{ fontSize: '13px', color: 'var(--mint-dim)', fontWeight: 700, marginBottom: '8px' }}>
                        Required deposit: {collNeeded} ETH (150% of {form.amount} ETH)
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: 'var(--ink-3)', lineHeight: 1.6, padding: '8px 10px', background: 'rgba(0,232,122,0.06)', borderRadius: '8px', border: '1px solid rgba(0,232,122,0.15)' }}>
                      ✅ Lower interest rates · Higher funding success rate · Collateral returned on full repayment<br />
                      ⚠️ Collateral liquidated and distributed to lenders if you default
                    </div>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setStep(1)} className="btn btn-out" style={{ flex: 1, padding: '0.875rem', justifyContent: 'center' }}>← Back</button>
                  <button onClick={() => setStep(3)} className="btn btn-dark" style={{ flex: 2, padding: '0.875rem', justifyContent: 'center' }}>Next: Review →</button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Review & Submit ── */}
            {step === 3 && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '1.25rem' }}>📋 Review Your Loan Request</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                  {[
                    ['Category',    CATEGORIES.find(c => c.value === form.category)?.label || '—'],
                    ['Amount',      `${form.amount} ETH`],
                    ['Interest',    `${form.interestRate}%`],
                    ['Duration',    `${form.duration} days`],
                    ['Total Repay', `${totalRepay} ETH`],
                    ['Collateral',  isSecured ? `⟠ ${collNeeded} ETH (150%)` : '❌ None (Unsecured)'],
                    ['Document',    docName || 'None uploaded'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-3)', borderRadius: '8px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--ink-3)', fontWeight: 600 }}>{k}</span>
                      <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: '13px', color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: '1.25rem', padding: '10px 12px', background: 'rgba(0,232,122,0.05)', borderRadius: '8px', border: '1px solid rgba(0,232,122,0.15)' }}>
                  <strong>Purpose:</strong> "{form.purpose}"
                </p>

                {isSecured && (
                  <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', fontSize: '12px', color: '#f59e0b', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                    ⚠️ <strong>Important:</strong> By choosing ETH collateral, you agree to lock {collNeeded} ETH. This will be added to your MetaMask transaction. If you default, this collateral will be liquidated.
                  </div>
                )}

                {error && <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#ef4444', fontSize: '13px', marginBottom: '1rem' }}>⚠️ {error}</div>}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setStep(2)} className="btn btn-out" style={{ flex: 1, padding: '0.875rem', justifyContent: 'center' }}>← Back</button>
                  <button onClick={handleSubmit} disabled={loading} className="btn btn-mint" style={{ flex: 2, padding: '0.875rem', justifyContent: 'center', color: '#000000' }}>
                    {loading ? '⏳ Submitting...' : '🚀 Submit Loan Request'}
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
