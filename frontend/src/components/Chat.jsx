// Chat.jsx — Opens chat in new tab (no overlay, no glitch)
// ChatPage.jsx handles everything in its own window
import React from 'react';

export function ChatButton({ loanId, otherUserAddress, otherUserName, currentUserAddress }) {
  if (!otherUserAddress || !currentUserAddress) return null;
  if (otherUserAddress?.toLowerCase() === currentUserAddress?.toLowerCase()) return null;

  function openChat() {
    const name = encodeURIComponent(otherUserName || otherUserAddress.slice(0, 8));
    const me   = encodeURIComponent(currentUserAddress.toLowerCase());
    const url  = `/chat/${loanId}/${otherUserAddress.toLowerCase()}?name=${name}&me=${me}`;
    window.open(url, `chat_${loanId}`, 'width=900,height=700,scrollbars=no,toolbar=no,menubar=no');
  }

  return (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); openChat(); }}
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
  );
}

// Kept for any remaining imports
export default ChatButton;
