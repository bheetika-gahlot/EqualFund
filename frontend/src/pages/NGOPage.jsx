import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import ConnectWalletPrompt from '../components/ConnectWalletPrompt';
import Toast from '../components/Toast';
import { activityAPI, notificationsAPI } from '../services/apiService';

// Mock NGO data — in production this comes from MongoDB
const MOCK_NGOS = [
  {
    id: 1,
    name: 'Vidya Foundation',
    cause: 'Education',
    icon: '🎓',
    description: 'Providing scholarships and school supplies to underprivileged children across rural India.',
    walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    totalRaised: '4.82',
    donorsCount: 134,
    impactStats: '320 children educated',
    verified: true,
    color: '#06b6d4',
  },
  {
    id: 2,
    name: 'Aarogya Trust',
    cause: 'Medical Aid',
    icon: '🏥',
    description: 'Funding life-saving surgeries and medical treatments for families who cannot afford healthcare.',
    walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    totalRaised: '12.3',
    donorsCount: 287,
    impactStats: '89 surgeries funded',
    verified: true,
    color: '#f43f5e',
  },
  {
    id: 3,
    name: 'GreenRoots NGO',
    cause: 'Environment',
    icon: '🌱',
    description: 'Planting trees, cleaning rivers, and supporting eco-friendly livelihoods in tribal communities.',
    walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    totalRaised: '2.15',
    donorsCount: 76,
    impactStats: '5,400 trees planted',
    verified: false,
    color: '#22c55e',
  },
  {
    id: 4,
    name: 'Sahara Women',
    cause: 'Women Empowerment',
    icon: '👩',
    description: 'Microloans and skill training for women entrepreneurs in underserved communities.',
    walletAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    totalRaised: '7.6',
    donorsCount: 198,
    impactStats: '240 women supported',
    verified: true,
    color: '#a855f7',
  },
];

