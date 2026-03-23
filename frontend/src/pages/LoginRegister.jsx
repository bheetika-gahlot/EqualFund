import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginRegister() {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'borrower' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const onChange = e => { setForm(p => ({ ...p, [e.target.name]: e.target.value })); setError(''); };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'login') {
        if (!form.email || !form.password) { setError('Please fill in all fields'); setLoading(false); return; }
        await login(form.email, form.password);
      } else {
        if (!form.name || !form.email || !form.password) { setError('Please fill in all fields'); setLoading(false); return; }
        if (form.password !== form.confirm) { setError('Passwords do not match'); setLoading(false); return; }
        if (form.password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
        await register(form.name, form.email, form.password, form.role);
      }
      navigate('/');
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-float" style={{animationDelay:'1.5s'}} />
      </div>

      <div className="w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#06b6d4,#8b5cf6)'}}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-2xl font-bold gradient-text">EqualFund</span>
          </div>
          <p style={{color:'var(--text-secondary)',fontSize:'0.9rem'}}>Decentralized P2P Lending Platform</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          {/* Tabs */}
          <div className="flex gap-1 p-1 mb-6 rounded-xl" style={{background:'rgba(255,255,255,0.04)'}}>
            {['login','register'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={tab === t
                  ? {background:'linear-gradient(135deg,#06b6d4,#8b5cf6)', color:'white'}
                  : {color:'var(--text-secondary)'}}>
                {t === 'login' ? '🔐 Login' : '✨ Register'}
              </button>
            ))}
          </div>

          {/* Form */}
          <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            {tab === 'register' && (
              <div className="animate-fade-in-up stagger-1">
                <label className="label">Full Name</label>
                <input name="name" value={form.name} onChange={onChange} className="input-field" placeholder="John Doe" />
              </div>
            )}

            <div className={tab === 'register' ? 'animate-fade-in-up stagger-2' : ''}>
              <label className="label">Email Address</label>
              <input name="email" type="email" value={form.email} onChange={onChange} className="input-field" placeholder="you@example.com" />
            </div>

            <div className={tab === 'register' ? 'animate-fade-in-up stagger-3' : ''}>
              <label className="label">Password</label>
              <input name="password" type="password" value={form.password} onChange={onChange} className="input-field" placeholder="••••••••" />
            </div>

            {tab === 'register' && (
              <>
                <div className="animate-fade-in-up stagger-4">
                  <label className="label">Confirm Password</label>
                  <input name="confirm" type="password" value={form.confirm} onChange={onChange} className="input-field" placeholder="••••••••" />
                </div>
                <div className="animate-fade-in-up stagger-4">
                  <label className="label">I want to</label>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    {[
                      { val: 'borrower', icon: '💸', label: 'Borrow Funds' },
                      { val: 'lender', icon: '📈', label: 'Lend & Earn' },
                    ].map(opt => (
                      <button key={opt.val} onClick={() => setForm(p => ({ ...p, role: opt.val }))}
                        className="p-3 rounded-xl border text-sm font-medium transition-all duration-200 text-left"
                        style={form.role === opt.val
                          ? {background:'rgba(6,182,212,0.12)', borderColor:'rgba(6,182,212,0.4)', color:'#22d3ee'}
                          : {background:'rgba(255,255,255,0.03)', borderColor:'var(--border)', color:'var(--text-secondary)'}}>
                        <div className="text-xl mb-1">{opt.icon}</div>
                        <div>{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl text-sm animate-fade-in"
              style={{background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171'}}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full mt-6 py-3 text-base">
            <span>{loading ? '⏳ Please wait...' : tab === 'login' ? '🚀 Login to EqualFund' : '✨ Create Account'}</span>
          </button>

          {tab === 'login' && (
            <p className="text-center mt-4 text-sm" style={{color:'var(--text-secondary)'}}>
              Don't have an account?{' '}
              <button onClick={() => setTab('register')} style={{color:'#06b6d4', fontWeight:600}}>Register →</button>
            </p>
          )}
        </div>

        <p className="text-center mt-6 text-xs" style={{color:'var(--text-secondary)'}}>
          By continuing, you agree to connect your MetaMask wallet for blockchain transactions.
        </p>
      </div>
    </div>
  );
}