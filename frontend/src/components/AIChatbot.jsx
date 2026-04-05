// AIChatbot.jsx — EqualFund AI Assistant
// Uses backend /api/chat/ai proxy (no direct Anthropic API call from browser)
// Falls back to smart local answers if backend unavailable
import React, { useState, useRef, useEffect } from 'react';

const API = () => (import.meta.env.VITE_API_URL || 'https://equalfund-api.onrender.com/api');

// ── Smart local FAQ fallback (works even without backend) ─
const FAQ = [
  { q: ['how does equalfund work', 'what is equalfund', 'explain'], a: 'EqualFund is a decentralized P2P lending platform on Ethereum. Borrowers request loans and lenders fund them directly via smart contracts — no banks, no middlemen. Platform fee is just 0.5% vs 18–36% from banks.' },
  { q: ['free eth', 'faucet', 'test eth', 'sepolia eth'], a: 'When you link your MetaMask wallet, EqualFund auto-sends you 0.01 Sepolia ETH for free! You can also get more from sepoliafaucet.com or faucet.quicknode.com.' },
  { q: ['credit score', 'score', 'cibil'], a: 'Your on-chain credit score ranges from 300–850. It increases by +15 for every loan you repay on time. KYC adds +50, account age adds up to +50, and repayment ratio adds up to +200. Higher score = better loan terms.' },
  { q: ['create loan', 'apply loan', 'borrow'], a: 'Go to Borrow → New Loan. Fill in amount, interest rate, duration, and purpose. Optionally add ETH collateral (150%) for better funding chances. The loan appears on the marketplace for lenders to fund.' },
  { q: ['fund loan', 'invest', 'lend', 'lending'], a: 'Go to Marketplace, browse loan requests, click Fund. Enter the ETH amount you want to invest. When fully funded, the borrower receives ETH. When repaid, your principal + interest returns automatically via smart contract.' },
  { q: ['collateral', 'secured'], a: 'ETH collateral means locking 150% of the loan amount. For a 1 ETH loan, you lock 1.5 ETH. This protects lenders — if you default, your collateral is liquidated to repay them. Secured loans get lower interest and higher funding rates.' },
  { q: ['kyc', 'verify', 'identity', 'document'], a: 'KYC (Know Your Customer) is one-time identity verification. Upload your ID document — it gets stored permanently on IPFS, not on any central server. KYC adds +50 to your credit score and is required to create loans.' },
  { q: ['default', 'not pay', 'miss payment', 'overdue'], a: 'If you miss a repayment: credit score drops by ~10 points/day, you get reminder notifications at 7/3/1 days before due, your account gets restricted from new loans after 7 days overdue, and ETH collateral (if any) is liquidated to lenders.' },
  { q: ['upi', 'inr', 'rupee', 'razorpay', 'pay'], a: 'You can pay loan amounts in INR via UPI/Card through Razorpay (demo mode). The ETH amount is converted to INR using live CoinGecko prices. Test card: 4111 1111 1111 1111, Exp 12/28, CVV 123.' },
  { q: ['chat', 'message', 'contact', 'video', 'call', 'vc'], a: 'Click the 💬 Chat button on any loan card to message the borrower/lender directly. Click 📹 Video Call inside the chat to start an embedded video call — it stays on the EqualFund site, no redirect.' },
  { q: ['register', 'signup', 'sign up', 'create account'], a: 'Click Login/Register, choose your role (Borrower or Lender), enter name, email, password. Then connect your MetaMask wallet. You\'ll get 0.01 free Sepolia ETH automatically!' },
  { q: ['metamask', 'wallet', 'connect'], a: 'Install MetaMask browser extension, create a wallet, switch to Sepolia testnet. Then click Connect Wallet on EqualFund. The site auto-switches you to Sepolia if you\'re on the wrong network.' },
  { q: ['interest', 'rate', 'apr', 'return'], a: 'Interest rates are set by borrowers when creating their loan. Typical range: 1–15%. As a lender, you receive your principal + interest when the borrower repays. The smart contract auto-splits repayments to all lenders proportionally.' },
  { q: ['fraud', 'risk', 'safe', 'scam'], a: 'EqualFund has AI fraud detection. Each borrower gets a risk score: 🟢 Low, 🟡 Medium, 🔴 High Risk. Risk factors include: new account, low credit score, previous defaults, loan amount exceeding credit limit. High-risk loans show warning badges.' },
  { q: ['admin', 'team'], a: 'The admin dashboard lets the EqualFund team approve/reject KYC, manage users, export data, and broadcast notifications. Admin access is separate from regular user login.' },
];