export default function NGOPage() {
  const { isConnected, account } = useWallet();
  const { contractService } = useContract();
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('browse'); // browse | register | my-donations
  const [donating, setDonating] = useState(null); // ngo id being donated to
  const [donateAmount, setDonateAmount] = useState('');
  const [donateMessage, setDonateMessage] = useState('');
  const [donations, setDonations] = useState([]);

  // Register NGO form
  const [regForm, setRegForm] = useState({
    name: '', cause: '', description: '', website: '', walletAddress: account || '',
  });

  const handleDonate = async (ngo) => {
    if (!donateAmount || parseFloat(donateAmount) <= 0) {
      setToast({ message: 'Please enter a valid donation amount', type: 'error' });
      return;
    }
    setDonating(ngo.id);
    try {
      // Direct ETH transfer to NGO wallet via MetaMask
      const provider = contractService?.provider;
      if (!provider) throw new Error('Wallet not connected');

      const signer = await provider.getSigner();
      const { ethers } = await import('ethers');
      const tx = await signer.sendTransaction({
        to: ngo.walletAddress,
        value: ethers.parseEther(donateAmount),
      });
      await tx.wait();

      // Log to MongoDB
      await activityAPI.log('loan_funded', {
        amount: donateAmount,
        txHash: tx.hash,
        description: `Donated ${donateAmount} ETH to ${ngo.name}`,
      });

      await notificationsAPI.create(
        `❤️ Donation to ${ngo.name}`,
        `You donated ${donateAmount} ETH to ${ngo.name}. Thank you for making a difference!`,
        'investment_return',
        null,
        tx.hash,
        donateAmount
      );

      setDonations(prev => [...prev, { ngo: ngo.name, amount: donateAmount, txHash: tx.hash, date: new Date() }]);
      setToast({ message: `✅ Donated ${donateAmount} ETH to ${ngo.name}!`, type: 'success', txHash: tx.hash });
      setDonateAmount('');
      setDonateMessage('');
    } catch (e) {
      setToast({ message: e.message || 'Donation failed', type: 'error' });
    } finally {
      setDonating(null);
    }
  };

  const handleRegister = async () => {
    if (!regForm.name || !regForm.cause || !regForm.description) {
      setToast({ message: 'Please fill all required fields', type: 'error' });
      return;
    }
    // In production: POST to backend /api/ngos
    setToast({ message: '✅ NGO registration submitted for review!', type: 'success' });
    setRegForm({ name: '', cause: '', description: '', website: '', walletAddress: account || '' });
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(6,182,212,0.12),rgba(168,85,247,0.12))',
        border: '1px solid rgba(6,182,212,0.2)',
        borderRadius: '20px', padding: '2.5rem', marginBottom: '2rem', textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🤝</div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          NGO Donation Hub
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.7 }}>
          Support verified NGOs directly with crypto donations, or let NGOs fund loan requests for people in need.
        </p>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginTop: '2rem', flexWrap: 'wrap' }}>
          {[
            { val: '4', label: 'Verified NGOs', icon: '🏛️' },
            { val: '695', label: 'Total Donors', icon: '❤️' },
            { val: '26.87 ETH', label: 'Total Donated', icon: '💰' },
            { val: '649+', label: 'Lives Impacted', icon: '🌟' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#06b6d4' }}>{s.val}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '0.375rem', borderRadius: '14px', width: 'fit-content' }}>
        {[
          { id: 'browse', label: '🏛️ Browse NGOs' },
          { id: 'register', label: '➕ Register NGO' },
          { id: 'my-donations', label: '📋 My Donations' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '0.625rem 1.25rem', borderRadius: '10px', border: 'none',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s',
              background: tab === t.id ? 'linear-gradient(135deg,#06b6d4,#8b5cf6)' : 'transparent',
              color: tab === t.id ? 'white' : 'var(--text-secondary)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BROWSE NGOs ── */}
      {tab === 'browse' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(480px,1fr))', gap: '1.5rem' }}>
          {MOCK_NGOS.map(ngo => (
            <NGOCard key={ngo.id} ngo={ngo} isConnected={isConnected}
              donateAmount={donateAmount} setDonateAmount={setDonateAmount}
              donateMessage={donateMessage} setDonateMessage={setDonateMessage}
              donating={donating} handleDonate={handleDonate} />
          ))}
        </div>
      )}

      {/* ── REGISTER NGO ── */}
      {tab === 'register' && (
        <div style={{ maxWidth: '600px' }}>
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Register Your NGO
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
              Get verified and start receiving crypto donations directly to your wallet.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="label">NGO Name *</label>
                <input value={regForm.name} onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))}
                  className="input-field" placeholder="e.g. Vidya Foundation" />
              </div>
              <div>
                <label className="label">Cause / Category *</label>
                <select value={regForm.cause} onChange={e => setRegForm(p => ({ ...p, cause: e.target.value }))}
                  className="input-field">
                  <option value="">Select a cause</option>
                  {['Education', 'Medical Aid', 'Environment', 'Women Empowerment', 'Child Welfare', 'Disaster Relief', 'Other'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Description *</label>
                <textarea value={regForm.description} onChange={e => setRegForm(p => ({ ...p, description: e.target.value }))}
                  className="input-field" rows={4} placeholder="Describe your NGO's mission and impact..." style={{ resize: 'vertical' }} />
              </div>
              <div>
                <label className="label">Website (optional)</label>
                <input value={regForm.website} onChange={e => setRegForm(p => ({ ...p, website: e.target.value }))}
                  className="input-field" placeholder="https://yourngodomain.org" />
              </div>
              <div>
                <label className="label">Wallet Address for Donations *</label>
                <input value={regForm.walletAddress} onChange={e => setRegForm(p => ({ ...p, walletAddress: e.target.value }))}
                  className="input-field" placeholder="0x..." style={{ fontFamily: 'monospace', fontSize: '0.85rem' }} />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.375rem' }}>
                  This is where ETH donations will be sent directly on-chain.
                </p>
              </div>

              <div style={{
                background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)',
                borderRadius: '12px', padding: '1rem', fontSize: '0.82rem', color: '#fbbf24',
              }}>
                ⏳ After submission, our team will verify your NGO within 2-3 business days. You'll receive a notification once verified.
              </div>

              <button onClick={handleRegister} className="btn-primary" style={{ padding: '0.875rem', fontSize: '0.95rem' }}>
                🚀 Submit for Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MY DONATIONS ── */}
      {tab === 'my-donations' && (
        <div>
          {!isConnected ? (
            <ConnectWalletPrompt message="Connect your wallet to see your donation history." />
          ) : donations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💝</div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No donations yet</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Browse NGOs and make your first donation!</p>
              <button onClick={() => setTab('browse')} className="btn-primary" style={{ padding: '0.625rem 1.5rem' }}>
                Browse NGOs →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {donations.map((d, i) => (
                <div key={i} className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>❤️ {d.ngo}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(d.date).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: '#06b6d4', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                    {d.amount} ETH
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── NGO Card Component ──
function NGOCard({ ngo, isConnected, donateAmount, setDonateAmount, donateMessage, setDonateMessage, donating, handleDonate }) {
  const [expanded, setExpanded] = useState(false);
  const QUICK_AMOUNTS = ['0.01', '0.05', '0.1', '0.5'];

  return (
    <div className="glass-card" style={{ padding: '1.75rem', transition: 'transform 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>

      {/* NGO Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
          background: `linear-gradient(135deg,${ngo.color}22,${ngo.color}44)`,
          border: `1px solid ${ngo.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem',
        }}>
          {ngo.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{ngo.name}</h3>
            {ngo.verified && (
              <span style={{ fontSize: '0.65rem', background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '2px 7px', borderRadius: '6px', fontWeight: 700 }}>
                ✓ VERIFIED
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.75rem', background: `${ngo.color}22`, color: ngo.color, padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
            {ngo.cause}
          </span>
        </div>
      </div>

      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1.25rem' }}>
        {ngo.description}
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Raised', val: `${ngo.totalRaised} ETH`, color: '#06b6d4' },
          { label: 'Donors', val: ngo.donorsCount, color: '#8b5cf6' },
          { label: 'Impact', val: ngo.impactStats, color: '#22c55e' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.625rem',
            border: '1px solid var(--border)', textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Donate Section */}
      {isConnected ? (
        <div>
          <button onClick={() => setExpanded(!expanded)}
            style={{
              width: '100%', padding: '0.75rem', borderRadius: '12px', border: 'none',
              background: expanded ? 'rgba(239,68,68,0.1)' : `linear-gradient(135deg,${ngo.color},#8b5cf6)`,
              color: expanded ? '#f87171' : 'white',
              cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s',
            }}>
            {expanded ? '✕ Cancel' : `❤️ Donate to ${ngo.name}`}
          </button>

          {expanded && (
            <div style={{ marginTop: '1rem', animation: 'fadeInUp 0.2s ease' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                {QUICK_AMOUNTS.map(a => (
                  <button key={a} onClick={() => setDonateAmount(a)}
                    style={{
                      padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem',
                      border: donateAmount === a ? `1.5px solid ${ngo.color}` : '1px solid var(--border)',
                      background: donateAmount === a ? `${ngo.color}22` : 'transparent',
                      color: donateAmount === a ? ngo.color : 'var(--text-secondary)',
                      cursor: 'pointer', fontWeight: 600,
                    }}>
                    {a} ETH
                  </button>
                ))}
              </div>
              <input type="number" value={donateAmount} onChange={e => setDonateAmount(e.target.value)}
                className="input-field" placeholder="Or enter custom amount (ETH)"
                style={{ marginBottom: '0.75rem' }} step="0.001" min="0" />
              <textarea value={donateMessage} onChange={e => setDonateMessage(e.target.value)}
                className="input-field" placeholder="Optional message of support..." rows={2}
                style={{ marginBottom: '0.875rem', resize: 'none' }} />
              <button onClick={() => handleDonate(ngo)} disabled={donating === ngo.id}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '12px', border: 'none',
                  background: `linear-gradient(135deg,${ngo.color},#8b5cf6)`,
                  color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                  opacity: donating === ngo.id ? 0.7 : 1,
                }}>
                {donating === ngo.id ? '⏳ Processing...' : `💸 Send ${donateAmount || '0'} ETH`}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '0.875rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          🦊 Connect wallet to donate
        </div>
      )}
    </div>
  );
}
