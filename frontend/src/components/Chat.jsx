// Chat.jsx — Complete rewrite. No imports from other files.
// Fix: uses setInterval with stable closure via refs (no blink)
// Fix: embedded Jitsi iframe (no window.open)
// Fix: stopPropagation properly on modal wrapper
import React, { useState, useEffect, useRef } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'https://equalfund-api.onrender.com/api';

async function chatGet(path) {
  const tok = localStorage.getItem('ef-token');
  const r   = await fetch(BASE + path, { headers: { Authorization: `Bearer ${tok}` } });
  return r.ok ? r.json() : null;
}

async function chatPost(path, body) {
  const tok = localStorage.getItem('ef-token');
  const r   = await fetch(BASE + path, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    body:    JSON.stringify(body),
  });
  return r.ok ? r.json() : null;
}

/* ─── Chat Button ─────────────────────────────────────── */
export function ChatButton({ loanId, otherUserAddress, otherUserName, currentUserAddress }) {
  const [open, setOpen] = useState(false);

  if (!otherUserAddress || !currentUserAddress) return null;
  if (otherUserAddress.toLowerCase() === currentUserAddress.toLowerCase()) return null;

  return (
    <>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        style={{
          padding: '4px 10px', borderRadius: '7px', fontSize: '12px', fontWeight: 700,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--ink-3)', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: '4px',
        }}>
        💬 Chat
      </button>

      {open && (
        <ChatWindow
          loanId={Number(loanId)}
          otherAddress={otherUserAddress.toLowerCase()}
          otherName={otherUserName}
          myAddress={currentUserAddress.toLowerCase()}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/* ─── Chat Window ─────────────────────────────────────── */
function ChatWindow({ loanId, otherAddress, otherName, myAddress, onClose }) {
  const [msgs,     setMsgs]     = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [vcActive, setVcActive] = useState(false);
  const [vcRoom,   setVcRoom]   = useState('');
  const [incoming, setIncoming] = useState(false);

  const bottom   = useRef(null);
  const interval = useRef(null);
  const alive    = useRef(true);
  const vcRef    = useRef({ active: false, room: '' });

  /* poll messages — stable closure, no deps needed */
  function poll() {
    chatGet(`/chat/${loanId}/${otherAddress}`).then(data => {
      if (!alive.current || !data) return;
      setLoading(false);
      setMsgs(data.messages || []);

      // detect incoming VC invite from other person
      if (!vcRef.current.active) {
        const inv = (data.messages || []).reverse().find(m =>
          m.from?.toLowerCase() === otherAddress && m.text?.startsWith('__VC__:')
        );
        if (inv) {
          const room = inv.text.replace('__VC__:', '').trim();
          if (room !== vcRef.current.room) {
            vcRef.current.room = room;
            setVcRoom(room);
            setIncoming(true);
          }
        }
      }
    }).catch(() => { if (alive.current) setLoading(false); });
  }

  useEffect(() => {
    alive.current = true;
    poll();
    interval.current = setInterval(poll, 3000);
    return () => { alive.current = false; clearInterval(interval.current); };
  }, []); // intentionally empty — refs hold values

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  async function sendMsg(text) {
    const txt = (text || input).trim();
    if (!txt || sending) return;
    setInput('');
    setSending(true);
    setMsgs(prev => [...prev, { _id: 'tmp' + Date.now(), from: myAddress, text: txt, createdAt: new Date(), pending: true }]);
    await chatPost(`/chat/${loanId}`, { to: otherAddress, text: txt, loanId });
    poll();
    setSending(false);
  }

  async function startVC() {
    const room = `EF${loanId}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    vcRef.current = { active: true, room };
    setVcRoom(room); setVcActive(true); setIncoming(false);
    await sendMsg(`__VC__:${room}`);
    chatPost('/chat/vc-notify', { to: otherAddress, loanId, room }).catch(() => {});
  }

  function joinVC()  { vcRef.current.active = true; setVcActive(true); setIncoming(false); }
  function endVC()   { vcRef.current.active = false; setVcActive(false); }
  function onKey(e)  { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }

  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>

      {/* backdrop click closes */}
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />

      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', zIndex: 1,
          width:     vcActive ? 'min(880px, 96vw)' : 'min(460px, 96vw)',
          height:    vcActive ? '88vh' : '560px',
          maxHeight: '94vh',
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: '18px', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          transition: 'width 0.3s, height 0.3s',
        }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--surface-3)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'34px', height:'34px', borderRadius:'10px', background:'rgba(0,232,122,0.15)', border:'1px solid rgba(0,232,122,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#00c965', fontSize:'14px', flexShrink:0 }}>
              {(otherName || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight:800, color:'var(--ink)', fontSize:'14px', lineHeight:1 }}>{otherName || otherAddress.slice(0,10)+'...'}</div>
              <div style={{ fontSize:'11px', color:'#00c965', marginTop:'3px' }}>● Loan #{loanId}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            {vcActive
              ? <button onClick={endVC}   style={btnStyle('#ef4444')}>⏹ End Call</button>
              : <button onClick={startVC} style={btnStyle('#00c965')}>📹 Video Call</button>}
            <button onClick={onClose} style={{ width:'28px', height:'28px', borderRadius:'7px', background:'var(--surface-3)', border:'1px solid var(--border)', color:'var(--ink-3)', cursor:'pointer', fontSize:'15px', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          </div>
        </div>

        {/* ── Incoming call banner ── */}
        {incoming && !vcActive && (
          <div style={{ padding:'8px 16px', background:'rgba(0,232,122,0.1)', borderBottom:'1px solid rgba(0,232,122,0.2)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
            <span style={{ fontSize:'13px', fontWeight:700, color:'#00c965' }}>📹 {otherName} is calling!</span>
            <div style={{ display:'flex', gap:'6px' }}>
              <button onClick={joinVC} style={{ padding:'4px 14px', borderRadius:'7px', background:'#00e87a', color:'#000', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:800 }}>✅ Join</button>
              <button onClick={() => { setIncoming(false); setVcRoom(''); vcRef.current.room = ''; }} style={{ padding:'4px 10px', borderRadius:'7px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', cursor:'pointer', fontSize:'12px', fontWeight:700 }}>Decline</button>
            </div>
          </div>
        )}

        {/* ── Body ── */}
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* Embedded Jitsi — no redirect */}
          {vcActive && vcRoom && (
            <div style={{ flex:1, background:'#000', position:'relative' }}>
              <iframe
                src={`https://meet.jit.si/${vcRoom}#config.startWithVideoMuted=false&config.startWithAudioMuted=false&config.disableDeepLinking=true&config.enableWelcomePage=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_BRAND_WATERMARK=false`}
                style={{ width:'100%', height:'100%', border:'none' }}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                title="Video Call"
              />
              <div style={{ position:'absolute', top:'8px', left:'8px', background:'rgba(0,0,0,0.7)', color:'#fff', padding:'3px 10px', borderRadius:'6px', fontSize:'11px', fontWeight:700 }}>
                🔴 LIVE · Loan #{loanId}
              </div>
            </div>
          )}

          {/* Messages panel */}
          <div style={{ width: vcActive ? '260px' : '100%', display:'flex', flexDirection:'column', borderLeft: vcActive ? '1px solid var(--border)' : 'none' }}>
            <div style={{ flex:1, overflowY:'auto', padding:'12px', display:'flex', flexDirection:'column', gap:'8px' }}>

              {loading ? (
                <div style={{ textAlign:'center', paddingTop:'60px', color:'var(--ink-3)', fontSize:'13px' }}>
                  <div style={{ fontSize:'2rem', marginBottom:'8px' }}>💬</div>
                  Loading messages...
                </div>
              ) : msgs.length === 0 ? (
                <div style={{ textAlign:'center', paddingTop:'60px' }}>
                  <div style={{ fontSize:'2.5rem', marginBottom:'10px' }}>💬</div>
                  <div style={{ fontSize:'13px', color:'var(--ink-3)', lineHeight:1.6 }}>No messages yet.<br/>Start the conversation!</div>
                </div>
              ) : msgs.map((m, i) => {
                const isMe = m.from?.toLowerCase() === myAddress;
                const isVC = m.text?.startsWith('__VC__:');
                if (isVC) return (
                  <div key={m._id || i} style={{ textAlign:'center', padding:'5px 10px', background:'rgba(0,232,122,0.08)', borderRadius:'8px', border:'1px solid rgba(0,232,122,0.15)', fontSize:'12px', color:'#00c965', fontWeight:600 }}>
                    📹 {isMe ? 'You' : otherName} started a video call
                  </div>
                );
                return (
                  <div key={m._id || i} style={{ display:'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth:'80%', padding:'8px 12px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isMe ? 'var(--ink)' : 'var(--surface-3)', color: isMe ? 'var(--card-bg)' : 'var(--ink)', fontSize:'13px', lineHeight:1.5, opacity: m.pending ? 0.6 : 1, border: isMe ? 'none' : '1px solid var(--border)' }}>
                      <div>{m.text}</div>
                      <div style={{ fontSize:'10px', marginTop:'3px', opacity:0.5, textAlign: isMe ? 'right' : 'left' }}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottom} />
            </div>

            {/* Input */}
            <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', display:'flex', gap:'7px', background:'var(--surface-3)', flexShrink:0 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Type a message..."
                style={{ flex:1, background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'8px', padding:'8px 12px', color:'var(--ink)', fontFamily:'inherit', fontSize:'13px', outline:'none' }}
              />
              <button onClick={() => sendMsg()} disabled={!input.trim() || sending}
                style={{ padding:'8px 14px', borderRadius:'8px', background: input.trim() ? '#00e87a' : 'var(--border)', color:'#000', border:'none', cursor: input.trim() ? 'pointer' : 'not-allowed', fontWeight:800, fontSize:'13px', flexShrink:0, minWidth:'60px' }}>
                {sending ? '⏳' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function btnStyle(color) {
  return { padding:'5px 12px', borderRadius:'8px', background:`${color}15`, border:`1px solid ${color}40`, color, cursor:'pointer', fontSize:'12px', fontWeight:700 };
}
