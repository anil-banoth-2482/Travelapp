import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useMessages } from '../context/MessagesContext';
import { useAuth } from '../context/AuthContext';

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const TravelIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const MessageIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const BottomNav = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { getTotalUnread } = useMessages();
  const { user, logout } = useAuth();
  const totalUnread = getTotalUnread();

  const [showProfileSheet, setShowProfileSheet] = useState(false);

  // Hide the nav when a chat is open so it doesn't cover the input panel
  const searchParams = new URLSearchParams(location.search);
  const chatOpen = location.pathname === '/messages' && !!searchParams.get('chat');
  if (chatOpen) return null;

  const handleLogout = async () => {
    setShowProfileSheet(false);
    await logout();
    navigate('/login');
  };

  const navItems = [
    { Icon: HomeIcon,    label: 'Home',     path: '/home' },
    { Icon: TravelIcon,  label: 'Travel',   path: '/travel' },
    { Icon: PlusIcon,    label: 'Create',   path: '/create', special: true },
    { Icon: MessageIcon, label: 'Messages', path: '/messages', badge: totalUnread },
  ];

  const isProfileActive = location.pathname === '/profile';

  return (
    <>
      {/* Profile action sheet overlay */}
      {showProfileSheet && (
        <div
          onClick={() => setShowProfileSheet(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Profile slide-up sheet */}
      <div style={{
        position: 'fixed',
        bottom: showProfileSheet ? '64px' : '-300px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 2rem)',
        maxWidth: '420px',
        background: 'rgba(8,12,24,0.98)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px 20px 0 0',
        zIndex: 201,
        transition: 'bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Sheet handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem 0 0.25rem' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* User info header */}
        <div style={{ padding: '0.75rem 1.25rem 1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <img
            src={user?.avatarUrl || `https://i.pravatar.cc/150?img=1`}
            alt="Profile"
            style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--saffron, #f97316)' }}
          />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{user?.name || user?.username || 'User'}</div>
            {user?.username && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>@{user.username}</div>}
          </div>
        </div>

        {/* Menu items */}
        <div style={{ padding: '0.5rem' }}>
          <Link
            to="/profile"
            onClick={() => setShowProfileSheet(false)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '12px', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}
          >
            <ProfileIcon />
            View Profile
          </Link>
          <Link
            to="/profile?view=posts"
            onClick={() => setShowProfileSheet(false)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '12px', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            My Posts
          </Link>

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0.25rem 0' }} />

          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              width: '100%', padding: '0.85rem 1rem',
              borderRadius: '12px', background: 'transparent',
              border: 'none', color: '#f87171',
              fontSize: '0.9rem', fontWeight: 600,
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <LogoutIcon />
            Sign out
          </button>
        </div>

        {/* Bottom safe area padding */}
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>

      {/* Bottom Nav Bar */}
      <nav
        aria-label="bottom navigation"
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          padding: '0.5rem 0 calc(0.5rem + env(safe-area-inset-bottom))',
          background: 'rgba(8,12,24,0.96)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          zIndex: 60,
        }}
      >
        {navItems.map((it, i) => {
          const isActive = location.pathname === it.path;
          return (
            <Link
              key={i}
              to={it.path}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
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
              <span style={{ position: 'relative', color: it.special ? 'white' : 'inherit' }}>
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
              <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 700 : 400, color: it.special ? 'white' : 'inherit' }}>
                {t(it.label.toLowerCase())}
              </span>
            </Link>
          );
        })}

        {/* Profile tab — opens bottom sheet instead of navigating */}
        <button
          onClick={() => setShowProfileSheet(v => !v)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: isProfileActive || showProfileSheet ? 'var(--saffron, #f97316)' : 'rgba(255,255,255,0.4)',
            padding: '4px 12px',
            borderRadius: '10px',
            transition: 'all 0.2s',
          }}
        >
          <span style={{ position: 'relative' }}>
            <ProfileIcon />
            {/* Active dot indicator */}
            {showProfileSheet && (
              <span style={{
                position: 'absolute', bottom: '-3px', left: '50%', transform: 'translateX(-50%)',
                width: '4px', height: '4px', borderRadius: '50%',
                background: 'var(--saffron, #f97316)',
              }} />
            )}
          </span>
          <span style={{ fontSize: '0.65rem', fontWeight: isProfileActive || showProfileSheet ? 700 : 400 }}>
            Profile
          </span>
        </button>
      </nav>
    </>
  );
};

export default BottomNav;
