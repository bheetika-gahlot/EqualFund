import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';
import WalletDropdown from './WalletDropdown';

export default function Navbar() {
  const { user, logout, isLoggedIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { to: '/',            label: 'Home'        },
    { to: '/marketplace', label: 'Marketplace' },
    { to: '/borrow',      label: 'Borrow'      },
    { to: '/lend',        label: 'Lend'        },
    { to: '/ngo',         label: '🤝 NGO'      },
    { to: '/kyc',         label: 'KYC'         },
    ...(isLoggedIn ? [{ to: '/profile', label: 'Profile' }] : []),
  ];

  const handleLogout = () => { logout(); navigate('/login'); setMenuOpen(false); };
  const active = (to) => location.pathname === to;

  return (
    <nav className="navbar" style={{ boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.08)' : 'none' }}>

      {/* Logo */}
      <Link to="/" className="navbar-logo">
        <div className="navbar-logo-mark"><span>E</span></div>
        EqualFund
      </Link>

      {/* Desktop links */}
      <ul className="navbar-links" style={{ display: 'flex' }}>
        {links.map(({ to, label }) => (
          <li key={to}>
            <Link to={to} className={active(to) ? 'active' : ''}>{label}</Link>
          </li>
        ))}
        {isLoggedIn && user?.role === 'admin' && (
          <li><Link to="/admin" className={active('/admin') ? 'active' : ''}>Admin</Link></li>
        )}
      </ul>

      {/* Right side */}
      <div className="navbar-right">

        {/* Theme toggle */}
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle dark/light mode">
          <div className="toggle-knob">
            {theme === 'dark' ? '🌙' : '☀️'}
          </div>
        </button>

        <NotificationBell />

        {/* Auth */}
        {isLoggedIn ? (
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{ fontSize:'13px', color:'var(--ink-3)' }}>
              👤 {user?.name?.split(' ')[0]}
            </span>
            <button onClick={handleLogout}
              className="btn btn-out btn-sm"
              style={{ color:'var(--btn-out-text)' }}>
              Logout
            </button>
          </div>
        ) : (
          <Link to="/login"
            className="btn btn-out btn-sm"
            style={{ color:'var(--btn-out-text)' }}>
            Login
          </Link>
        )}

        {/* Wallet — FIXED: mint bg + black text always */}
        <WalletDropdown />

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display:'none', width:'36px', height:'36px', borderRadius:'8px',
            background:'var(--surface-3)', border:'1px solid var(--border)',
            cursor:'pointer', alignItems:'center', justifyContent:'center',
            color:'var(--ink)', fontSize:'1.1rem',
          }}
          className="mobile-menu-btn">
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position:'absolute', top:'58px', left:0, right:0,
          background:'var(--nav-bg)', borderBottom:'1px solid var(--border)',
          padding:'1rem', display:'flex', flexDirection:'column', gap:'4px',
          backdropFilter:'blur(20px)', zIndex:200,
        }}>
          {links.map(({ to, label }) => (
            <Link key={to} to={to} onClick={() => setMenuOpen(false)}
              style={{
                padding:'0.75rem 1rem', borderRadius:'10px', fontSize:'14px',
                fontWeight: active(to) ? 700 : 500,
                color: active(to) ? 'var(--mint-dim)' : 'var(--ink)',
                background: active(to) ? 'var(--mint-pale)' : 'transparent',
              }}>
              {label}
            </Link>
          ))}
          <div style={{ borderTop:'1px solid var(--border)', marginTop:'8px', paddingTop:'12px', display:'flex', flexDirection:'column', gap:'8px' }}>
            {isLoggedIn ? (
              <button onClick={handleLogout}
                className="btn btn-out"
                style={{ width:'100%', justifyContent:'center', color:'var(--btn-out-text)' }}>
                Logout
              </button>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)}
                className="btn btn-dark"
                style={{ width:'100%', justifyContent:'center' }}>
                Login / Register
              </Link>
            )}
            <button onClick={() => { toggleTheme(); setMenuOpen(false); }}
              style={{ padding:'0.75rem', borderRadius:'10px', background:'var(--surface-3)', border:'1px solid var(--border)', color:'var(--ink)', cursor:'pointer', fontWeight:600, fontSize:'14px' }}>
              {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media(max-width:768px){
          .navbar-links { display:none !important; }
          .mobile-menu-btn { display:flex !important; }
        }
      `}</style>
    </nav>
  );
}
