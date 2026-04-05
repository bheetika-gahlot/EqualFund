// Chat.jsx — No blink fix: stable refs, no useCallback re-render loop
import React, { useState, useEffect, useRef } from 'react';

const BASE = () => (import.meta.env.VITE_API_URL || 'https://equalfund-api.onrender.com/api');
const tok  = () => localStorage.getItem('ef-token');

// ─────────────────────────────────────────────────────────
// Chat Button — shown on loan cards
// ─────────────────────────────────────────────────────────
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
          alignItems: 'center', gap: '4px',
        }}>
        💬 Chat
      </button>

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

// ─────────────────────────────────────────────────────────
// Chat Window — fixed: uses refs for poll, no re-render loop
// ─────────────────────────────────────────────────────────
function ChatWindow({ loanId, otherAddress, otherName, myAddress, onClose }) {
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [sending,    setSending]    = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [vcActive,   setVcActive]   = useState(false);
  const [vcRoom,     setVcRoom]     = useState('');
  const [incoming,   setIncoming]   = useState(false);

  // ── STABLE REFS — never change between renders ─────────
  const bottomRef    = useRef(null);
  const pollRef      = useRef(null);
  const loanIdRef    = useRef(loanId);
  const otherAddrRef = useRef(otherAddress);
  const myAddrRef    = useRef(myAddress);
  const vcActiveRef  = useRef(vcActive);
  const vcRoomRef    = useRef(vcRoom);
  const mountedRef   = useRef(true);

  // Keep refs in sync without causing re-renders
  loanIdRef.current    = loanId;
  otherAddrRef.current = otherAddress;
  myAddrRef.current    = myAddress;
  vcActiveRef.current  = vcActive;
  vcRoomRef.current    = vcRoom;

  // ── Fetch messages using refs (no dependency array) ────
  const doFetch = () => {
    fetch(`${BASE()}/chat/${loanIdRef.current}/${otherAddrRef.current}`, {
      headers: { Authorization: `Bearer ${tok()}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!mountedRef.current || !data) return;
        setLoading(false);
        setMessages(data.messages || []);

        // Check for incoming VC invite
        if (!vcActiveRef.current) {
          const invite = (data.messages || []).find(m =>
            m.from?.toLowerCase() === otherAddrRef.current?.toLowerCase() &&
            m.text?.startsWith('__VC__:')
          );
          if (invite && invite.text !== vcRoomRef.current) {
            const room = invite.text.replace('__VC__:', '').trim();
            setVcRoom(room);
            setIncoming(true);
          }
        }
      })
      .catch(() => { if (mountedRef.current) setLoading(false); });
  };

  // Start polling on mount, clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    doFetch();
    pollRef.current = setInterval(doFetch, 2500);
    return () => {
      mountedRef.current = false;
      clearInterval(pollRef.current);
    };
  }, []); // ← empty deps intentional: refs handle the values

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ───────────────────────────────────────
  const sendMsg = async (text) => {
    const txt = (text || input).trim();
    if (!txt || sending) return;
    setInput('');
    setSending(true);

    // Optimistic UI
    setMessages(prev => [...prev, {
      _id: `tmp_${Date.now()}`, from: myAddrRef.current,
      text: txt, createdAt: new Date(), pending: true,
    }]);

    try {
      await fetch(`${BASE()}/chat/${loanIdRef.current}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ to: otherAddrRef.current, text: txt, loanId: loanIdRef.current }),
      });
      doFetch();
    } catch {}
    finally { setSending(false); }
  };

  // ── Start Video Call ───────────────────────────────────
  const startVC = async () => {
    const room = `EFLoan${loanId}x${Math.random().toString(36).slice(2, 6)}`;
    setVcRoom(room);
    setVcActive(true);
    setIncoming(false);
    await sendMsg(`__VC__:${room}`);
    // Notify other user
    fetch(`${BASE()}/chat/vc-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
      body: JSON.stringify({ to: otherAddress, loanId, room }),
    }).catch(() => {});
  };

  const joinVC = () => { setVcActive(true); setIncoming(false); };
  const endVC  = () => { setVcActive(false); };

  const onKey  = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } };

  // ── Render ─────────────────────────────────────────────
  return (
    <div
      // !! CRITICAL: stopPropagation on the ROOT div — prevents ANY parent click from closing
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
      }}>

      {/* Close on backdrop click */}
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />

      {/* Modal box — z-index above backdrop */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', zIndex: 1,
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: '18px', overflow: 'hidden',
          width: vcActive ? '860px' : '440px',
          height: vcActive ? '86vh' : '540px',
          maxWidth: '96vw', maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          transition: 'width 0.3s ease, height 0.3s ease',
        }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-3)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(0,232,122,0.15)', border: '1px solid rgba(0,232,122,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#00c965', fontSize: '13px', flexShrink: 0 }}>
              {(otherName || '?')[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '14px', lineHeight: 1 }}>{otherName || `${otherAddress?.slice(0, 8)}...`}</div>
              <div style={{ fontSize: '11px', color: '#00c965', marginTop: '3px' }}>Loan #{loanId}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {vcActive ? (
              <button onClick={endVC} style={{ padding: '5px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                ⏹ End Call
              </button>
            ) : (
              <button onClick={startVC} style={{ padding: '5px 12px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#00c965', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                📹 Video Call
              </button>
            )}
            <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--ink-3)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>

        {/* ── Incoming VC banner ── */}
        {incoming && !vcActive && (
          <div style={{ padding: '10px 16px', background: 'rgba(34,197,94,0.08)', borderBottom: '1px solid rgba(34,197,94,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#00c965' }}>📹 {otherName} is calling you!</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={joinVC} style={{ padding: '4px 14px', borderRadius: '7px', background: '#00e87a', color: '#000', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 800 }}>✅ Join</button>
              <button onClick={() => { setIncoming(false); setVcRoom(''); }} style={{ padding: '4px 10px', borderRadius: '7px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>Decline</button>
            </div>
          </div>
        )}

        {/* ── Body: VC iframe + messages ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Embedded Jitsi VC — no redirect */}
          {vcActive && vcRoom && (
            <div style={{ flex: 1, background: '#111', position: 'relative' }}>
              <iframe
                src={`https://meet.jit.si/${vcRoom}#config.startWithVideoMuted=false&config.startWithAudioMuted=false&config.disableDeepLinking=true&config.enableWelcomePage=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_BRAND_WATERMARK=false`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                title="EqualFund Video Call"
              />
              <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                🔴 LIVE · Loan #{loanId}
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{ width: vcActive ? '260px' : '100%', display: 'flex', flexDirection: 'column', borderLeft: vcActive ? '1px solid var(--border)' : 'none', minWidth: vcActive ? '260px' : undefined }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: '13px', paddingTop: '50px' }}>Loading...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: '50px' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>💬</div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-3)', lineHeight: 1.6 }}>Start a conversation<br />about Loan #{loanId}</div>
                </div>
              ) : messages.map((msg, i) => {
                const isMe = msg.from?.toLowerCase() === myAddress?.toLowerCase();
                const isVC = msg.text?.startsWith('__VC__:');
                if (isVC) return (
                  <div key={msg._id || i} style={{ textAlign: 'center', padding: '5px 10px', background: 'rgba(34,197,94,0.08)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.15)', fontSize: '12px', color: '#00c965', fontWeight: 600 }}>
                    📹 {isMe ? 'You started a video call' : `${otherName} started a video call`}
                  </div>
                );
                return (
                  <div key={msg._id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '82%', padding: '8px 11px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isMe ? 'var(--ink)' : 'var(--surface-3)', color: isMe ? 'var(--card-bg)' : 'var(--ink)', fontSize: '13px', lineHeight: 1.5, opacity: msg.pending ? 0.6 : 1, border: isMe ? 'none' : '1px solid var(--border)' }}>
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
              <textarea
                value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                placeholder="Message... (Enter to send)" rows={1}
                style={{ flex: 1, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 10px', color: 'var(--ink)', fontFamily: 'inherit', fontSize: '13px', resize: 'none', outline: 'none' }}
              />
              <button onClick={() => sendMsg()} disabled={!input.trim() || sending}
                style={{ padding: '7px 14px', borderRadius: '8px', background: input.trim() ? '#00e87a' : 'var(--border)', color: '#000', border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>
                {sending ? '⏳' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
