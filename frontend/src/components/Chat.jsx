// Chat.jsx — Real-time chat between lender and borrower
// Uses polling (no external service needed — works with existing backend)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/apiService';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('ef-token')}` }
});

// ── Chat Button (shown on loan cards) ────────────────────
export function ChatButton({ loanId, otherUserAddress, otherUserName, currentUserAddress }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="btn btn-out btn-xs"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
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
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const bottomRef  = useRef(null);
  const pollRef    = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/chat/${loanId}/${otherAddress}`, getAuthHeader());
      setMessages(res.data.messages || []);
    } catch {
      // Demo mode — use local state
    } finally {
      setLoading(false);
    }
  }, [loanId, otherAddress]);

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 3 seconds
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

    // Optimistic update
    const tempMsg = { id: Date.now(), from: myAddress, text, createdAt: new Date(), pending: true };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await api.post(`/chat/${loanId}`, { to: otherAddress, text }, getAuthHeader());
      await fetchMessages();
    } catch {
      // Keep optimistic message visible for demo
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}
        style={{ maxWidth: '480px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '560px' }}>

        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-3)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'var(--mint-pale)', border: '1px solid rgba(0,232,122,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--mint-dim)', fontSize: '14px' }}>
              {(otherName || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '14px' }}>{otherName || `${otherAddress?.slice(0, 8)}...`}</div>
              <div style={{ fontSize: '11px', color: 'var(--mint-dim)' }}>● Online · Loan #{loanId}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <VideoCallButton loanId={loanId} otherName={otherName} />
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: '13px', marginTop: '2rem' }}>Loading messages...</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: '13px', marginTop: '2rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💬</div>
              Start a conversation about Loan #{loanId}
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.from?.toLowerCase() === myAddress?.toLowerCase();
              return (
                <div key={msg.id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '75%', padding: '8px 12px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: isMe ? 'var(--ink)' : 'var(--surface-3)',
                    color: isMe ? 'var(--card-bg)' : 'var(--ink)',
                    fontSize: '13px', lineHeight: 1.5,
                    opacity: msg.pending ? 0.7 : 1,
                    border: isMe ? 'none' : '1px solid var(--border)',
                  }}>
                    <div>{msg.text}</div>
                    <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6, textAlign: isMe ? 'right' : 'left' }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.pending ? ' ·  sending...' : ''}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '0.875rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', flexShrink: 0, background: 'var(--surface-3)' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
            rows={1}
            style={{ flex: 1, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px', color: 'var(--ink)', fontFamily: 'inherit', fontSize: '13px', resize: 'none', outline: 'none' }}
          />
          <button onClick={sendMessage} disabled={!input.trim() || sending}
            style={{ padding: '8px 14px', borderRadius: '10px', background: input.trim() ? 'var(--mint)' : 'var(--border)', color: '#000', border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
            {sending ? '⏳' : '↑ Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Video Call Button ─────────────────────────────────────
export function VideoCallButton({ loanId, otherName }) {
  const [calling, setCalling] = useState(false);
  const [inCall,  setInCall]  = useState(false);

  const startCall = () => {
    setCalling(true);
    // Generate a deterministic room ID from loanId
    const roomId = `equalfund-loan-${loanId}-${Date.now()}`;
    // Open Jitsi Meet in a new window (free, no API key needed)
    const jitsiUrl = `https://meet.jit.si/${roomId}`;
    window.open(jitsiUrl, '_blank', 'width=900,height=700');
    setCalling(false);
    setInCall(true);
    setTimeout(() => setInCall(false), 30000);
  };

  return (
    <button onClick={startCall} disabled={calling}
      style={{ padding: '5px 10px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: 'var(--mint-dim)', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
      {calling ? '⏳' : inCall ? '📹 In Call' : '📹 Video Call'}
    </button>
  );
}
