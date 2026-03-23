import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';
import api from '../services/apiService';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', secretKey: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleLogin = async () => {
    if (!form.email || !form.password || !form.secretKey) {
      setToast({ message: 'All 3 fields are required', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/admin/auth/login', {
        email: form.email,
        password: form.password,
        secretKey: form.secretKey,
      });

      if (res.data.token) {
        // Save admin credentials separately
        localStorage.setItem('ef-admin-token', res.data.token);
        localStorage.setItem('ef-admin-user', JSON.stringify(res.data.user));
        setToast({ message: '✅ Welcome Admin!', type: 'success' });
        // Hard redirect to admin page
        setTimeout(() => {
          window.location.href = '/admin';
        }, 800);
      } else {
        setToast({ message: 'Login failed — no token received', type: 'error' });
      }
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Login failed. Check credentials.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Allow Enter key to submit
  const handleKeyDown = e => { if (e.key === 'Enter') handleLogin(); };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '2rem',
      background: 'radial-gradient(ellipse at top, rgba(239,68,68,0.08) 0%, transparent 60%)',
    }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '20px', margin: '0 auto 1.25rem',
            background: 'linear-gradient(135deg,#ef4444,#991b1b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.25rem', boxShadow: '0 0 30px rgba(239,68,68,0.3)',
          }}>🔐</div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
            Admin Portal
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            EqualFund — Restricted Access
          </p>
        </div>

        <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(239,68,68,0.2)' }}>
          {/* Warning */}
          <div style={{
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.75rem',
            fontSize: '0.78rem', color: '#fca5a5',
          }}>
            ⚠️ Unauthorized access attempts are logged and reported.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="label">Admin Email</label>
              <input
                name="email" type="email" value={form.email}
                onChange={onChange} onKeyDown={handleKeyDown}
                className="input-field" placeholder="admin@equalfund.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                name="password" type="password" value={form.password}
                onChange={onChange} onKeyDown={handleKeyDown}
                className="input-field" placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="label">
                Admin Secret Key
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.5rem' }}>
                  (from your .env file)
                </span>
              </label>
              <input
                name="secretKey" type="password" value={form.secretKey}
                onChange={onChange} onKeyDown={handleKeyDown}
                className="input-field" placeholder="Your secret key"
              />
            </div>

            <button
              onClick={handleLogin} disabled={loading}
              style={{
                width: '100%', padding: '0.9rem',
                background: loading ? 'rgba(239,68,68,0.5)' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                border: 'none', borderRadius: '12px',
                color: 'white', fontWeight: 800, fontSize: '0.95rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 20px rgba(239,68,68,0.25)',
                transition: 'all 0.2s',
              }}>
              {loading ? '⏳ Verifying...' : '🔐 Login as Admin'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Not an admin?{' '}
          <a href="/login" style={{ color: '#06b6d4', textDecoration: 'none', fontWeight: 600 }}>
            Regular login →
          </a>
        </p>
      </div>
    </div>
  );
}