const getLocalAnswer = (question) => {
  const q = question.toLowerCase();
  for (const faq of FAQ) {
    if (faq.q.some(keyword => q.includes(keyword))) return faq.a;
  }
  return null;
};

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
    { role: 'assistant', content: '👋 Hi! I\'m EqualBot. Ask me anything about EqualFund — loans, KYC, credit scores, crypto, or how the platform works!' }
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: userText };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setLoading(true);

    try {
      // 1. Try backend proxy first
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${API()}/chat/ai`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: userText }),
        signal:  controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data  = await res.json();
        const reply = data.reply || data.message || 'No response received.';
        setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        return;
      }
    } catch {}

    // 2. Fallback: smart local FAQ
    const localAnswer = getLocalAnswer(userText);
    if (localAnswer) {
      setMessages(prev => [...prev, { role: 'assistant', content: localAnswer }]);
    } else {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I don't have a specific answer for that yet. For loan questions: go to Marketplace. For account issues: check Profile. For KYC: go to the KYC page. Need more help? Email support@equalfund.com 📧"
      }]);
    }
    setLoading(false);
    return;

    setLoading(false);
  };

  // Ensure loading is always cleared
  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => setLoading(false), 10000);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const onKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="EqualBot AI Assistant"
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9000,
          width: '54px', height: '54px', borderRadius: '50%',
          background: open ? '#111' : 'linear-gradient(135deg,#00e87a,#00c965)',
          color: open ? '#fff' : '#000',
          border: 'none', cursor: 'pointer', fontSize: '1.35rem',
          boxShadow: '0 4px 20px rgba(0,232,122,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s',
          animation: open ? 'none' : 'botPulse 3s ease-in-out infinite',
        }}>
        {open ? '✕' : '🤖'}
      </button>

      {/* AI badge */}
      {!open && (
        <div style={{ position:'fixed', bottom:'68px', right:'20px', zIndex:9001, background:'#ef4444', color:'#fff', borderRadius:'99px', fontSize:'9px', fontWeight:800, padding:'2px 5px', pointerEvents:'none', letterSpacing:'0.04em' }}>
          AI
        </div>
      )}

      {/* Chat panel */}
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', bottom: '88px', right: '24px', zIndex: 8999,
            width: '350px', maxWidth: 'calc(100vw - 48px)',
            height: '500px', maxHeight: 'calc(100vh - 110px)',
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: '18px', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            animation: 'chatSlideUp 0.25s ease',
          }}>

          {/* Header */}
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'linear-gradient(135deg,rgba(0,232,122,0.08),transparent)', borderRadius:'18px 18px 0 0', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'34px', height:'34px', borderRadius:'10px', background:'linear-gradient(135deg,#00e87a,#00c965)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0 }}>🤖</div>
              <div>
                <div style={{ fontWeight:800, color:'var(--ink)', fontSize:'14px', lineHeight:1 }}>EqualBot</div>
                <div style={{ fontSize:'11px', color:'#00c965', marginTop:'3px', display:'flex', alignItems:'center', gap:'4px' }}>
                  <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#00e87a', display:'inline-block', animation:'onlinePulse 2s infinite' }} />
                  AI Assistant · Always Online
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'12px', display:'flex', flexDirection:'column', gap:'10px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display:'flex', justifyContent:msg.role==='user'?'flex-end':'flex-start', gap:'7px', alignItems:'flex-end' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width:'24px', height:'24px', borderRadius:'7px', background:'linear-gradient(135deg,#00e87a,#00c965)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', flexShrink:0 }}>🤖</div>
                )}
                <div style={{
                  maxWidth:'84%', padding:'9px 12px',
                  borderRadius: msg.role==='user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role==='user' ? 'var(--ink)' : 'var(--surface-3)',
                  color: msg.role==='user' ? 'var(--card-bg)' : 'var(--ink)',
                  fontSize:'13px', lineHeight:1.55,
                  border: msg.role==='assistant' ? '1px solid var(--border)' : 'none',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display:'flex', alignItems:'flex-end', gap:'7px' }}>
                <div style={{ width:'24px', height:'24px', borderRadius:'7px', background:'linear-gradient(135deg,#00e87a,#00c965)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', flexShrink:0 }}>🤖</div>
                <div style={{ padding:'10px 14px', background:'var(--surface-3)', border:'1px solid var(--border)', borderRadius:'14px 14px 14px 4px', display:'flex', gap:'4px', alignItems:'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#00c965', animation:`dotBounce 1s ease-in-out ${i*0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick questions — only on first open */}
          {messages.length <= 1 && (
            <div style={{ padding:'0 10px 8px', display:'flex', gap:'5px', flexWrap:'wrap', flexShrink:0 }}>
              {QUICK.map(q => (
                <button key={q} onClick={() => send(q)}
                  style={{ padding:'4px 9px', borderRadius:'99px', fontSize:'11px', fontWeight:600, background:'var(--surface-3)', border:'1px solid var(--border)', color:'var(--ink-3)', cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#00e87a'; e.currentTarget.style.color='#00c965'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--ink-3)'; }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', display:'flex', gap:'7px', flexShrink:0 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask anything about EqualFund..."
              rows={1}
              disabled={loading}
              style={{ flex:1, background:'var(--surface-3)', border:'1px solid var(--border)', borderRadius:'10px', padding:'8px 11px', color:'var(--ink)', fontFamily:'inherit', fontSize:'13px', resize:'none', outline:'none' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{ padding:'8px 13px', borderRadius:'10px', background:input.trim()&&!loading?'#00e87a':'var(--border)', color:'#000', border:'none', cursor:input.trim()&&!loading?'pointer':'not-allowed', fontWeight:800, fontSize:'13px', flexShrink:0 }}>
              ↑
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes botPulse { 0%,100%{box-shadow:0 4px 20px rgba(0,232,122,0.4)} 50%{box-shadow:0 4px 32px rgba(0,232,122,0.7)} }
        @keyframes chatSlideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes dotBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes onlinePulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </>
  );
}
