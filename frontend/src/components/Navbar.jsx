import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import WalletDropdown from './WalletDropdown';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, isLoggedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/marketplace', label: 'Marketplace' },
    { to: '/borrow', label: 'Borrow' },
    { to: '/lend', label: 'Lend' },
    { to: '/ngo', label: '🤝 NGO' },
    { to: '/kyc', label: 'KYC' },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      borderBottom: '1px solid var(--border)',
      background: theme === 'dark' ? 'rgba(10,15,30,0.85)' : 'rgba(240,249,255,0.85)',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(6,182,212,0.3)',
            }}>
              <svg style={{ width: '20px', height: '20px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.15rem', background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              EqualFund
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to} className={`nav-link ${location.pathname === to ? 'active' : ''}`}>
                {label}
              </Link>
            ))}
            {isLoggedIn && user?.role === 'admin' && (
              <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>Admin</Link>
            )}
            {isLoggedIn && (
              <Link to="/profile" className={`nav-link ${location.pathname === '/profile' ? 'active' : ''}`}>Profile</Link>
            )}
          </div>

          {/* Right Side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>

            {/* Theme Toggle */}
            <button onClick={toggleTheme}
              style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', transition: 'all 0.2s',
              }}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Notifications */}
            <NotificationBell />

            {/* Auth */}
            {isLoggedIn ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  👤 {user?.name?.split(' ')[0]}
                </span>
                <button onClick={handleLogout} className="btn-secondary"
                  style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}>
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-secondary"
                style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                Login
              </Link>
            )}

            {/* Wallet Dropdown */}
            <WalletDropdown />

            {/* Mobile Toggle */}
            <button onClick={() => setMenuOpen(!menuOpen)}
              style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-secondary)', fontSize: '1.1rem',
              }}>
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div style={{
            borderTop: '1px solid var(--border)', padding: '0.75rem 0 1rem',
            display: 'flex', flexDirection: 'column', gap: '0.25rem',
            animation: 'fadeInUp 0.2s ease',
          }}>
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to} onClick={() => setMenuOpen(false)}
                style={{
                  padding: '0.625rem 0.75rem', borderRadius: '10px',
                  fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none',
                  color: location.pathname === to ? '#06b6d4' : 'var(--text-secondary)',
                  background: location.pathname === to ? 'rgba(6,182,212,0.08)' : 'transparent',
                }}>
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
