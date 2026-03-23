import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Wrap any page with this to enforce KYC
// Usage: <KYCGate> <YourPage /> </KYCGate>
export default function KYCGate({ children, action = 'proceed' }) {
  const { user } = useAuth();
  const status = user?.kycStatus || 'none';

  if (status === 'verified') return children;

  return (
    <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1rem' }}>
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: '20px', padding: '3rem 2.5rem', textAlign: 'center',
      }}>

        {/* Icon */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '20px', margin: '0 auto 1.5rem',
          background: status === 'pending'
            ? 'linear-gradient(135deg,rgba(234,179,8,0.2),rgba(234,179,8,0.05))'
            : 'linear-gradient(135deg,rgba(239,68,68,0.2),rgba(239,68,68,0.05))',
          border: status === 'pending' ? '1px solid rgba(234,179,8,0.3)' : '1px solid rgba(239,68,68,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.5rem',
        }}>
          {status === 'pending' ? '⏳' : status === 'rejected' ? '❌' : '🔒'}
        </div>

        {/* Status Messages */}
        {status === 'none' && (
          <>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              KYC Verification Required
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              To {action}, you must first complete identity verification (KYC). This protects lenders and ensures a trustworthy platform.
            </p>
            <div style={{
              background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)',
              borderRadius: '14px', padding: '1.25rem', marginBottom: '2rem', textAlign: 'left',
            }}>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                📋 What you'll need:
              </p>
              {['Government ID (Aadhaar / PAN / Passport)', 'Selfie holding your ID', 'Address proof document', '~5 minutes to complete'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span style={{ color: '#22c55e' }}>✓</span> {item}
                </div>
              ))}
            </div>
            <div style={{
              background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)',
              borderRadius: '12px', padding: '0.875rem', marginBottom: '1.75rem',
              fontSize: '0.82rem', color: '#fbbf24',
            }}>
              ⏱ Verification takes <strong>24–48 hours</strong> after document submission.
            </div>
            <Link to="/kyc" style={{
              display: 'inline-block', padding: '0.875rem 2.5rem',
              background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)',
              borderRadius: '12px', color: 'white', fontWeight: 700,
              textDecoration: 'none', fontSize: '1rem',
              boxShadow: '0 0 20px rgba(6,182,212,0.3)',
            }}>
              🪪 Start KYC Verification →
            </Link>
          </>
        )}

        {status === 'pending' && (
          <>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24', marginBottom: '0.75rem' }}>
              KYC Under Review
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              Your documents have been submitted and are being reviewed by our team. You'll receive a notification once verified.
            </p>
            <div style={{
              background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)',
              borderRadius: '14px', padding: '1.5rem', marginBottom: '2rem',
            }}>
              {[
                { step: '✅', label: 'Documents Submitted', done: true },
                { step: '🔍', label: 'Admin Review (24–48 hrs)', done: false },
                { step: '📧', label: 'Notification Sent', done: false },
                { step: '✅', label: 'Access Granted', done: false },
              ].map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.875rem',
                  padding: '0.625rem 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>{s.step}</span>
                  <span style={{ fontSize: '0.875rem', color: s.done ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: s.done ? 600 : 400 }}>
                    {s.label}
                  </span>
                  {s.done && <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#22c55e', fontWeight: 700 }}>DONE</span>}
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Expected verification: <strong style={{ color: 'var(--text-primary)' }}>within 48 hours</strong>
            </p>
          </>
        )}

        {status === 'rejected' && (
          <>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f87171', marginBottom: '0.75rem' }}>
              KYC Rejected
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              Your KYC was rejected. Common reasons: blurry documents, mismatched information, or invalid ID. Please resubmit with clear documents.
            </p>
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '12px', padding: '1rem', marginBottom: '1.75rem',
              fontSize: '0.85rem', color: '#f87171',
            }}>
              ⚠️ Make sure documents are clear, valid, and match your registered name.
            </div>
            <Link to="/kyc" style={{
              display: 'inline-block', padding: '0.875rem 2.5rem',
              background: 'linear-gradient(135deg,#ef4444,#dc2626)',
              borderRadius: '12px', color: 'white', fontWeight: 700,
              textDecoration: 'none', fontSize: '1rem',
            }}>
              🔄 Resubmit KYC Documents →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
