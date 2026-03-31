import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMessages } from '../context/MessagesContext';

/* ─── helpers ─────────────────────────────────────────────────────────── */
const fmt = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMins = Math.floor((now - d) / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffDays = Math.floor(diffMins / 1440);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getUserInfo = (profileName) => {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const u = users.find(u => u.profileName === profileName);
  if (u) return {
    name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.profileName,
    avatar: u.profilePic || `https://i.pravatar.cc/150?img=${Math.abs(profileName.charCodeAt(0)) % 70 + 1}`,
  };
  return {
    name: profileName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    avatar: `https://i.pravatar.cc/150?img=${Math.abs(profileName.charCodeAt(0)) % 70 + 1}`,
  };
};

/* ─── responsive breakpoint ──────────────────────────────────────────── */
const MOBILE_BP = 640; // px — below this, only one panel shows at a time

const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
};

/* ═══════════════════════════════════════════════════════════════════════ */
const Messages = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
  const myName = currentUser?.profileName || '';
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < MOBILE_BP;

  const { sendMessage, markRead, fetchThread, getThread, getConversationList, totalUnread } = useMessages();

  const activeChat = searchParams.get('chat') || null;
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const conversations = getConversationList();

  /* On mobile, opening a chat → hide list. Back button → show list. */
  // On desktop both panels are always visible.
  // On mobile: show list when no activeChat, show chat when activeChat is set.
  const showList = !isMobile || !activeChat;
  const showChat = !!activeChat && (!isMobile || !!activeChat);

  /* Fetch + mark read when chat changes */
  useEffect(() => {
    if (activeChat && myName) {
      fetchThread(myName, activeChat);
      markRead(myName, activeChat);
      // Auto-focus input on mobile after opening chat
      if (isMobile) setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeChat, myName]);

  /* Poll thread every 3s when chat is open */
  useEffect(() => {
    if (!activeChat || !myName) return;
    const iv = setInterval(() => fetchThread(myName, activeChat), 3000);
    return () => clearInterval(iv);
  }, [activeChat, myName]);

  /* Scroll to bottom */
  const chatMessages = activeChat ? getThread(myName, activeChat) : [];
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const activeChatInfo = activeChat ? getUserInfo(activeChat) : null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeChat) return;
    const msg = await sendMessage(myName, activeChat, input);
    setInput('');
    if (msg) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const handleSelectConv = (otherUser) => {
    setSearchParams({ chat: otherUser });
  };

  const handleBack = () => {
    setSearchParams({});
  };

  /* ── glass style ── */
  const glass = {
    background: 'var(--glass-bg, rgba(15,23,42,0.4))',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.37)',
    borderRadius: '16px',
  };

  return (
    <main
      style={{
        display: 'flex',
        height: '100%',
        gap: isMobile ? 0 : '1.5rem',
        overflow: 'hidden',
      }}
      className="animate-up"
    >
      {/* ── LEFT: conversation list ── */}
      {showList && (
        <div style={{
          ...glass,
          /* On desktop: fixed 300px when chat open, full width centered when no chat */
          /* On mobile: full width always (chat panel replaces it) */
          width: isMobile ? '100%' : (activeChat ? '300px' : '100%'),
          maxWidth: isMobile ? '100%' : (activeChat ? '300px' : '640px'),
          margin: (!activeChat && !isMobile) ? '0 auto' : undefined,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '1.1rem 1.4rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>Messages</h2>
            {totalUnread > 0 && (
              <span style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--saffron, #f97316)', fontSize: '0.75rem', fontWeight: 600, borderRadius: '20px', padding: '2px 10px' }}>
                {totalUnread} new
              </span>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                <p style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>No conversations yet</p>
                <p style={{ fontSize: '0.82rem' }}>Visit a profile to start chatting!</p>
              </div>
            ) : conversations.map(conv => {
              const info = getUserInfo(conv.otherUser);
              const isActive = !isMobile && activeChat === conv.otherUser;
              return (
                <div
                  key={conv.key}
                  onClick={() => handleSelectConv(conv.otherUser)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.9rem',
                    padding: '0.85rem 1rem', borderRadius: '12px', cursor: 'pointer',
                    background: isActive ? 'rgba(249,115,22,0.1)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--saffron, #f97316)' : '3px solid transparent',
                    transition: 'all 0.2s', marginBottom: '2px',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <img src={info.avatar} alt={info.name} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{info.name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{fmt(conv.lastMsg?.ts)}</span>
                    </div>
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.lastMsg?.from === myName ? 'You: ' : ''}{conv.lastMsg?.text || ''}
                    </p>
                  </div>
                  {/* chevron on mobile */}
                  {isMobile && (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── RIGHT: active chat ── */}
      {showChat && (
        <div style={{
          ...glass,
          flex: isMobile ? undefined : 1,
          width: isMobile ? '100%' : undefined,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {/* Chat header */}
          <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Back button — always shown on mobile, also on desktop */}
            <button
              onClick={handleBack}
              title="Back to conversations"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', padding: '6px 8px', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>

            <img
              src={activeChatInfo?.avatar}
              alt={activeChatInfo?.name}
              style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--saffron, #f97316)', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => navigate(`/profile/${activeChat}`)}
            />
            <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate(`/profile/${activeChat}`)}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeChatInfo?.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>@{activeChat}</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {chatMessages.length === 0 ? (
              <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-secondary)' }}>
                <p style={{ fontSize: '1.4rem', marginBottom: '0.3rem' }}>👋</p>
                <p style={{ fontSize: '0.9rem' }}>Start the conversation with {activeChatInfo?.name}!</p>
              </div>
            ) : chatMessages.map(msg => {
              const isMine = msg.from === myName;
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
                  {!isMine && <img src={activeChatInfo?.avatar} alt="" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
                  <div style={{
                    maxWidth: isMobile ? '80%' : '65%',
                    padding: '0.6rem 0.95rem',
                    borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isMine ? 'linear-gradient(135deg, var(--saffron, #f97316), var(--gold, #fbbf24))' : 'rgba(255,255,255,0.07)',
                    color: isMine ? 'white' : 'var(--text-primary)',
                    fontSize: '0.9rem', lineHeight: 1.5,
                    boxShadow: isMine ? '0 4px 12px rgba(249,115,22,0.25)' : 'none',
                  }}>
                    <div>{msg.text}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '0.2rem', textAlign: 'right' }}>{fmt(msg.ts)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.6rem', alignItems: 'center' }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Message ${activeChatInfo?.name || ''}…`}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '30px',
                padding: '0.7rem 1.1rem',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              style={{
                background: input.trim() ? 'linear-gradient(135deg, var(--saffron, #f97316), var(--gold, #fbbf24))' : 'rgba(255,255,255,0.05)',
                border: 'none', borderRadius: '50%',
                width: '42px', height: '42px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                boxShadow: input.trim() ? '0 4px 12px rgba(249,115,22,0.35)' : 'none',
                flexShrink: 0,
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={input.trim() ? 'white' : 'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
        </div>
      )}
    </main>
  );
};

export default Messages;
