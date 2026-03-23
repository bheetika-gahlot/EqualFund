import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import ConnectWalletPrompt from '../components/ConnectWalletPrompt';
import Toast from '../components/Toast';
import { activityAPI, notificationsAPI } from '../services/apiService';
import { ipfsService } from '../services/ipfsService';
import { saveLoanToMongoDB } from '../services/loanService';

const CATEGORIES = [
  { value: 'education', label: '🎓 Education', desc: 'Tuition, courses, books' },
  { value: 'medical', label: '🏥 Medical', desc: 'Treatment, surgery, medicine' },
  { value: 'business', label: '💼 Business', desc: 'Startup, expansion, inventory' },
  { value: 'emergency', label: '🚨 Emergency', desc: 'Urgent personal crisis' },
  { value: 'housing', label: '🏠 Housing', desc: 'Rent, repairs, deposits' },
  { value: 'other', label: '📌 Other', desc: 'Any other purpose' },
];

export default function CreateLoan() {
  const { isConnected, account } = useWallet();
  const { loading, error, execute, contractService, setError } = useContract();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docHash, setDocHash] = useState('');
  const [docName, setDocName] = useState('');

  const [form, setForm] = useState({
    amount: '',
    interestRate: '',
    duration: '',
    kycHash: 'QmDemo123456789',
    category: '',
    purpose: '',
  });

  const onChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError(null);
  };

  const repaymentEstimate = () => {
    if (!form.amount || !form.interestRate) return '—';
    const interest = parseFloat(form.amount) * (parseFloat(form.interestRate) / 100);
    return (parseFloat(form.amount) + interest).toFixed(4);
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const hash = await ipfsService.uploadFile(file);
      setDocHash(hash);
      setDocName(file.name);
      setToast({ message: `Document "${file.name}" uploaded to IPFS!`, type: 'success' });
    } catch (err) {
      setToast({ message: 'Document upload failed. Using demo hash.', type: 'error' });
      setDocHash('QmDocDemo123');
      setDocName(file.name);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.amount || !form.interestRate || !form.duration) {
      setError('Please fill in amount, interest rate and duration');
      return;
    }
    if (!form.category) {
      setError('Please select a loan category');
      return;
    }
    if (!form.purpose || form.purpose.trim().length < 20) {
      setError('Please describe your purpose in at least 20 characters');
      return;
    }

    setToast({ message: 'Waiting for MetaMask confirmation...', type: 'loading' });
    try {
      //const interestBps = Math.round(parseFloat(form.interestRate) * 100);
      const interestRate = parseFloat(form.interestRate);

      // Build enhanced KYC hash that includes category + purpose + doc
      const metaHash = docHash || form.kycHash;

      /* const receipt = await execute(
        contractService.createLoan.bind(contractService),
        form.amount,
        interestBps,
        parseInt(form.duration),
        metaHash
      ); */
      const receipt = await execute(
        contractService.createLoan.bind(contractService),
        form.amount,
        interestRate,       // ← send 8, not 800
        parseInt(form.duration),
        metaHash
  );

      // Store extended metadata in MongoDB via activity log
      await activityAPI.log('loan_created', {
        amount: form.amount,
        txHash: receipt?.hash,
        description: `[${form.category.toUpperCase()}] ${form.purpose}`,
      });

      await notificationsAPI.create(
        '💸 Loan Request Created!',
        `Your ${form.category} loan request for ${form.amount} ETH at ${form.interestRate}% interest has been submitted to the blockchain.`,
        'loan_created',
        null,
        receipt?.hash,
        form.amount
      );

         // Save to MongoDB so history persists across restarts
      await saveLoanToMongoDB({
        id:           receipt?.loanId || Date.now(), // get loanId from receipt
        borrower:     account,
        amount:       form.amount,
        interestRate: form.interestRate,
        duration:     parseInt(form.duration),
        purpose:      form.purpose,
        category:     form.category,
        ipfsHash:     metaHash,
      });

      setToast({ message: '✅ Loan created successfully!', type: 'success', txHash: receipt?.hash });
      setTimeout(() => navigate('/borrow'), 2000);
    } catch (e) {
      setToast({ message: e.message || 'Transaction failed', type: 'error' });
    }
  };

  if (!isConnected) return <ConnectWalletPrompt message="Connect your wallet to create a loan request." />;

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Create Loan Request
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Request a loan and let lenders or NGOs fund it on-chain</p>
      </div>

      <div className="glass-card" style={{ padding: '2rem' }}>

        {/* ── CATEGORY ── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label className="label">Loan Category *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '0.5rem' }}>
            {CATEGORIES.map(cat => (
              <button key={cat.value}
                onClick={() => setForm(p => ({ ...p, category: cat.value }))}
                style={{
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: form.category === cat.value ? '1.5px solid rgba(6,182,212,0.6)' : '1px solid var(--border)',
                  background: form.category === cat.value ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                }}>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{cat.label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{cat.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── PURPOSE ── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label className="label">Why do you need this loan? *</label>
          <textarea
            name="purpose"
            value={form.purpose}
            onChange={onChange}
            rows={4}
            className="input-field"
            placeholder="Explain your situation in detail. Lenders and NGOs are more likely to fund requests with clear, genuine explanations. E.g. 'I need funds for my daughter's school fees for the upcoming semester...'"
            style={{ resize: 'vertical', minHeight: '100px', lineHeight: 1.6 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Minimum 20 characters</span>
            <span style={{ fontSize: '0.72rem', color: form.purpose.length >= 20 ? '#22c55e' : 'var(--text-secondary)' }}>
              {form.purpose.length} chars
            </span>
          </div>
        </div>

        {/* ── AMOUNT + INTEREST ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>
          <div>
            <label className="label">Loan Amount (ETH) *</label>
            <input type="number" name="amount" step="0.001" min="0"
              value={form.amount} onChange={onChange} className="input-field" placeholder="e.g. 0.5" />
          </div>
          <div>
            <label className="label">Interest Rate (%) *</label>
            <input type="number" name="interestRate" step="0.5" min="0" max="50"
              value={form.interestRate} onChange={onChange} className="input-field" placeholder="e.g. 5" />
          </div>
        </div>

        {/* ── DURATION ── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label className="label">Loan Duration (days) *</label>
          <input type="number" name="duration" min="7" max="365"
            value={form.duration} onChange={onChange} className="input-field" placeholder="e.g. 30" />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {[7, 14, 30, 60, 90].map(d => (
              <button key={d} onClick={() => setForm(p => ({ ...p, duration: String(d) }))}
                style={{
                  padding: '0.3rem 0.875rem', borderRadius: '8px', fontSize: '0.75rem',
                  border: form.duration === String(d) ? '1px solid rgba(6,182,212,0.5)' : '1px solid var(--border)',
                  background: form.duration === String(d) ? 'rgba(6,182,212,0.12)' : 'transparent',
                  color: form.duration === String(d) ? '#22d3ee' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* ── SUPPORTING DOCUMENT ── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label className="label">Supporting Document (optional)</label>
          <div style={{
            border: '1.5px dashed var(--border)', borderRadius: '12px',
            padding: '1.25rem', textAlign: 'center', position: 'relative',
            background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s',
          }}>
            {docHash ? (
              <div>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</div>
                <div style={{ fontSize: '0.85rem', color: '#22c55e', fontWeight: 600 }}>{docName}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                  {docHash.slice(0, 20)}...
                </div>
                <button onClick={() => { setDocHash(''); setDocName(''); }}
                  style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📎</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Upload proof document (medical bill, admission letter, etc.)
                </p>
                <label style={{
                  display: 'inline-block', padding: '0.5rem 1.25rem',
                  background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', color: '#22d3ee',
                }}>
                  {uploadingDoc ? '⏳ Uploading to IPFS...' : '📤 Choose File'}
                  <input type="file" onChange={handleDocUpload} style={{ display: 'none' }}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" disabled={uploadingDoc} />
                </label>
              </div>
            )}
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.375rem' }}>
            Stored permanently on IPFS. Increases trust with lenders and NGOs.
          </p>
        </div>

        {/* ── SUMMARY ── */}
        {form.amount && form.interestRate && (
          <div style={{
            background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)',
            borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem',
          }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.875rem' }}>
              📊 Loan Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                ['Category', CATEGORIES.find(c => c.value === form.category)?.label || '—'],
                ['Loan Amount', `${form.amount} ETH`],
                ['Interest Rate', `${form.interestRate}%`],
                ['Duration', form.duration ? `${form.duration} days` : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Repayment</span>
                <span style={{ color: '#06b6d4', fontWeight: 800, fontFamily: 'monospace' }}>{repaymentEstimate()} ETH</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '0.875rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          className="btn-primary"
          style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 700 }}>
          {loading ? '⏳ Submitting to Blockchain...' : '🚀 Create Loan Request'}
        </button>
      </div>
    </div>
  );
}
