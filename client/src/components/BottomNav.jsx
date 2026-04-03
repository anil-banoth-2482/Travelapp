import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useMessages } from '../context/MessagesContext';

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

const BottomNav = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const { getTotalUnread } = useMessages();
  const totalUnread = getTotalUnread();

  // Hide the nav when a chat is open so it doesn't cover the input panel
  const searchParams = new URLSearchParams(location.search);
  const chatOpen = location.pathname === '/messages' && !!searchParams.get('chat');
  if (chatOpen) return null;

  const items = [
    { Icon: HomeIcon,    label: 'Home',     path: '/home' },
    { Icon: TravelIcon,  label: 'Travel',   path: '/travel' },
    { Icon: PlusIcon,    label: 'Create',   path: '/create', special: true },
    { Icon: MessageIcon, label: 'Messages', path: '/messages', badge: totalUnread },
    { Icon: ProfileIcon, label: 'Profile',  path: '/profile' },
  ];

  return (
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
      {items.map((it, i) => {
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
    </nav>
  );
};

export default BottomNav;
