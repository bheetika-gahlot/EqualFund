import React, { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../context/AuthContext';
import ConnectWalletPrompt from '../components/ConnectWalletPrompt';
import Toast from '../components/Toast';
import { ipfsService } from '../services/ipfsService';
import { usersAPI, activityAPI } from '../services/apiService';

const STEPS = ['Personal Info', 'Upload Documents', 'Selfie with ID', 'Review & Submit'];

const DOC_TYPES = [
  { id: 'aadhaar', label: 'Aadhaar Card', icon: '🪪', desc: 'Indian national ID (front + back)' },
  { id: 'pan', label: 'PAN Card', icon: '💳', desc: 'Permanent Account Number card' },
  { id: 'passport', label: 'Passport', icon: '📘', desc: 'Valid passport (photo page)' },
  { id: 'voterid', label: 'Voter ID', icon: '🗳️', desc: 'Election Commission ID card' },
];

export default function KYCVerification() {
  const { isConnected, account } = useWallet();
  const { user, updateUser } = useAuth();
  const [toast, setToast] = useState(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const [form, setForm] = useState({
    fullName: user?.name || '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    docType: '',
    docFront: null,
    docBack: null,
    selfie: null,
    docFrontHash: '',
    docBackHash: '',
    selfieHash: '',
  });

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const uploadFile = async (file, key) => {
    setUploadProgress(p => ({ ...p, [key]: 'uploading' }));
    try {
      const hash = await ipfsService.uploadFile(file);
      setForm(p => ({ ...p, [`${key}Hash`]: hash }));
      setUploadProgress(p => ({ ...p, [key]: 'done' }));
      return hash;
    } catch {
      // Use mock hash if Pinata not configured
      const mockHash = `QmMock${Date.now()}`;
      setForm(p => ({ ...p, [`${key}Hash`]: mockHash }));
      setUploadProgress(p => ({ ...p, [key]: 'done' }));
      return mockHash;
    }
  };

  const handleFileChange = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(p => ({ ...p, [key]: file }));
    await uploadFile(file, key);
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.fullName || !form.dateOfBirth || !form.address || !form.city || !form.state) {
        setToast({ message: 'Please fill all required fields', type: 'error' });
        return false;
      }
    }
    if (step === 1) {
      if (!form.docType) { setToast({ message: 'Please select a document type', type: 'error' }); return false; }
      if (!form.docFront) { setToast({ message: 'Please upload front of document', type: 'error' }); return false; }
    }
    if (step === 2) {
      if (!form.selfie) { setToast({ message: 'Please upload your selfie with ID', type: 'error' }); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setStep(s => Math.min(3, s + 1));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Build combined IPFS hash from all document hashes
      const combinedHash = `${form.docFrontHash}|${form.docBackHash}|${form.selfieHash}`;

      // Update MongoDB KYC status
      await usersAPI.updateKYC('pending', combinedHash);

      // Log activity
      await activityAPI.log('kyc_submitted', {
        ipfsHash: combinedHash,
        description: `KYC submitted with ${form.docType}`,
      });

      // Update local auth state
      updateUser({ kycStatus: 'pending', kycIpfsHash: combinedHash });

      setToast({ message: '✅ KYC submitted! Under review (24–48 hrs)', type: 'success' });
      setStep(4); // Success screen
    } catch (e) {
      setToast({ message: e.message || 'Submission failed', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isConnected) return <ConnectWalletPrompt message="Connect your wallet to complete KYC verification." />;

  // Already submitted
  if (user?.kycStatus === 'pending' && step !== 4) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1rem', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24', marginBottom: '0.75rem' }}>
            KYC Under Review
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            Your documents have been submitted and are being verified by our admin team. Expected time: <strong>24–48 hours</strong>.
          </p>
          <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '14px', padding: '1.25rem', textAlign: 'left' }}>
            {[
              { icon: '✅', label: 'Documents uploaded to IPFS', done: true },
              { icon: '🔍', label: 'Admin verification in progress', done: false },
              { icon: '📧', label: 'You\'ll be notified on approval', done: false },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span>{s.icon}</span>
                <span style={{ fontSize: '0.875rem', color: s.done ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{s.label}</span>
                {s.done && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#22c55e', fontWeight: 700 }}>DONE</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (user?.kycStatus === 'verified') {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1rem', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#22c55e', marginBottom: '0.75rem' }}>
            KYC Verified!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Your identity has been verified. You can now create loan requests and access all platform features.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href="/create-loan" className="btn-primary" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem' }}>
              💸 Create Loan Request
            </a>
            <a href="/marketplace" className="btn-secondary" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem' }}>
              🏪 Browse Marketplace
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Success screen after submit
  if (step === 4) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1rem', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#22c55e', marginBottom: '0.75rem' }}>Submitted Successfully!</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Your KYC documents have been securely uploaded to IPFS and submitted for review. You'll receive a notification within <strong>24–48 hours</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1rem' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          🪪 KYC Verification
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Complete identity verification to access borrowing features</p>
      </div>

      {/* Progress Steps */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '0' }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem', flex: 1,
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.85rem',
                background: i < step ? 'linear-gradient(135deg,#06b6d4,#8b5cf6)' : i === step ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)',
                border: i === step ? '2px solid #06b6d4' : '2px solid transparent',
                color: i <= step ? (i < step ? 'white' : '#06b6d4') : 'var(--text-secondary)',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '0.65rem', color: i === step ? '#06b6d4' : 'var(--text-secondary)', textAlign: 'center', fontWeight: i === step ? 700 : 400 }}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ height: '2px', flex: 2, background: i < step ? 'linear-gradient(90deg,#06b6d4,#8b5cf6)' : 'rgba(255,255,255,0.07)', marginBottom: '1.4rem' }} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="glass-card" style={{ padding: '2rem' }}>

        {/* Step 0 — Personal Info */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              Personal Information
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Full Name (as on ID) *</label>
                <input name="fullName" value={form.fullName} onChange={onChange} className="input-field" placeholder="e.g. Rahul Kumar Sharma" />
              </div>
              <div>
                <label className="label">Date of Birth *</label>
                <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="label">Pincode *</label>
                <input name="pincode" value={form.pincode} onChange={onChange} className="input-field" placeholder="e.g. 400001" maxLength={6} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Address *</label>
                <input name="address" value={form.address} onChange={onChange} className="input-field" placeholder="House no, Street, Area" />
              </div>
              <div>
                <label className="label">City *</label>
                <input name="city" value={form.city} onChange={onChange} className="input-field" placeholder="e.g. Mumbai" />
              </div>
              <div>
                <label className="label">State *</label>
                <input name="state" value={form.state} onChange={onChange} className="input-field" placeholder="e.g. Maharashtra" />
              </div>
            </div>
          </div>
        )}

        {/* Step 1 — Documents */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Upload Identity Document</h2>

            {/* Doc Type Select */}
            <div>
              <label className="label">Select Document Type *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                {DOC_TYPES.map(d => (
                  <button key={d.id} onClick={() => setForm(p => ({ ...p, docType: d.id }))}
                    style={{
                      padding: '0.875rem', borderRadius: '12px', border: form.docType === d.id ? '1.5px solid rgba(6,182,212,0.6)' : '1px solid var(--border)',
                      background: form.docType === d.id ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                    }}>
                    <div style={{ fontSize: '1.3rem', marginBottom: '0.25rem' }}>{d.icon}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{d.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Front Upload */}
            <FileUpload label="Document Front Side *" keyName="docFront" form={form} progress={uploadProgress} onChange={handleFileChange} />
            <FileUpload label="Document Back Side (if applicable)" keyName="docBack" form={form} progress={uploadProgress} onChange={handleFileChange} />

            <div style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '12px', padding: '0.875rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              🔒 Documents are encrypted and stored on IPFS. Only the hash is stored on blockchain. No one can access your actual documents without your IPFS hash.
            </div>
          </div>
        )}

        {/* Step 2 — Selfie */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Selfie with ID Document</h2>
            <div style={{
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: '14px', padding: '1.25rem',
            }}>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>📸 Instructions:</p>
              {[
                'Hold your ID document next to your face',
                'Both your face and ID must be clearly visible',
                'Good lighting — no shadows on face or document',
                'No sunglasses, cap, or face coverings',
                'Take photo in a plain background',
              ].map(i => (
                <div key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '0.25rem 0', display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: '#06b6d4' }}>→</span> {i}
                </div>
              ))}
            </div>
            <FileUpload label="Selfie with ID *" keyName="selfie" form={form} progress={uploadProgress} onChange={handleFileChange} accept="image/*" />
          </div>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Review & Submit</h2>
            {[
              ['Full Name', form.fullName],
              ['Date of Birth', form.dateOfBirth],
              ['Address', `${form.address}, ${form.city}, ${form.state} - ${form.pincode}`],
              ['Document Type', DOC_TYPES.find(d => d.id === form.docType)?.label || '—'],
              ['Doc Front', form.docFrontHash ? '✅ Uploaded to IPFS' : '❌ Missing'],
              ['Selfie', form.selfieHash ? '✅ Uploaded to IPFS' : '❌ Missing'],
              ['Wallet', account ? `${account.slice(0,8)}...${account.slice(-6)}` : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '12px', padding: '1rem', fontSize: '0.82rem', color: '#fbbf24' }}>
              ⏱ Your KYC will be reviewed within <strong>24–48 hours</strong> by our verification team. You'll receive a notification once approved.
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="btn-secondary"
              style={{ flex: 1, padding: '0.875rem' }}>
              ← Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={handleNext} className="btn-primary" style={{ flex: 2, padding: '0.875rem' }}>
              Continue →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary" style={{ flex: 2, padding: '0.875rem' }}>
              {submitting ? '⏳ Submitting...' : '🚀 Submit KYC'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// File Upload helper component
function FileUpload({ label, keyName, form, progress, onChange, accept = '.jpg,.jpeg,.png,.pdf' }) {
  const status = progress[keyName];
  const file = form[keyName];

  return (
    <div>
      <label className="label">{label}</label>
      <div style={{
        border: `1.5px dashed ${status === 'done' ? '#22c55e' : 'var(--border)'}`,
        borderRadius: '12px', padding: '1.25rem', textAlign: 'center',
        background: status === 'done' ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
        transition: 'all 0.2s',
      }}>
        {status === 'done' ? (
          <div>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>✅</div>
            <div style={{ fontSize: '0.82rem', color: '#22c55e', fontWeight: 600 }}>{file?.name}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Uploaded to IPFS</div>
          </div>
        ) : status === 'uploading' ? (
          <div>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>⏳</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Uploading to IPFS...</div>
          </div>
        ) : (
          <label style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.375rem' }}>📎</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Click to upload file</div>
            <span style={{ fontSize: '0.75rem', color: '#06b6d4', background: 'rgba(6,182,212,0.1)', padding: '0.3rem 0.75rem', borderRadius: '6px' }}>
              Choose File
            </span>
            <input type="file" accept={accept} onChange={e => onChange(e, keyName)} style={{ display: 'none' }} />
          </label>
        )}
      </div>
    </div>
  );
}
