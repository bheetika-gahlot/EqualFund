// Chat.jsx — Fixed: no blink, embedded Jitsi, proper modal, notifications
import React, { useState, useEffect, useRef, useCallback } from 'react';

const API  = () => (import.meta.env.VITE_API_URL || 'https://equalfund-api.onrender.com/api');
const tok  = () => localStorage.getItem('ef-token');

const post = async (path, body) => {
  const r = await fetch(`${API()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
    body: JSON.stringify(body),
  });
  return r.json();
};

const get = async (path) => {
  const r = await fetch(`${API()}${path}`, {
    headers: { Authorization: `Bearer ${tok()}` },
  });
  return r.json();
};

// ── Chat Button ───────────────────────────────────────────
export function ChatButton({ loanId, otherUserAddress, otherUserName, currentUserAddress }) {
  const [open, setOpen] = useState(false);
  if (!otherUserAddress || !currentUserAddress) return null;
  if (otherUserAddress?.toLowerCase() === currentUserAddress?.toLowerCase()) return null;

  return (
    <>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        style={{
          padding: '4px 10px', borderRadius: '7px', fontSize: '12px', fontWeight: 700,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--ink-3)', cursor: 'pointer', display: 'inline-flex',
          alignItems: 'center', gap: '4px', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#00e87a'; e.currentTarget.style.color = '#00c965'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--ink-3)'; }}>
        💬 Chat
      </button>

      {/* Portal-style fixed modal — completely isolated from parent clicks */}
      {open && (
        <ChatWindow
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

// ── Chat Window ───────────────────────────────────────────
function ChatWindow({ loanId, otherAddress, otherName, myAddress, onClose }) {
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [vcActive,  setVcActive]  = useState(false);
  const [vcRoom,    setVcRoom]    = useState('');
  const [incomingVC, setIncomingVC] = useState(false);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);
  const inputRef  = useRef(null);

  // ── Fetch messages ─────────────────────────────────────
  const fetch_ = useCallback(async () => {
    try {
      const data = await get(`/chat/${loanId}/${otherAddress}`);
      const msgs = data.messages || [];
      setMessages(msgs);

      // Detect incoming VC invite from other person
      const vcMsg = msgs.find(m =>
        m.from?.toLowerCase() === otherAddress?.toLowerCase() &&
        m.text?.startsWith('__VC_INVITE__:') &&
        !vcActive
      );
      if (vcMsg && !vcActive && !vcRoom) {
        const room = vcMsg.text.replace('__VC_INVITE__:', '').trim();
        setVcRoom(room);
        setIncomingVC(true);
      }
    } catch {} finally { setLoading(false); }
  }, [loanId, otherAddress, vcActive, vcRoom]);

  useEffect(() => {
    fetch_();
    pollRef.current = setInterval(fetch_, 2500);
    return () => clearInterval(pollRef.current);
  }, [fetch_]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ───────────────────────────────────────
  const send = async (txt) => {
    const text = (txt || input).trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    setMessages(prev => [...prev, { _id: Date.now(), from: myAddress, text, createdAt: new Date(), pending: true }]);
    try {
      await post(`/chat/${loanId}`, { to: otherAddress, text, loanId });
      await fetch_();
    } catch {} finally { setSending(false); }
  };

  // ── Start Video Call ───────────────────────────────────
  const startVC = async () => {
    const room = `EFLoan${loanId}${Math.random().toString(36).slice(2,7)}`;
    setVcRoom(room);
    setVcActive(true);
    setIncomingVC(false);
    await send(`__VC_INVITE__:${room}`);
    // Notify other user
    try { await post('/chat/vc-notify', { to: otherAddress, loanId, room, callerName: otherName || myAddress?.slice(0,8) }); } catch {}
  };

  const joinVC = () => { setVcActive(true); setIncomingVC(false); };
  const endVC  = () => { setVcActive(false); setVcRoom(''); };

  const onKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  // ── Render ─────────────────────────────────────────────
  return (
    // !! KEY FIX: stopPropagation on the outer wrapper prevents ANY click from closing
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
      }}
      onClick={e => e.stopPropagation()} // CRITICAL — prevent background click-through
    >
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: '18px', overflow: 'hidden',
        width: vcActive ? '880px' : '440px',
        height: vcActive ? '88vh' : '540px',
        maxWidth: '96vw', maxHeight: '94vh',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.3s ease, height 0.3s ease',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-3)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(0,232,122,0.15)', border: '1px solid rgba(0,232,122,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#00c965', fontSize: '13px', flexShrink: 0 }}>
              {(otherName || '?')[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '14px', lineHeight: 1 }}>{otherName || `${otherAddress?.slice(0,8)}...`}</div>
              <div style={{ fontSize: '11px', color: '#00c965', marginTop: '2px' }}>Loan #{loanId}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {vcActive ? (
              <button onClick={endVC} style={{ padding: '5px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>⏹ End Call</button>
            ) : (
              <button onClick={startVC} style={{ padding: '5px 12px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#00c965', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>📹 Video Call</button>
            )}
            <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--ink-3)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>

        {/* Incoming VC banner */}
        {incomingVC && !vcActive && (
          <div style={{ padding: '10px 16px', background: 'rgba(34,197,94,0.08)', borderBottom: '1px solid rgba(34,197,94,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'ringBlink 1s infinite', flexShrink: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#00c965' }}>📹 Incoming video call from {otherName}!</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={joinVC} style={{ padding: '4px 14px', borderRadius: '7px', background: '#00e87a', color: '#000', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 800 }}>✅ Join</button>
              <button onClick={() => { setIncomingVC(false); setVcRoom(''); }} style={{ padding: '4px 10px', borderRadius: '7px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>Decline</button>
            </div>
          </div>
        )}

        {/* Main area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Embedded VC iframe (NO redirect, stays on site) */}
          {vcActive && vcRoom && (
            <div style={{ flex: 1, background: '#111', position: 'relative', minWidth: 0 }}>
              <iframe
                src={`https://meet.jit.si/${vcRoom}#config.startWithVideoMuted=false&config.startWithAudioMuted=false&config.disableDeepLinking=true&config.enableWelcomePage=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_BRAND_WATERMARK=false&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","desktop","hangup","chat","raisehand","videoquality"]`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                title="EqualFund Video Call"
              />
              <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                🔴 LIVE · Loan #{loanId}
              </div>
            </div>
          )}

          {/* Messages panel */}
          <div style={{ width: vcActive ? '260px' : '100%', display: 'flex', flexDirection: 'column', borderLeft: vcActive ? '1px solid var(--border)' : 'none', minWidth: vcActive ? '260px' : undefined }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: '13px', marginTop: '40px' }}>Loading...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>💬</div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-3)', lineHeight: 1.6 }}>Start a conversation<br />about Loan #{loanId}</div>
                </div>
              ) : messages.map((msg, i) => {
                const isMe  = msg.from?.toLowerCase() === myAddress?.toLowerCase();
                const isVC  = msg.text?.startsWith('__VC_INVITE__:');
                if (isVC) return (
                  <div key={msg._id || i} style={{ textAlign: 'center', padding: '5px 10px', background: 'rgba(34,197,94,0.08)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.15)', fontSize: '12px', color: '#00c965', fontWeight: 600 }}>
                    📹 {isMe ? 'You started a video call' : `${otherName} started a video call`}
                  </div>
                );
                return (
                  <div key={msg._id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '82%', padding: '7px 11px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isMe ? 'var(--ink)' : 'var(--surface-3)', color: isMe ? 'var(--card-bg)' : 'var(--ink)', fontSize: '13px', lineHeight: 1.5, opacity: msg.pending ? 0.6 : 1, border: isMe ? 'none' : '1px solid var(--border)' }}>
                      <div>{msg.text}</div>
                      <div style={{ fontSize: '10px', marginTop: '3px', opacity: 0.5, textAlign: isMe ? 'right' : 'left' }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '7px', background: 'var(--surface-3)', flexShrink: 0 }}>
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                placeholder="Message... (Enter to send)" rows={1}
                style={{ flex: 1, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 10px', color: 'var(--ink)', fontFamily: 'inherit', fontSize: '13px', resize: 'none', outline: 'none', minHeight: '36px' }} />
              <button onClick={() => send()} disabled={!input.trim() || sending}
                style={{ padding: '7px 12px', borderRadius: '8px', background: input.trim() ? '#00e87a' : 'var(--border)', color: '#000', border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: '13px', flexShrink: 0, minWidth: '52px' }}>
                {sending ? '⏳' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ringBlink { 0%,100%{opacity:1} 50%{opacity:0.7} }
      `}</style>
    </div>
  );
}
