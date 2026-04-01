// Profile.jsx — redesigned with new design system
import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../context/AuthContext';
import GeoBg from '../components/GeoBg';
import Toast from '../components/Toast';
import api from '../services/apiService';

export default function Profile() {
  const { account, balance, isConnected } = useWallet();
  const { user } = useAuth();
  const [loans, setLoans]   = useState([]);
  const [toast, setToast]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm]     = useState({ name:'', bio:'', phone:'', country:'' });

  useEffect(() => {
    if (user) setForm({ name:user.name||'', bio:user.bio||'', phone:user.phone||'', country:user.country||'' });
  }, [user]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('ef-token');
        if (!token) return;
        const res = await api.get('/loans', { headers:{ Authorization:`Bearer ${token}` }});
        setLoans(res.data.loans || []);
      } catch {}
      finally { setLoading(false); }
    };
    fetchHistory();
  }, []);

  const saveProfile = async () => {
    try {
      const token = localStorage.getItem('ef-token');
      await api.put('/auth/profile', form, { headers:{ Authorization:`Bearer ${token}` }});
      setToast({ message:'✅ Profile updated!', type:'success' });
      setEditMode(false);
    } catch (e) {
      setToast({ message:'Failed: ' + e.message, type:'error' });
    }
  };

  const scoreColor = (s) => s>=750?'var(--mint-dim)':s>=650?'#06b6d4':s>=550?'#f59e0b':'#ef4444';
  const scorePct   = (s) => ((s-300)/550)*100;

  return (
    <div className="page" style={{ position:'relative', minHeight:'100vh' }}>
      <GeoBg />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="container" style={{ padding:'2.5rem 1.5rem' }}>
        <h1 style={{ fontSize:'clamp(1.75rem,4vw,2.5rem)', fontWeight:900, color:'var(--ink)', letterSpacing:'-0.04em', marginBottom:'2.5rem' }}>My Profile</h1>

        <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:'1.5rem', alignItems:'start' }}>

          {/* LEFT — Identity card */}
          <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

            {/* Avatar + info */}
            <div className="card" style={{ padding:'1.75rem', textAlign:'center' }}>
              {/* Avatar */}
              <div style={{ width:'72px', height:'72px', borderRadius:'18px', background:'var(--mint-pale)', border:'2px solid rgba(0,232,122,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.75rem', fontWeight:900, color:'var(--mint-dim)', margin:'0 auto 1rem' }}>
                {(user?.name||'?')[0].toUpperCase()}
              </div>
              <h2 style={{ fontSize:'1.1rem', fontWeight:900, color:'var(--ink)', marginBottom:'4px', letterSpacing:'-0.02em' }}>{user?.name || 'Anonymous'}</h2>
              <p style={{ fontSize:'12px', color:'var(--ink-3)', marginBottom:'12px' }}>{user?.email}</p>
              {user?.kycStatus === 'verified' && <span className="pill pill-mint" style={{ margin:'0 auto 12px', display:'inline-flex' }}>✅ KYC Verified</span>}
              <div style={{ fontFamily:'monospace', fontSize:'11px', color:'var(--ink-3)', background:'var(--surface-3)', padding:'6px 10px', borderRadius:'8px' }}>
                {account ? `${account.slice(0,10)}...${account.slice(-6)}` : 'No wallet linked'}
              </div>
            </div>

            {/* Credit score */}
            <div className="card" style={{ padding:'1.5rem' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'1rem' }}>🧠 Credit Score</div>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1rem' }}>
                <div style={{ position:'relative', width:'70px', height:'70px', flexShrink:0 }}>
                  <svg width="70" height="70" style={{ transform:'rotate(-90deg)' }}>
                    <circle cx="35" cy="35" r="28" fill="none" stroke="var(--border)" strokeWidth="6" />
                    <circle cx="35" cy="35" r="28" fill="none" stroke={scoreColor(user?.creditScore||650)} strokeWidth="6"
                      strokeDasharray={`${2*Math.PI*28}`}
                      strokeDashoffset={`${2*Math.PI*28*(1-scorePct(user?.creditScore||650)/100)}`}
                      strokeLinecap="round" style={{ transition:'stroke-dashoffset 1s ease' }} />
                  </svg>
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'monospace', fontWeight:900, fontSize:'15px', color:scoreColor(user?.creditScore||650) }}>
                    {user?.creditScore || 650}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight:800, color:scoreColor(user?.creditScore||650), fontSize:'15px' }}>
                    {(user?.creditScore||650)>=750?'Excellent':(user?.creditScore||650)>=650?'Good':(user?.creditScore||650)>=550?'Fair':'Poor'}
                  </div>
                  <div style={{ fontSize:'12px', color:'var(--ink-3)', marginTop:'3px' }}>300–850 scale</div>
                </div>
              </div>
              <div style={{ height:'5px', borderRadius:'99px', background:'linear-gradient(90deg,#ef4444,#f59e0b,#22c55e)', position:'relative' }}>
                <div style={{ position:'absolute', top:'-3px', left:`${scorePct(user?.creditScore||650)}%`, width:'11px', height:'11px', borderRadius:'50%', background:'var(--card-bg)', border:`2px solid ${scoreColor(user?.creditScore||650)}`, transform:'translateX(-50%)' }} />
              </div>
            </div>

            {/* Wallet info */}
            {isConnected && (
              <div className="card" style={{ padding:'1.25rem' }}>
                <div style={{ fontSize:'11px', fontWeight:700, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.875rem' }}>💼 Wallet</div>
                <div style={{ fontSize:'1.25rem', fontWeight:900, color:'var(--ink)', fontFamily:'monospace', letterSpacing:'-0.03em' }}>{parseFloat(balance||0).toFixed(4)} ETH</div>
                <div style={{ fontSize:'11px', color:'var(--ink-3)', marginTop:'3px' }}>Sepolia Balance</div>
              </div>
            )}
          </div>

          {/* RIGHT — Details + history */}
          <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

            {/* Edit profile */}
            <div className="card" style={{ padding:'1.75rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:'var(--ink)' }}>👤 Profile Info</div>
                <button onClick={() => editMode ? saveProfile() : setEditMode(true)}
                  className={`btn btn-sm ${editMode ? 'btn-mint' : 'btn-out'}`}
                  style={editMode ? { color:'#000000' } : {}}>
                  {editMode ? '✅ Save' : '✏️ Edit'}
                </button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                {[
                  { l:'Full Name', k:'name', t:'text' },
                  { l:'Phone', k:'phone', t:'tel' },
                  { l:'Country', k:'country', t:'text' },
                  { l:'Role', k:null, t:'text', v:user?.role },
                ].map(f => (
                  <div key={f.l}>
                    <label className="lbl">{f.l}</label>
                    {editMode && f.k ? (
                      <input type={f.t} value={form[f.k]} onChange={e => setForm(p => ({...p,[f.k]:e.target.value}))} className="input-f" />
                    ) : (
                      <div style={{ padding:'0.625rem 0', fontSize:'14px', fontWeight:600, color:'var(--ink)' }}>
                        {f.v || (f.k ? (form[f.k] || '—') : '—')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {editMode && (
                <div style={{ marginTop:'1rem' }}>
                  <label className="lbl">Bio</label>
                  <textarea value={form.bio} onChange={e => setForm(p => ({...p,bio:e.target.value}))} className="input-f" rows={2} style={{ resize:'vertical' }} placeholder="Tell lenders about yourself..." />
                </div>
              )}
              {!editMode && user?.bio && (
                <div style={{ marginTop:'1rem', padding:'0.875rem', background:'var(--surface-3)', borderRadius:'10px', fontSize:'13px', color:'var(--ink-3)', lineHeight:1.6 }}>
                  {user.bio}
                </div>
              )}
              {editMode && (
                <button onClick={() => setEditMode(false)} className="btn btn-out btn-sm" style={{ marginTop:'10px' }}>Cancel</button>
              )}
            </div>

            {/* Repayment history */}
            <div className="card" style={{ padding:'1.75rem' }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:'var(--ink)', marginBottom:'1.25rem' }}>📊 Loan History</div>
              {loading ? (
                <div style={{ color:'var(--ink-3)', fontSize:'13px' }}>Loading...</div>
              ) : loans.length === 0 ? (
                <div style={{ color:'var(--ink-3)', fontSize:'13px' }}>No loan history yet.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {loans.map((loan, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px', background:'var(--surface-3)', borderRadius:'10px' }}>
                      <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:loan.status===2?'var(--mint)':loan.status===3?'#ef4444':'#f59e0b', flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'13px', fontWeight:700, color:'var(--ink)' }}>Loan #{loan.loanId}</div>
                        <div style={{ fontSize:'11px', color:'var(--ink-3)' }}>{loan.category} · {loan.duration}d</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'13px', fontWeight:800, color:'var(--ink)', fontFamily:'monospace' }}>{parseFloat(loan.amount||0).toFixed(4)} ETH</div>
                        <div style={{ fontSize:'11px', color:loan.status===2?'var(--mint-dim)':loan.status===3?'#ef4444':'#f59e0b', fontWeight:700 }}>
                          {loan.status===2?'✅ Repaid':loan.status===3?'🔴 Default':'⏳ Active'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Responsive */}
      <style>{`@media(max-width:768px){.profile-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}
