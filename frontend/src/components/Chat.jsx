// Chat.jsx — Fixed: no circular imports, self-contained
import React, { useState, useEffect, useRef, useCallback } from 'react';

const getToken = () => localStorage.getItem('ef-token');
const API_URL  = import.meta.env.VITE_API_URL || 'https://equalfund-api.onrender.com/api';

// ── Chat Button ───────────────────────────────────────────
export function ChatButton({ loanId, otherUserAddress, otherUserName, currentUserAddress }) {
  const [open, setOpen] = useState(false);
  if (!otherUserAddress || !currentUserAddress) return null;
  if (otherUserAddress?.toLowerCase() === currentUserAddress?.toLowerCase()) return null;

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        style={{
          padding: '4px 10px', borderRadius: '7px', fontSize: '12px', fontWeight: 700,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--ink-3)', cursor: 'pointer', display: 'inline-flex',
          alignItems: 'center', gap: '4px', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--mint)'; e.currentTarget.style.color = 'var(--mint-dim)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--ink-3)'; }}>
        💬 Chat
      </button>
      {open && (
        <ChatModal
          loanId={loanId}
          otherAddress={otherUserAddress}
          otherName={otherUserName}
          myAddress={currentUserAddress}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ── Chat Modal ────────────────────────────────────────────
export function ChatModal({ loanId, otherAddress, otherName, myAddress, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const bottomRef  = useRef(null);
  const pollRef    = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/chat/${loanId}/${otherAddress}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {}
    finally { setLoading(false); }
  }, [loanId, otherAddress]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    const tempMsg = { _id: Date.now(), from: myAddress, text, createdAt: new Date(), pending: true };
    setMessages(prev => [...prev, tempMsg]);
    try {
      await fetch(`${API_URL}/chat/${loanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ to: otherAddress, text }),
      });
      await fetchMessages();
    } catch {}
    finally { setSending(false); }
  };

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(4px)', zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: '18px', width: '100%', maxWidth: '460px',
        height: '540px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-3)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(0,232,122,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--mint-dim)', fontSize: '13px' }}>
              {(otherName || '?')[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '13px' }}>{otherName || `${otherAddress?.slice(0,8)}...`}</div>
              <div style={{ fontSize: '11px', color: 'var(--mint-dim)' }}>Loan #{loanId}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => {
              const room = `equalfund-loan-${loanId}-${Date.now()}`;
              window.open(`https://meet.jit.si/${room}`, '_blank', 'width=900,height=700');
            }} style={{ padding: '4px 10px', borderRadius: '7px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: 'var(--mint-dim)', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
              📹 Video Call
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: '1.1rem', padding: '2px 6px' }}>✕</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: '13px', marginTop: '3rem' }}>Loading...</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: '13px', marginTop: '3rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💬</div>
              Start a conversation about Loan #{loanId}
            </div>
          ) : messages.map((msg, i) => {
            const isMe = msg.from?.toLowerCase() === myAddress?.toLowerCase();
            return (
              <div key={msg._id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '78%', padding: '8px 12px',
                  borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isMe ? 'var(--ink)' : 'var(--surface-3)',
                  color: isMe ? 'var(--card-bg)' : 'var(--ink)',
                  fontSize: '13px', lineHeight: 1.5, opacity: msg.pending ? 0.7 : 1,
                  border: isMe ? 'none' : '1px solid var(--border)',
                }}>
                  <div>{msg.text}</div>
                  <div style={{ fontSize: '10px', marginTop: '3px', opacity: 0.55, textAlign: isMe ? 'right' : 'left' }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.pending ? ' · sending...' : ''}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '0.875rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', flexShrink: 0, background: 'var(--surface-3)' }}>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Type a message... (Enter to send)"
            rows={1}
            style={{ flex: 1, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px', color: 'var(--ink)', fontFamily: 'inherit', fontSize: '13px', resize: 'none', outline: 'none' }} />
          <button onClick={sendMessage} disabled={!input.trim() || sending}
            style={{ padding: '8px 14px', borderRadius: '10px', background: input.trim() ? 'var(--mint)' : 'var(--border)', color: '#000', border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
            {sending ? '⏳' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
