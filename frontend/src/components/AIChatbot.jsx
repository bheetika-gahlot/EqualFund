// AIChatbot.jsx — EqualFund AI Assistant using Claude API
// Answers questions about the platform, loans, crypto, KYC etc.
import React, { useState, useRef, useEffect } from 'react';

const SYSTEM_PROMPT = `You are EqualBot, the AI assistant for EqualFund — a decentralized P2P lending platform on Ethereum.

EqualFund lets borrowers request loans and lenders fund them directly via smart contracts.

KEY FACTS:
- Platform fee: 0.5% (vs 18-36% from banks)
- Smart contract on Ethereum Sepolia: 0xa6b4Eb5a8e1C01C16de6E32BADec9c2c9BCa117C
- KYC documents stored on IPFS (tamper-proof)
- On-chain credit score (300-850 scale, like CIBIL)
- Multi-lender pooling: multiple lenders can fund one loan
- ETH collateral option: lock 150% ETH for secured loans (lower interest)
- Auto-faucet: new users get 0.01 Sepolia ETH free
- EMI reminders: 7, 3, 1 days before due date
- Default penalty: credit score reduced, account restricted
- Chat + video call between lender and borrower
- UPI/INR payment supported via Razorpay (demo mode)

HOW TO USE:
- Step 1: Register at equalfund.vercel.app
- Step 2: Connect MetaMask wallet (get Sepolia ETH from faucet)
- Step 3: Complete KYC verification
- Step 4: Create loan request OR browse marketplace to lend

CREDIT SCORE:
- 800+: Excellent (max loan 10 ETH, 1-5% interest)
- 700-799: Very Good (max 5 ETH, 3-7%)
- 600-699: Good (max 2 ETH, 5-10%)
- 500-599: Fair (max 0.5 ETH, 10-15%)
- Below 500: Poor (max 0.1 ETH, 15-20%)
- Score increases by 15 per successful repayment

Be helpful, concise, and friendly. Answer in 2-4 sentences max unless more detail is needed.
If asked about something unrelated to finance/crypto/EqualFund, politely redirect.
Format: use short paragraphs, no markdown headers.`;

const QUICK = [
  'How does EqualFund work?',
  'How to get free ETH?',
  'What is credit score?',
  'How to create a loan?',
  'How to fund a loan?',
  'What is collateral?',
  'How to do KYC?',
  'What if I default?',
];

export default function AIChatbot() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '👋 Hi! I\'m EqualBot, your AI assistant. I can help with loans, KYC, credit scores, and anything about EqualFund. What would you like to know?' }
  ]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput('');

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: SYSTEM_PROMPT,
          messages: newMessages.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || 'Sorry, I could not get a response. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Connection error. Please check your internet and try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 500,
          width: '56px', height: '56px', borderRadius: '50%',
          background: open ? 'var(--ink)' : 'linear-gradient(135deg,#00e87a,#00c965)',
          color: open ? 'var(--card-bg)' : '#000',
          border: 'none', cursor: 'pointer', fontSize: '1.4rem',
          boxShadow: '0 4px 20px rgba(0,232,122,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s ease',
          animation: open ? 'none' : 'botPulse 3s ease-in-out infinite',
        }}
        title="EqualBot — AI Assistant">
        {open ? '✕' : '🤖'}
      </button>

      {/* Unread badge */}
      {!open && (
        <div style={{ position: 'fixed', bottom: '68px', right: '22px', zIndex: 501, background: '#ef4444', color: '#fff', borderRadius: '99px', fontSize: '10px', fontWeight: 800, padding: '2px 6px', pointerEvents: 'none' }}>
          AI
        </div>
      )}

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '90px', right: '24px', zIndex: 499,
          width: '360px', maxWidth: 'calc(100vw - 48px)',
          height: '520px', maxHeight: 'calc(100vh - 120px)',
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: '18px', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          animation: 'slideUp 0.25s ease',
        }}>

          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg,rgba(0,232,122,0.1),rgba(0,201,101,0.05))', borderRadius: '18px 18px 0 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#00e87a,#00c965)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🤖</div>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '14px' }}>EqualBot</div>
                <div style={{ fontSize: '11px', color: '#00c965', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00e87a', display: 'inline-block' }} />
                  AI Assistant · Always Online
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-end' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'linear-gradient(135deg,#00e87a,#00c965)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0 }}>🤖</div>
                )}
                <div style={{
                  maxWidth: '82%', padding: '9px 12px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? 'var(--ink)' : 'var(--surface-3)',
                  color: msg.role === 'user' ? 'var(--card-bg)' : 'var(--ink)',
                  fontSize: '13px', lineHeight: 1.55,
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'linear-gradient(135deg,#00e87a,#00c965)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0 }}>🤖</div>
                <div style={{ padding: '10px 14px', background: 'var(--surface-3)', borderRadius: '14px 14px 14px 4px', border: '1px solid var(--border)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00c965', animation: `dotBounce 1s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick questions */}
          {messages.length <= 1 && (
            <div style={{ padding: '0 12px 8px', display: 'flex', gap: '5px', flexWrap: 'wrap', flexShrink: 0 }}>
              {QUICK.map(q => (
                <button key={q} onClick={() => send(q)}
                  style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 600, background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--ink-3)', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#00e87a'; e.currentTarget.style.color = '#00c965'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--ink-3)'; }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '7px', flexShrink: 0 }}>
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
              placeholder="Ask anything about EqualFund..."
              rows={1} disabled={loading}
              style={{ flex: 1, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px', color: 'var(--ink)', fontFamily: 'inherit', fontSize: '13px', resize: 'none', outline: 'none', maxHeight: '80px' }} />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              style={{ padding: '8px 12px', borderRadius: '10px', background: input.trim() && !loading ? '#00e87a' : 'var(--border)', color: '#000', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>
              ↑
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes botPulse { 0%,100%{box-shadow:0 4px 20px rgba(0,232,122,0.4)} 50%{box-shadow:0 4px 30px rgba(0,232,122,0.7)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes dotBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      `}</style>
    </>
  );
}
