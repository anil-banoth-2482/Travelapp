import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Reusable post card used in Home and Travel feeds.
 * - Clicking the author avatar / name navigates to their profile.
 * - A "Message" button appears on hover for posts by other users.
 * - `children` renders below the description (e.g. travel badges).
 */
const PostCard = ({ post, children }) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [msgHover, setMsgHover] = useState(false);

  const sessionUser = (() => {
    try { return JSON.parse(sessionStorage.getItem('currentUser')); }
    catch { return null; }
  })();

  const myName = sessionUser?.profileName || '';
  const authorName = post.author?.profileName || '';
  const isOwnPost = myName && authorName && myName === authorName;

  const goProfile = () => {
    if (!authorName) return;
    navigate(authorName === myName ? '/profile' : `/profile/${authorName}`);
  };

  const goMessage = (e) => {
    e.stopPropagation();
    if (!authorName) return;
    navigate(`/messages?chat=${authorName}`);
  };

  const mediaUrl  = post.media?.url  || '';
  const mediaType = post.media?.type || '';

  return (
    <div
      className="glass"
      style={{ padding: '1.25rem', transition: 'box-shadow 0.2s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Author row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.9rem', alignItems: 'center' }}>

        {/* Left: avatar + name — whole block is clickable */}
        <div
          onClick={goProfile}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flex: 1, minWidth: 0 }}
        >
          <img
            src={post.author?.profilePic || `https://i.pravatar.cc/150?img=${Math.abs((authorName.charCodeAt(0) || 1)) % 70 + 1}`}
            alt={authorName}
            style={{
              width: '42px', height: '42px', borderRadius: '50%',
              objectFit: 'cover', border: '2px solid var(--gold)',
              flexShrink: 0,
              transition: 'border-color 0.2s',
              borderColor: hovered ? 'var(--saffron, #f97316)' : 'var(--gold, #fbbf24)',
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {post.author?.firstName
                ? `${post.author.firstName} ${post.author.lastName || ''}`.trim()
                : (authorName || 'User')}
              {/* subtle profile arrow on hover */}
              {hovered && (
                <span style={{ fontSize: '0.7rem', color: 'var(--saffron, #f97316)', opacity: 0.85 }}>→ profile</span>
              )}
            </div>
            {authorName && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>@{authorName}</div>
            )}
          </div>
        </div>

        {/* Right: message button (only for other people's posts, visible on hover) */}
        {!isOwnPost && authorName && (
          <button
            onClick={goMessage}
            onMouseEnter={() => setMsgHover(true)}
            onMouseLeave={() => setMsgHover(false)}
            title={`Message ${post.author?.firstName || authorName}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: msgHover
                ? 'linear-gradient(135deg, var(--saffron, #f97316), var(--gold, #fbbf24))'
                : hovered ? 'rgba(249,115,22,0.1)' : 'transparent',
              border: hovered ? '1px solid rgba(249,115,22,0.3)' : '1px solid transparent',
              color: msgHover ? 'white' : hovered ? 'var(--saffron, #f97316)' : 'transparent',
              borderRadius: '20px',
              padding: '0.35rem 0.8rem',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
              transition: 'all 0.2s',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              boxShadow: msgHover ? '0 4px 12px rgba(249,115,22,0.3)' : 'none',
            }}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Message
          </button>
        )}
      </div>

      {/* ── Media ── */}
      {mediaUrl && mediaType === 'image' && (
        <img
          src={mediaUrl}
          alt="Post media"
          style={{ width: '100%', borderRadius: '14px', maxHeight: '420px', objectFit: 'cover', marginBottom: '0.9rem' }}
        />
      )}
      {mediaUrl && mediaType === 'video' && (
        <video
          src={mediaUrl}
          controls
          style={{ width: '100%', borderRadius: '14px', maxHeight: '420px', marginBottom: '0.9rem' }}
        />
      )}

      {/* ── Description ── */}
      <div style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>
        {post.description || post.content}
      </div>

      {/* ── Slot for badges, tags, etc. ── */}
      {children}
    </div>
  );
};

export default PostCard;
