import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage, availableLanguages } from '../context/LanguageContext';
import { useMessages } from '../context/MessagesContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch, resolveApiUrl } from '../utils/api';


// Generates a display name from username as fallback
const getUserDisplayName = (username) =>
  username.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Fallback avatar when profile hasn't loaded yet
const fallbackAvatar = (username) =>
  `https://i.pravatar.cc/150?img=${Math.abs(username.charCodeAt(0)) % 70 + 1}`;

const fmtTime = (ts) => {
  if (!ts) return '';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

/* SVG Bell Icon */
const BellIcon = ({ hasUnread }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    {hasUnread && <circle cx="18" cy="6" r="4" fill="var(--saffron, #f97316)" stroke="none"/>}
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════ */
const Navbar = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { user, logout } = useAuth();
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();

  const myName = user?.username || '';
  const { getTotalUnread, getUnreadSummary, markRead } = useMessages();
  const totalUnread = getTotalUnread();
  const unreadSummary = getUnreadSummary();

  // Cache of real user profiles fetched from the API: { username: { name, avatarUrl } }
  const [profileCache, setProfileCache] = useState({});

  const fetchSenderProfile = async (username) => {
    if (!username || profileCache[username] !== undefined) return;
    // Mark as loading to prevent duplicate fetches
    setProfileCache(prev => ({ ...prev, [username]: null }));
    try {
      const res = await apiFetch(`/api/users/${username}`);
      if (!res.ok) return;
      const json = await res.json();
      setProfileCache(prev => ({ ...prev, [username]: json.user || null }));
    } catch {
      // keep null — fallback avatar will be used
    }
  };

  // Fetch profiles for all unread senders whenever the panel opens
  useEffect(() => {
    if (!showNotif) return;
    unreadSummary.forEach(({ fromUser }) => fetchSenderProfile(fromUser));
  }, [showNotif, unreadSummary]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowDropdown(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    setShowDropdown(false);
    navigate('/login');
  };

  const handleNotifClick = async (fromUser) => {
    await markRead(myName, fromUser);
    setShowNotif(false);
    navigate(`/messages?chat=${fromUser}`);
  };

  const glass = {
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  };

  return (
    <nav style={{
      ...glass,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isMobile ? '0.65rem 1rem' : '0.85rem 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderRadius: '0 0 20px 20px',
      margin: isMobile ? '0 0.5rem' : '0 1.5rem',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', margin: 0 }}>
          Travel<span style={{ color: 'var(--saffron, #f97316)' }}>India</span>
        </h1>
      </Link>

      {/* Search — hidden on mobile to save space */}
      {!isMobile && (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', maxWidth: '500px', margin: '0 2rem' }}>
          <div style={{
            ...glass,
            width: '100%',
            padding: '0.5rem 1.25rem',
            borderRadius: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder={t('search_placeholder')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem' }}
            />
          </div>
        </div>
      )}

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.75rem', flexShrink: 0 }}>

        {/* Notification Bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotif(v => !v)}
            title="Notifications"
            style={{
              background: showNotif ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: totalUnread > 0 ? 'var(--saffron, #f97316)' : 'var(--text-secondary)',
              width: '40px', height: '40px',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative',
            }}
          >
            <BellIcon hasUnread={totalUnread > 0} />
            {totalUnread > 0 && (
              <span style={{
                position: 'absolute', top: '2px', right: '2px',
                background: 'var(--saffron, #f97316)',
                color: 'white', fontSize: '0.6rem', fontWeight: 700,
                borderRadius: '50%', width: '16px', height: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid rgba(10,15,28,0.9)',
                animation: 'pulse 2s infinite',
              }}>
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotif && (
            <div style={{
              ...glass,
              position: 'fixed',
              top: isMobile ? '70px' : undefined,
              ...(!isMobile ? { position: 'absolute', top: 'calc(100% + 10px)' } : {}),
              right: isMobile ? '8px' : '-10px',
              width: isMobile ? 'calc(100vw - 16px)' : '340px',
              maxWidth: '400px',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1000,
              background: 'rgba(8,12,24,0.98)',
              borderRadius: '16px',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Notifications</span>
                {totalUnread > 0 && (
                  <span style={{ background: 'rgba(249,115,22,0.12)', color: 'var(--saffron, #f97316)', fontSize: '0.72rem', fontWeight: 700, borderRadius: '20px', padding: '2px 8px' }}>
                    {totalUnread} new
                  </span>
                )}
              </div>

              {unreadSummary.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" style={{ margin: '0 auto 0.75rem', display: 'block' }}>
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  All caught up!
                </div>
              ) : (
                <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                  {unreadSummary.map(({ fromUser, lastMsg, count }) => {
                    const profile = profileCache[fromUser];
                    const displayName = profile?.name || getUserDisplayName(fromUser);
                    const avatarSrc = profile?.avatarUrl || fallbackAvatar(fromUser);
                    return (
                      <div
                        key={fromUser}
                        onClick={() => handleNotifClick(fromUser)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1.25rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.07)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <img
                            src={avatarSrc}
                            alt={displayName}
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--saffron, #f97316)', display: 'block' }}
                            onError={e => { e.currentTarget.src = fallbackAvatar(fromUser); }}
                          />
                          {/* Loading shimmer when profile is still fetching */}
                          {profile === null && (
                            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(249,115,22,0.15)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.83rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.15rem' }}>
                            <span style={{ color: 'var(--saffron, #f97316)' }}>{displayName}</span>
                            {count > 1 ? ` · ${count} new messages` : ' · new message'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lastMsg?.text}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.15rem' }}>{fmtTime(lastMsg?.createdAt)}</div>
                        </div>
                        <span style={{ background: 'var(--saffron, #f97316)', color: 'white', fontSize: '0.68rem', fontWeight: 700, borderRadius: '50%', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', flexShrink: 0 }}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div
                onClick={() => { setShowNotif(false); navigate('/messages'); }}
                style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--saffron, #f97316)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                View all messages →
              </div>
            </div>
          )}
        </div>

        {/* Language selector — hidden on mobile */}
        {!isMobile && (
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            title="Switch Language"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '0 0.9rem',
              borderRadius: '20px',
              outline: 'none',
              appearance: 'none',
              WebkitAppearance: 'none',
              height: '40px',
              textAlign: 'center',
            }}
          >
            {availableLanguages.map((lang) => (
              <option key={lang.code} value={lang.code} style={{ color: '#000' }}>{lang.native}</option>
            ))}
          </select>
        )}

        {/* Profile avatar + dropdown — hidden on mobile (use BottomNav profile link instead) */}
        {!isMobile && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <img
              src={resolveApiUrl(user?.avatarUrl) || 'https://i.pravatar.cc/150?img=' + (Math.abs((user?.username?.charCodeAt(0) || 1)) % 70 + 1)}
              alt="Profile"
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--saffron, #f97316)', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => setShowDropdown(!showDropdown)}
              onError={e => { e.currentTarget.src = 'https://i.pravatar.cc/150?img=' + (Math.abs((user?.username?.charCodeAt(0) || 1)) % 70 + 1); }}
            />

            {showDropdown && (
              <div style={{ ...glass, position: 'absolute', top: 'calc(100% + 10px)', right: 0, minWidth: '180px', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 1000, background: 'rgba(8,12,24,0.98)', borderRadius: '14px' }}>
                <Link to="/profile" style={dropItemStyle} onClick={() => setShowDropdown(false)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  View Profile
                </Link>
                <Link to="/profile?view=posts" style={dropItemStyle} onClick={() => setShowDropdown(false)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  My Posts
                </Link>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
                <button onClick={handleLogout} style={{ ...dropItemStyle, color: '#f87171', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

const dropItemStyle = {
  textDecoration: 'none',
  color: 'var(--text-primary)',
  padding: '0.65rem 1rem',
  borderRadius: '10px',
  fontSize: '0.875rem',
  transition: 'background 0.15s',
  display: 'block',
  fontWeight: 500,
  background: 'transparent',
};

export default Navbar;
