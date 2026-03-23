import React, { useState, useEffect, useRef } from 'react';
import { notificationsAPI } from '../services/apiService';
import { useAuth } from '../context/AuthContext';

export default function NotificationBell() {
  const { isLoggedIn } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch unread count every 30 seconds
  useEffect(() => {
    if (!isLoggedIn) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const fetchUnreadCount = async () => {
    try {
      const count = await notificationsAPI.getUnreadCount();
      setUnreadCount(count);
    } catch (e) { /* silent fail */ }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationsAPI.getAll();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (e) { /* silent fail */ } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(!open);
    if (!open) fetchNotifications();
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) { /* silent */ }
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (!isLoggedIn) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button onClick={handleOpen} style={{
        width: '36px', height: '36px', borderRadius: '10px',
        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem', position: 'relative', transition: 'all 0.2s',
      }}>
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            background: 'linear-gradient(135deg,#ef4444,#dc2626)',
            color: 'white', borderRadius: '99px',
            fontSize: '0.6rem', fontWeight: 800,
            padding: '1px 5px', minWidth: '16px', textAlign: 'center',
            boxShadow: '0 0 8px rgba(239,68,68,0.5)',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '44px', right: 0,
          width: '340px', maxHeight: '480px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          animation: 'fadeInUp 0.2s ease', zIndex: 100,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Notifications {unreadCount > 0 && <span style={{ color: '#ef4444' }}>({unreadCount})</span>}
            </span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} style={{
                fontSize: '0.72rem', color: '#06b6d4', background: 'none',
                border: 'none', cursor: 'pointer', fontWeight: 600,
              }}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔕</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n._id} onClick={() => !n.read && handleMarkRead(n._id)}
                  style={{
                    padding: '0.875rem 1.25rem',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: n.read ? 'default' : 'pointer',
                    background: n.read ? 'transparent' : 'rgba(6,182,212,0.04)',
                    transition: 'background 0.2s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                    {!n.read && (
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#06b6d4', marginTop: '5px', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {n.message}
                      </div>
                      {n.txHash && (
                        <a href={`https://sepolia.etherscan.io/tx/${n.txHash}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: '0.7rem', color: '#06b6d4', fontFamily: 'monospace' }}>
                          🔗 View TX
                        </a>
                      )}
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.25rem', opacity: 0.6 }}>
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
