import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useMessages } from '../context/MessagesContext';

/* ── Minimal SVG icons ─────────────────────────────────────────────────── */
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const TravelIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const MessageIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════ */
const Sidebar = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [btnHover, setBtnHover] = useState(false);

  const { getTotalUnread } = useMessages();
  const totalUnread = getTotalUnread();

  const menuItems = [
    { Icon: HomeIcon,    label: 'Home',     path: '/home' },
    { Icon: TravelIcon,  label: 'Travel',   path: '/travel' },
    { Icon: MessageIcon, label: 'Messages', path: '/messages', badge: totalUnread },
    { Icon: ProfileIcon, label: 'Profile',  path: '/profile' },
  ];

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', minHeight: 'calc(100vh - 64px)' }} className="animate-up">
      <div style={{
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        borderRadius: '18px',
        padding: '1.25rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}>
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          const isHovered = hoveredItem === index;
          return (
            <Link
              to={item.path}
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.85rem 1.1rem',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '0.95rem',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none',
                background: isActive
                  ? 'linear-gradient(90deg, rgba(249,115,22,0.14) 0%, transparent 100%)'
                  : isHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
                color: isActive ? 'var(--saffron, #f97316)' : isHovered ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderLeft: isActive ? '3px solid var(--saffron, #f97316)' : '3px solid transparent',
                transform: isHovered && !isActive ? 'translateX(4px)' : 'none',
                position: 'relative',
              }}
              onMouseEnter={() => setHoveredItem(index)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={{ position: 'relative', flexShrink: 0 }}>
                <item.Icon />
                {item.badge > 0 && (
                  <span style={{
                    position: 'absolute', top: '-5px', right: '-6px',
                    background: 'var(--saffron, #f97316)', color: 'white',
                    fontSize: '0.6rem', fontWeight: 700, borderRadius: '50%',
                    width: '14px', height: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </span>
              <span>{t(item.label.toLowerCase())}</span>
            </Link>
          );
        })}

        {/* Create Post button */}
        <button
          style={{
            marginTop: '1rem',
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            border: 'none',
            background: btnHover
              ? 'linear-gradient(135deg, #ea6c0a, #f59e0b)'
              : 'linear-gradient(135deg, var(--saffron, #f97316), var(--gold, #fbbf24))',
            color: 'white',
            fontSize: '0.95rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            boxShadow: btnHover ? '0 8px 24px rgba(249,115,22,0.5)' : '0 4px 14px rgba(249,115,22,0.35)',
            transform: btnHover ? 'translateY(-2px)' : 'none',
          }}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          onClick={() => navigate('/create')}
        >
          <PlusIcon />
          {t('create_post')}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
