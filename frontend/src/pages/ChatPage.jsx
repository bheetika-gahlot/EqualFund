// ChatPage.jsx — Opens in new tab, full-screen chat + embedded VC
// Route: /chat/:loanId/:otherAddress
// No glitch, no overlay issues, clean full page
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const BASE = import.meta.env.VITE_API_URL || 'https://equalfund-api.onrender.com/api';
const tok  = () => localStorage.getItem('ef-token');

async function apiFetch(method, path, body) {
  try {
    const r = await fetch(BASE + path, {
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return r.json().catch(() => ({}));
  } catch { return {}; }
}

export default function ChatPage() {
  const { loanId, otherAddress } = useParams();
  const [searchParams] = useSearchParams();
  const otherName   = searchParams.get('name') || otherAddress?.slice(0, 8) + '...';
  const myAddress   = searchParams.get('me')   || '';

  const [msgs,     setMsgs]     = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [vcActive, setVcActive] = useState(false);
  const [vcRoom,   setVcRoom]   = useState('');
  const [incoming, setIncoming] = useState(false);
  const [notif,    setNotif]    = useState('');    // top banner notification

  const bottomRef  = useRef(null);
  const pollRef    = useRef(null);
  const alive      = useRef(true);
  const vcRoomRef  = useRef('');
  const vcActiveRef= useRef(false);

  // ── Fetch messages ──────────────────────────────────────
  function doFetch() {
    apiFetch('GET', `/chat/${loanId}/${otherAddress}`).then(data => {
      if (!alive.current) return;
      setLoading(false);
      const newMsgs = data.messages || [];
      setMsgs(prev => {
        // Only update if changed
        if (JSON.stringify(prev.map(m=>m._id)) === JSON.stringify(newMsgs.map(m=>m._id))) return prev;
        return newMsgs;
      });

      // Check for incoming VC invite
      if (!vcActiveRef.current) {
        const inv = [...newMsgs].reverse().find(m =>
          m.from?.toLowerCase() === otherAddress?.toLowerCase() &&
          m.text?.startsWith('__VC__:')
        );
        if (inv) {
          const room = inv.text.replace('__VC__:', '').trim();
          if (room && room !== vcRoomRef.current) {
            vcRoomRef.current = room;
            setVcRoom(room);
            setIncoming(true);
            setNotif(`📹 ${otherName} is calling! Accept or Decline below.`);
          }
        }
      }
    });
  }

  useEffect(() => {
    alive.current = true;
    doFetch();
    pollRef.current = setInterval(doFetch, 2500);
    return () => { alive.current = false; clearInterval(pollRef.current); };
  }, []); // eslint-disable-line

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  // ── Send message + notification ─────────────────────────
  async function sendMsg(txt) {
    const text = (txt || input).trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    // Optimistic
    setMsgs(prev => [...prev, { _id: 'tmp' + Date.now(), from: myAddress, text, createdAt: new Date(), pending: true }]);
    await apiFetch('POST', `/chat/${loanId}`, { to: otherAddress, text, loanId: Number(loanId) });
    doFetch();
    setSending(false);
  }

  // ── Start Video Call ────────────────────────────────────
  async function startVC() {
    const room = `EF${loanId}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    vcRoomRef.current  = room;
    vcActiveRef.current= true;
    setVcRoom(room);
    setVcActive(true);
    setIncoming(false);
    // Send VC invite message (also triggers notification via backend)
    await sendMsg(`__VC__:${room}`);
    // Also send explicit VC notification
    apiFetch('POST', '/chat/vc-notify', { to: otherAddress, loanId: Number(loanId), room, callerName: myAddress.slice(0, 8) });
  }

  function joinVC() { vcActiveRef.current = true; setVcActive(true); setIncoming(false); setNotif(''); }
  function endVC()  { vcActiveRef.current = false; setVcActive(false); }
  function onKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0d1018', color: '#f0f4ff', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: '#141821', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Logo */}
          <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#00e87a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000', fontSize: '13px' }}>E</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '14px', color: '#f0f4ff', lineHeight: 1 }}>
              Chat with {otherName}
            </div>
            <div style={{ fontSize: '11px', color: '#00c965', marginTop: '3px' }}>Loan #{loanId} · EqualFund</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {vcActive ? (
            <button onClick={endVC} style={{ padding: '7px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
              ⏹ End Video Call
            </button>
          ) : (
            <button onClick={startVC} style={{ padding: '7px 16px', borderRadius: '8px', background: 'rgba(0,232,122,0.12)', border: '1px solid rgba(0,232,122,0.25)', color: '#00c965', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
              📹 Start Video Call
            </button>
          )}
          <button onClick={() => window.close()} style={{ padding: '7px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9aa3bb', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            ✕ Close
          </button>
        </div>
      </div>

      {/* ── Incoming VC banner ── */}
      {incoming && !vcActive && (
        <div style={{ padding: '12px 20px', background: 'rgba(0,232,122,0.1)', borderBottom: '1px solid rgba(0,232,122,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '1.2rem' }}>📹</div>
            <div>
              <div style={{ fontWeight: 700, color: '#00c965', fontSize: '14px' }}>{otherName} is calling you!</div>
              <div style={{ fontSize: '12px', color: '#6b7590' }}>Incoming video call for Loan #{loanId}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={joinVC} style={{ padding: '8px 20px', borderRadius: '8px', background: '#00e87a', color: '#000', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 800 }}>✅ Accept</button>
            <button onClick={() => { setIncoming(false); setNotif(''); }} style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>Decline</button>
          </div>
        </div>
      )}

      {/* ── Notification banner ── */}
      {notif && !incoming && (
        <div style={{ padding: '8px 20px', background: 'rgba(0,232,122,0.08)', borderBottom: '1px solid rgba(0,232,122,0.15)', fontSize: '13px', color: '#00c965', display: 'flex', justifyContent: 'space-between' }}>
          <span>{notif}</span>
          <button onClick={() => setNotif('')} style={{ background: 'none', border: 'none', color: '#6b7590', cursor: 'pointer', fontSize: '14px' }}>✕</button>
        </div>
      )}

      {/* ── Main area: VC + chat side by side ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Video Call area */}
        {vcActive && vcRoom && (
          <div style={{ flex: 1, background: '#000', position: 'relative', minWidth: 0 }}>
            <iframe
              src={`https://meet.jit.si/${vcRoom}#config.startWithVideoMuted=false&config.startWithAudioMuted=false&config.disableDeepLinking=true&config.enableWelcomePage=false&config.prejoinPageEnabled=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_BRAND_WATERMARK=false`}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
              title="EqualFund Video Call"
            />
            <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
              🔴 LIVE · Loan #{loanId}
            </div>
          </div>
        )}

        {/* Chat panel — always visible, width adapts */}
        <div style={{ width: vcActive ? '340px' : '100%', display: 'flex', flexDirection: 'column', borderLeft: vcActive ? '1px solid rgba(255,255,255,0.08)' : 'none', background: '#0d1018', minWidth: vcActive ? '340px' : undefined }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', paddingTop: '80px', color: '#6b7590', fontSize: '13px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>💬</div>
                Loading messages...
              </div>
            ) : msgs.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: '80px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>💬</div>
                <div style={{ fontSize: '14px', color: '#6b7590', lineHeight: 1.7 }}>
                  No messages yet.<br />Say hello to {otherName}!
                </div>
              </div>
            ) : msgs.map((m, i) => {
              const isMe = m.from?.toLowerCase() === myAddress?.toLowerCase();
              const isVC = m.text?.startsWith('__VC__:');
              if (isVC) return (
                <div key={m._id || i} style={{ textAlign: 'center', padding: '6px 12px', background: 'rgba(0,232,122,0.08)', borderRadius: '10px', border: '1px solid rgba(0,232,122,0.15)', fontSize: '12px', color: '#00c965', fontWeight: 600 }}>
                  📹 {isMe ? 'You' : otherName} started a video call
                </div>
              );
              return (
                <div key={m._id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-end' }}>
                  {!isMe && (
                    <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(0,232,122,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#00c965', flexShrink: 0 }}>
                      {(otherName||'?')[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ maxWidth: '75%', padding: '9px 13px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMe ? '#00e87a' : '#141821', color: isMe ? '#000' : '#f0f4ff', fontSize: '13px', lineHeight: 1.55, opacity: m.pending ? 0.6 : 1, border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontWeight: isMe ? 600 : 400 }}>{m.text}</div>
                    <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6, textAlign: isMe ? 'right' : 'left', color: isMe ? 'rgba(0,0,0,0.6)' : '#6b7590' }}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {m.pending ? ' · sending...' : ''}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '8px', background: '#141821', flexShrink: 0 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={`Message ${otherName}...`}
              style={{ flex: 1, background: '#1e2535', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#f0f4ff', fontFamily: 'inherit', fontSize: '13px', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,232,122,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            <button
              onClick={() => sendMsg()}
              disabled={!input.trim() || sending}
              style={{ padding: '10px 18px', borderRadius: '10px', background: input.trim() && !sending ? '#00e87a' : '#1e2535', color: input.trim() ? '#000' : '#3d4560', border: 'none', cursor: input.trim() && !sending ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: '13px', flexShrink: 0, transition: 'all 0.2s', minWidth: '70px' }}>
              {sending ? '⏳' : 'Send ↑'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
