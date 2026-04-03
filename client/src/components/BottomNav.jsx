import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useMessages } from '../context/MessagesContext';
import { useAuth } from '../context/AuthContext';
import { resolveApiUrl } from '../utils/api';

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const TravelIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const MessageIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const BottomNav = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { getTotalUnread } = useMessages();
  const { user, logout } = useAuth();
  const totalUnread = getTotalUnread();
  const [showSheet, setShowSheet] = useState(false);
  const sheetRef = useRef(null);

  // Close sheet on back/route change
  useEffect(() => { setShowSheet(false); }, [location.pathname]);

  // Close sheet when clicking outside
  useEffect(() => {
    if (!showSheet) return;
    const handler = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) {
        setShowSheet(false);
      }
    };
    // slight delay so the tap that opened it doesn't immediately close it
    const timer = setTimeout(() => document.addEventListener('touchstart', handler), 100);
    return () => { clearTimeout(timer); document.removeEventListener('touchstart', handler); };
  }, [showSheet]);

  // Hide the nav when a chat is open
  const searchParams = new URLSearchParams(location.search);
  const chatOpen = location.pathname === '/messages' && !!searchParams.get('chat');
  if (chatOpen) return null;

  const handleLogout = async () => {
    setShowSheet(false);
    await logout();
    navigate('/login');
  };

  const avatarSrc = resolveApiUrl(user?.avatarUrl) ||
    `https://i.pravatar.cc/150?img=${Math.abs((user?.username?.charCodeAt(0) || 1)) % 70 + 1}`;

  const navItems = [
    { Icon: HomeIcon,    label: 'Home',     path: '/home' },
    { Icon: TravelIcon,  label: 'Travel',   path: '/travel' },
    { Icon: PlusIcon,    label: 'Create',   path: '/create', special: true },
    { Icon: MessageIcon, label: 'Messages', path: '/messages', badge: totalUnread },
  ];

  const isProfileActive = location.pathname === '/profile';

  const navStyle = {
    position: 'fixed', left: 0, right: 0, bottom: 0,
    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    padding: '0.5rem 0 calc(0.5rem + env(safe-area-inset-bottom, 0px))',
    background: 'rgba(8,12,24,0.96)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    zIndex: 300,
  };

  return (
    <>
      {/* ── Dark overlay when sheet is open ── */}
      {showSheet && (
        <div
          onClick={() => setShowSheet(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 290,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
          }}
        />
      )}

      {/* ── Profile slide-up sheet ── */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed',
          left: 0, right: 0,
          bottom: 0,
          // slides UP over the bottom nav when open
          transform: showSheet ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'rgba(8,12,24,0.99)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px 24px 0 0',
          zIndex: 400,
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
        }}
      >
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem 0 0.4rem' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* User info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.9rem',
          padding: '0.6rem 1.4rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <img
            src={avatarSrc}
            alt="profile"
            onError={e => { e.currentTarget.src = `https://i.pravatar.cc/150?img=${Math.abs((user?.username?.charCodeAt(0) || 1)) % 70 + 1}`; }}
            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2.5px solid var(--saffron, #f97316)', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>{user?.name || user?.username || 'User'}</div>
            {user?.username && <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>@{user.username}</div>}
          </div>
        </div>

        {/* Menu rows */}
        <div style={{ padding: '0.5rem 0.75rem' }}>
          {/* View Profile */}
          <div
            onClick={() => { setShowSheet(false); navigate('/profile'); }}
            style={sheetRowStyle}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            View Profile
          </div>

          {/* My Posts */}
          <div
            onClick={() => { setShowSheet(false); navigate('/profile?view=posts'); }}
            style={sheetRowStyle}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
            My Posts
          </div>

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0.3rem 0.5rem' }} />

          {/* Sign out */}
          <div
            onClick={handleLogout}
            style={{ ...sheetRowStyle, color: '#f87171' }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </div>
        </div>
      </div>

      {/* ── Bottom Navigation Bar ── */}
      <nav aria-label="bottom navigation" style={navStyle}>
        {navItems.map((it, i) => {
          const isActive = location.pathname === it.path;
          return (
            <Link
              key={i}
              to={it.path}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                textDecoration: 'none',
                color: isActive ? 'var(--saffron, #f97316)' : 'rgba(255,255,255,0.4)',
                position: 'relative',
                padding: it.special ? '6px 18px' : '4px 12px',
                borderRadius: it.special ? '20px' : '10px',
                background: it.special ? 'linear-gradient(135deg, var(--saffron, #f97316), var(--gold, #fbbf24))' : 'transparent',
                boxShadow: it.special ? '0 4px 14px rgba(249,115,22,0.35)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ position: 'relative', color: it.special ? 'white' : 'inherit', display: 'flex' }}>
                <it.Icon />
                {it.badge > 0 && (
                  <span style={{
                    position: 'absolute', top: '-4px', right: '-7px',
                    background: 'var(--saffron, #f97316)', color: 'white',
                    fontSize: '0.58rem', fontWeight: 700, borderRadius: '50%',
                    width: '14px', height: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1.5px solid rgba(8,12,24,0.9)',
                  }}>
                    {it.badge > 9 ? '9+' : it.badge}
                  </span>
                )}
              </span>
              <span style={{ fontSize: '0.62rem', fontWeight: isActive ? 700 : 400, color: it.special ? 'white' : 'inherit', lineHeight: 1 }}>
                {it.label}
              </span>
            </Link>
          );
        })}

        {/* Profile button — opens sheet */}
        <button
          id="mobile-profile-btn"
          onClick={() => setShowSheet(v => !v)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: isProfileActive || showSheet ? 'var(--saffron, #f97316)' : 'rgba(255,255,255,0.4)',
            padding: '4px 12px',
            borderRadius: '10px',
            transition: 'color 0.2s',
            minWidth: '48px',
          }}
        >
          <span style={{ display: 'flex', position: 'relative' }}>
            {/* Show avatar thumbnail if available */}
            {user?.avatarUrl ? (
              <img
                src={avatarSrc}
                alt="me"
                onError={e => { e.currentTarget.style.display = 'none'; }}
                style={{
                  width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover',
                  border: `2px solid ${isProfileActive || showSheet ? 'var(--saffron, #f97316)' : 'rgba(255,255,255,0.3)'}`,
                  transition: 'border-color 0.2s',
                }}
              />
            ) : (
              <ProfileIcon />
            )}
            {showSheet && (
              <span style={{
                position: 'absolute', bottom: '-3px', left: '50%', transform: 'translateX(-50%)',
                width: '4px', height: '4px', borderRadius: '50%',
                background: 'var(--saffron, #f97316)',
              }} />
            )}
          </span>
          <span style={{ fontSize: '0.62rem', fontWeight: isProfileActive || showSheet ? 700 : 400, lineHeight: 1 }}>
            Profile
          </span>
        </button>
      </nav>
    </>
  );
};

const sheetRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.85rem',
  padding: '0.9rem 0.75rem',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '0.95rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background 0.15s',
  WebkitTapHighlightColor: 'transparent',
};

export default BottomNav;
