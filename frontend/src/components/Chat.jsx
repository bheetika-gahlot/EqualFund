// Chat.jsx — Embedded video call + working chat with notifications
// Video call: embedded Jitsi iframe (NO redirect, stays on your site)
// Chat: polls backend every 2s, sends notification to other user
import React, { useState, useEffect, useRef, useCallback } from 'react';

const API = () => (import.meta.env.VITE_API_URL || 'https://equalfund-api.onrender.com/api');
const tok = () => localStorage.getItem('ef-token');

const apiFetch = async (path, opts = {}) => {
  const r = await fetch(`${API()}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}`, ...opts.headers },
    ...opts,
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
};

// ── Chat Button (small, inline) ──────────────────────────
export function ChatButton({ loanId, otherUserAddress, otherUserName, currentUserAddress }) {
  const [open, setOpen] = useState(false);
  if (!otherUserAddress || !currentUserAddress) return null;
  if (otherUserAddress?.toLowerCase() === currentUserAddress?.toLowerCase()) return null;

  return (
    <>
      <button onClick={e => { e.stopPropagation(); setOpen(true); }}
        style={{ padding: '4px 10px', borderRadius: '7px', fontSize: '12px', fontWeight: 700, background: 'transparent', border: '1px solid var(--border)', color: 'var(--ink-3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--mint)'; e.currentTarget.style.color = 'var(--mint-dim)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--ink-3)'; }}>
        💬 Chat
      </button>
      {open && (
        <ChatModal loanId={loanId} otherAddress={otherUserAddress} otherName={otherUserName} myAddress={currentUserAddress} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

// ── Main Chat Modal with embedded VC ─────────────────────
export function ChatModal({ loanId, otherAddress, otherName, myAddress, onClose }) {
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [vcActive,  setVcActive]  = useState(false);
  const [vcRoom,    setVcRoom]    = useState('');
  const [vcInvited, setVcInvited] = useState(false);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);
  const iframeRef = useRef(null);

  // ── Fetch messages ────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    try {
      const data = await apiFetch(`/chat/${loanId}/${otherAddress}`);
      setMessages(data.messages || []);

      // Check for incoming video call invite
      const vcMsg = (data.messages || []).find(m =>
        m.from?.toLowerCase() === otherAddress?.toLowerCase() &&
        m.text?.startsWith('📹 VIDEO_CALL_INVITE:') && !m.vcJoined
      );
      if (vcMsg && !vcActive) {
        const room = vcMsg.text.split('📹 VIDEO_CALL_INVITE:')[1]?.trim();
        if (room) setVcRoom(room);
      }
    } catch {} finally { setLoading(false); }
  }, [loanId, otherAddress, vcActive]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 2000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ──────────────────────────────────────
  const sendMessage = async (text, isSystem = false) => {
    if (!text?.trim() && !isSystem) return;
    if (sending) return;
    setSending(true);
    const msgText = text.trim();
    setInput('');

    // Optimistic
    const temp = { _id: Date.now(), from: myAddress, text: msgText, createdAt: new Date(), pending: true };
    setMessages(prev => [...prev, temp]);

    try {
      await apiFetch(`/chat/${loanId}`, {
        method: 'POST',
        body: JSON.stringify({ to: otherAddress, text: msgText, loanId }),
      });
      await fetchMessages();
    } catch { } finally { setSending(false); }
  };

  // ── Start Video Call (embedded) ───────────────────────
  const startVideoCall = async () => {
    const room = `EqualFund-Loan${loanId}-${Math.random().toString(36).slice(2, 8)}`;
    setVcRoom(room);
    setVcActive(true);

    // Send invite message + notification
    await sendMessage(`📹 VIDEO_CALL_INVITE: ${room}`, true);

    // Send notification to other user
    try {
      await apiFetch('/chat/vc-notify', {
        method: 'POST',
        body: JSON.stringify({ to: otherAddress, loanId, room, callerName: myAddress?.slice(0, 8) }),
      });
    } catch {}
  };

  // ── Join incoming video call ──────────────────────────
  const joinVideoCall = () => {
    setVcActive(true);
  };

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '18px', width: '100%', maxWidth: vcActive ? '900px' : '460px', height: vcActive ? '90vh' : '560px', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'all 0.3s ease' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-3)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(0,232,122,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--mint-dim)', fontSize: '13px' }}>
              {(otherName || '?')[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '13px' }}>{otherName || `${otherAddress?.slice(0, 8)}...`}</div>
              <div style={{ fontSize: '11px', color: 'var(--mint-dim)' }}>Loan #{loanId}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Video Call Toggle */}
            {!vcActive ? (
              <button onClick={startVideoCall}
                style={{ padding: '5px 12px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: 'var(--mint-dim)', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                📹 Start Video Call
              </button>
            ) : (
              <button onClick={() => setVcActive(false)}
                style={{ padding: '5px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                ⏹ End Call
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: '1.1rem', padding: '2px 6px' }}>✕</button>
          </div>
        </div>

        {/* Incoming call banner */}
        {!vcActive && vcRoom && (
          <div style={{ padding: '10px 16px', background: 'rgba(34,197,94,0.08)', borderBottom: '1px solid rgba(34,197,94,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'pulse 2s infinite' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--mint-dim)' }}>📹 Incoming video call from {otherName}!</span>
            <button onClick={joinVideoCall}
              style={{ padding: '5px 14px', borderRadius: '8px', background: 'var(--mint)', color: '#000', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 800 }}>
              Join Call
            </button>
          </div>
        )}

        {/* Main content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: vcActive ? 'row' : 'column', overflow: 'hidden' }}>

          {/* ── EMBEDDED VIDEO CALL (Jitsi in iframe) ── */}
          {vcActive && (
            <div style={{ flex: 1, background: '#000', position: 'relative', minWidth: '400px' }}>
              <iframe
                ref={iframeRef}
                src={`https://meet.jit.si/${vcRoom}#userInfo.displayName="${myAddress?.slice(0,8)}"&config.startWithVideoMuted=false&config.startWithAudioMuted=false&config.disableDeepLinking=true&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false&interfaceConfig.SHOW_BRAND_WATERMARK=false&interfaceConfig.DEFAULT_BACKGROUND=#0d1018`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                title="Video Call"
              />
              <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                🔴 LIVE · EqualFund Loan #{loanId}
              </div>
            </div>
          )}

          {/* ── MESSAGES ── */}
          <div style={{ width: vcActive ? '280px' : '100%', display: 'flex', flexDirection: 'column', borderLeft: vcActive ? '1px solid var(--border)' : 'none' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: '13px', marginTop: '3rem' }}>Loading...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: '13px', marginTop: '3rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💬</div>
                  Start a conversation about Loan #{loanId}
                </div>
              ) : messages.map((msg, i) => {
                const isMe      = msg.from?.toLowerCase() === myAddress?.toLowerCase();
                const isVcMsg   = msg.text?.startsWith('📹 VIDEO_CALL_INVITE:');
                if (isVcMsg) {
                  return (
                    <div key={msg._id || i} style={{ textAlign: 'center', padding: '6px', background: 'rgba(34,197,94,0.08)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.15)', fontSize: '12px', color: 'var(--mint-dim)', fontWeight: 600 }}>
                      📹 {isMe ? 'You started a video call' : `${otherName} started a video call`}
                    </div>
                  );
                }
                return (
                  <div key={msg._id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '80%', padding: '7px 11px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isMe ? 'var(--ink)' : 'var(--surface-3)', color: isMe ? 'var(--card-bg)' : 'var(--ink)', fontSize: '13px', lineHeight: 1.5, opacity: msg.pending ? 0.6 : 1, border: isMe ? 'none' : '1px solid var(--border)' }}>
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
            <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '6px', background: 'var(--surface-3)', flexShrink: 0 }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder="Message... (Enter to send)" rows={1}
                style={{ flex: 1, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 10px', color: 'var(--ink)', fontFamily: 'inherit', fontSize: '13px', resize: 'none', outline: 'none' }} />
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || sending}
                style={{ padding: '7px 12px', borderRadius: '8px', background: input.trim() ? 'var(--mint)' : 'var(--border)', color: '#000', border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>
                {sending ? '⏳' : '↑'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.7}}`}</style>
    </div>
  );
}
