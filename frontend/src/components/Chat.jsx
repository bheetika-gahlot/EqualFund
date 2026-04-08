// Chat.jsx — Final fix:
// 1. VC opens as its OWN full-screen overlay (not inside chat window)
// 2. Chat window stays open during VC
// 3. Messages actually send and receive
// 4. Notifications sent to other party
import React, { useState, useEffect, useRef } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'https://equalfund-api.onrender.com/api';

async function chatFetch(method, path, body) {
  const tok = localStorage.getItem('ef-token');
  const opts = {
    method: method || 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const r = await fetch(BASE + path, opts);
    const d = await r.json().catch(() => ({}));
    return d;
  } catch { return {}; }
}

/* ─── Chat Button ─────────────────────────────────────── */
export function ChatButton({ loanId, otherUserAddress, otherUserName, currentUserAddress }) {
  const [open, setOpen] = useState(false);
  if (!otherUserAddress || !currentUserAddress) return null;
  if (otherUserAddress?.toLowerCase() === currentUserAddress?.toLowerCase()) return null;

  return (
    <>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        style={{ padding:'4px 10px', borderRadius:'7px', fontSize:'12px', fontWeight:700, background:'transparent', border:'1px solid var(--border)', color:'var(--ink-3)', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'4px' }}>
        💬 Chat
      </button>
      {open && (
        <ChatWindow
          loanId={Number(loanId)}
          otherAddress={String(otherUserAddress).toLowerCase()}
          otherName={otherUserName || otherUserAddress?.slice(0,8)+'...'}
          myAddress={String(currentUserAddress).toLowerCase()}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/* ─── Chat Window ─────────────────────────────────────── */
function ChatWindow({ loanId, otherAddress, otherName, myAddress, onClose }) {
  const [msgs,    setMsgs]    = useState([]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  // VC is separate overlay, not inside chat
  const [vcOpen,   setVcOpen]   = useState(false);
  const [vcRoom,   setVcRoom]   = useState('');
  const [incoming, setIncoming] = useState(false);

  const bottomRef = useRef(null);
  const pollRef   = useRef(null);
  const alive     = useRef(true);
  const vcRoomRef = useRef('');
  const vcOpenRef = useRef(false);

  /* Fetch messages */
  function doFetch() {
    chatFetch('GET', `/chat/${loanId}/${otherAddress}`).then(data => {
      if (!alive.current) return;
      setLoading(false);
      const msgs = data.messages || [];
      setMsgs(msgs);

      /* Detect incoming VC invite */
      if (!vcOpenRef.current) {
        const inv = [...msgs].reverse().find(m =>
          m.from?.toLowerCase() === otherAddress && m.text?.startsWith('__VC__:')
        );
        if (inv) {
          const room = inv.text.replace('__VC__:','').trim();
          if (room && room !== vcRoomRef.current) {
            vcRoomRef.current = room;
            setVcRoom(room);
            setIncoming(true);
          }
        }
      }
    });
  }

  useEffect(() => {
    alive.current  = true;
    doFetch();
    pollRef.current = setInterval(doFetch, 3000);
    return () => { alive.current = false; clearInterval(pollRef.current); };
  }, []); // eslint-disable-line

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [msgs]);

  /* Send message */
  async function sendMsg(txt) {
    const text = (txt || input).trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    setMsgs(p => [...p, { _id:'tmp'+Date.now(), from:myAddress, text, createdAt:new Date(), pending:true }]);
    await chatFetch('POST', `/chat/${loanId}`, { to:otherAddress, text, loanId });
    doFetch();
    setSending(false);
  }

  /* Start VC — opens as separate fullscreen overlay */
  async function startVC() {
    const room = `EF${loanId}${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    vcRoomRef.current = room;
    vcOpenRef.current = true;
    setVcRoom(room);
    setVcOpen(true);
    setIncoming(false);
    await sendMsg(`__VC__:${room}`);
    chatFetch('POST','/chat/vc-notify',{ to:otherAddress, loanId, room, callerName:myAddress.slice(0,8) });
  }

  function joinVC() { vcOpenRef.current = true; setVcOpen(true); setIncoming(false); }
  function endVC()  { vcOpenRef.current = false; setVcOpen(false); }
  function onKey(e) { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }

  return (
    <>
      {/* Chat window */}
      <div onMouseDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}
        style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center' }}>

        {/* Backdrop close */}
        <div style={{ position:'absolute', inset:0 }} onClick={onClose} />

        {/* Chat box */}
        <div onClick={e=>e.stopPropagation()} style={{ position:'relative', zIndex:1, width:'min(460px,96vw)', height:'560px', background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'18px', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 24px 60px rgba(0,0,0,0.4)' }}>

          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--surface-3)', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:'rgba(0,232,122,0.15)', border:'1px solid rgba(0,232,122,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#00c965', fontSize:'13px', flexShrink:0 }}>
                {(otherName||'?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:800, color:'var(--ink)', fontSize:'14px', lineHeight:1 }}>{otherName}</div>
                <div style={{ fontSize:'11px', color:'#00c965', marginTop:'3px' }}>● Loan #{loanId}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <button onClick={startVC} style={{ padding:'5px 12px', borderRadius:'8px', background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.25)', color:'#00c965', cursor:'pointer', fontSize:'12px', fontWeight:700 }}>
                📹 Video Call
              </button>
              <button onClick={onClose} style={{ width:'28px', height:'28px', borderRadius:'7px', background:'var(--surface-3)', border:'1px solid var(--border)', color:'var(--ink-3)', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
          </div>

          {/* Incoming call banner */}
          {incoming && (
            <div style={{ padding:'10px 16px', background:'rgba(34,197,94,0.1)', borderBottom:'1px solid rgba(34,197,94,0.2)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <span style={{ fontSize:'13px', fontWeight:700, color:'#00c965' }}>📹 {otherName} is calling!</span>
              <div style={{ display:'flex', gap:'6px' }}>
                <button onClick={joinVC} style={{ padding:'4px 14px', borderRadius:'7px', background:'#00e87a', color:'#000', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:800 }}>✅ Join</button>
                <button onClick={()=>{setIncoming(false);}} style={{ padding:'4px 10px', borderRadius:'7px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', cursor:'pointer', fontSize:'12px', fontWeight:700 }}>Decline</button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:'8px' }}>
            {loading ? (
              <div style={{ textAlign:'center', paddingTop:'60px', color:'var(--ink-3)', fontSize:'13px' }}>
                <div style={{ fontSize:'2rem', marginBottom:'8px' }}>💬</div>Loading...
              </div>
            ) : msgs.length === 0 ? (
              <div style={{ textAlign:'center', paddingTop:'60px' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:'10px' }}>💬</div>
                <div style={{ fontSize:'13px', color:'var(--ink-3)', lineHeight:1.6 }}>No messages yet.<br/>Start the conversation!</div>
              </div>
            ) : msgs.map((m,i) => {
              const isMe = m.from?.toLowerCase() === myAddress;
              const isVC = m.text?.startsWith('__VC__:');
              if (isVC) return (
                <div key={m._id||i} style={{ textAlign:'center', padding:'5px 10px', background:'rgba(34,197,94,0.08)', borderRadius:'8px', border:'1px solid rgba(34,197,94,0.15)', fontSize:'12px', color:'#00c965', fontWeight:600 }}>
                  📹 {isMe?'You started':''+otherName+' started'} a video call
                </div>
              );
              return (
                <div key={m._id||i} style={{ display:'flex', justifyContent:isMe?'flex-end':'flex-start' }}>
                  <div style={{ maxWidth:'80%', padding:'8px 12px', borderRadius:isMe?'14px 14px 4px 14px':'14px 14px 14px 4px', background:isMe?'var(--ink)':'var(--surface-3)', color:isMe?'var(--card-bg)':'var(--ink)', fontSize:'13px', lineHeight:1.5, opacity:m.pending?0.6:1, border:isMe?'none':'1px solid var(--border)' }}>
                    <div>{m.text}</div>
                    <div style={{ fontSize:'10px', marginTop:'3px', opacity:0.5, textAlign:isMe?'right':'left' }}>
                      {new Date(m.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                      {m.pending?' · sending...':''}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', display:'flex', gap:'7px', background:'var(--surface-3)', flexShrink:0 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={onKey}
              placeholder="Type a message..."
              style={{ flex:1, background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'8px', padding:'9px 12px', color:'var(--ink)', fontFamily:'inherit', fontSize:'13px', outline:'none' }} />
            <button onClick={()=>sendMsg()} disabled={!input.trim()||sending}
              style={{ padding:'8px 16px', borderRadius:'8px', background:input.trim()?'#00e87a':'var(--border)', color:'#000', border:'none', cursor:input.trim()?'pointer':'not-allowed', fontWeight:800, fontSize:'13px', flexShrink:0 }}>
              {sending?'⏳':'Send'}
            </button>
          </div>
        </div>
      </div>

      {/* ── VIDEO CALL as separate full-screen overlay ── */}
      {vcOpen && vcRoom && (
        <VideoCallOverlay room={vcRoom} loanId={loanId} onEnd={endVC} />
      )}
    </>
  );
}

/* ─── Video Call Overlay (separate from chat) ─────────── */
function VideoCallOverlay({ room, loanId, onEnd }) {
  return (
    <div onClick={e=>e.stopPropagation()} style={{
      position:'fixed', inset:0, zIndex:10000,
      background:'#000',
      display:'flex', flexDirection:'column',
    }}>
      {/* VC Header bar */}
      <div style={{ height:'48px', background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0, zIndex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#ef4444', animation:'blink 1s infinite' }} />
          <span style={{ color:'#fff', fontWeight:700, fontSize:'14px' }}>🔴 LIVE · EqualFund Loan #{loanId}</span>
        </div>
        <button onClick={onEnd} style={{ padding:'6px 18px', borderRadius:'8px', background:'rgba(239,68,68,0.9)', color:'#fff', border:'none', cursor:'pointer', fontWeight:800, fontSize:'13px' }}>
          ⏹ End Call
        </button>
      </div>

      {/* Jitsi iframe — full remaining height */}
      <iframe
        src={`https://meet.jit.si/${room}#config.startWithVideoMuted=false&config.startWithAudioMuted=false&config.disableDeepLinking=true&config.enableWelcomePage=false&config.prejoinPageEnabled=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_BRAND_WATERMARK=false&interfaceConfig.DEFAULT_BACKGROUND=%23000`}
        style={{ flex:1, width:'100%', border:'none', display:'block' }}
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
        title="EqualFund Video Call"
      />
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}
