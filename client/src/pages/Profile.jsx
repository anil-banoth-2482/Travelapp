import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useMessages } from '../context/MessagesContext';
import { apiFetch, resolveApiUrl } from '../utils/api';

/* ─── Demo / synthetic user fallback ──────────────────────────────────── */
const SYNTHETIC_USERS = {
  aditi_rao:    { profileName: 'aditi_rao',    firstName: 'Aditi',   lastName: 'Rao',   bio: 'Digital Artist · Bengaluru', profilePic: 'https://i.pravatar.cc/150?img=5' },
  vikram_singh: { profileName: 'vikram_singh', firstName: 'Vikram',  lastName: 'Singh', bio: 'Photographer · Delhi',        profilePic: 'https://i.pravatar.cc/150?img=8' },
  neha_gupta:   { profileName: 'neha_gupta',   firstName: 'Neha',    lastName: 'Gupta', bio: 'Travel Blogger · Mumbai',     profilePic: 'https://i.pravatar.cc/150?img=9' },
};

const resolveUser = (id) => {
  // 1. Check real users in localStorage
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const real = users.find(u => u.profileName === id);
  if (real) return real;
  // 2. Synthetic demo users
  if (SYNTHETIC_USERS[id]) return SYNTHETIC_USERS[id];
  // 3. Generic placeholder
  return {
    profileName: id,
    firstName: id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    lastName: '',
    bio: '',
    profilePic: `https://i.pravatar.cc/150?img=${Math.abs(id.charCodeAt(0)) % 70 + 1}`,
  };
};

const fmt = (ts) => {
  if (!ts) return '';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

/* ═══════════════════════════════════════════════════════════════════════ */
const Profile = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { sendMessage, markRead, fetchThread, getThread } = useMessages();

  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [myPosts, setMyPosts] = useState([]);
  const [myPostsLoading, setMyPostsLoading] = useState(false);
  const [editData, setEditData] = useState({ profileName: '', bio: '', profilePic: '', firstName: '', lastName: '' });

  // Inline chat state
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const chatBottomRef = useRef(null);

  const sessionUser = (() => { try { return JSON.parse(sessionStorage.getItem('currentUser')); } catch { return null; } })();
  const myName = sessionUser?.profileName || '';

  const isOwnProfile =
    !id ||
    (sessionUser?.profileName && id && sessionUser.profileName === id) ||
    (sessionUser?.profileName && user?.profileName && sessionUser.profileName === user.profileName);

  /* ── Load user ── */
  useEffect(() => {
    if (!id || (sessionUser && sessionUser.profileName === id)) {
      setUser(sessionUser);
      setEditData({
        profileName: sessionUser?.profileName || '',
        bio: sessionUser?.bio || '',
        profilePic: sessionUser?.profilePic || 'https://i.pravatar.cc/150?img=1',
        firstName: sessionUser?.firstName || '',
        lastName: sessionUser?.lastName || '',
      });
    } else {
      setUser(resolveUser(id));
    }
    setMyPosts([]);
  }, [id]);

  /* ── Load chat thread when panel opens ── */
  useEffect(() => {
    if (chatOpen && !isOwnProfile && user?.profileName && myName) {
      fetchThread(myName, user.profileName);
      markRead(myName, user.profileName);
    }
  }, [chatOpen, user?.profileName, myName, isOwnProfile]);

  /* ── Poll chat thread every 4s when open ── */
  useEffect(() => {
    if (!chatOpen || isOwnProfile || !user?.profileName || !myName) return;
    const iv = setInterval(() => fetchThread(myName, user.profileName), 4000);
    return () => clearInterval(iv);
  }, [chatOpen, user?.profileName, myName, isOwnProfile]);

  const chatMessages = (!isOwnProfile && user?.profileName && myName)
    ? getThread(myName, user.profileName)
    : [];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  /* ── Posts view ── */
  const isPostsView = isOwnProfile && searchParams.get('view') === 'posts';
  const selectedPostId = isPostsView ? searchParams.get('post') : null;
  const selectedPost = selectedPostId ? myPosts.find(p => p?.id === selectedPostId) : null;

  const loadMyPosts = async (profileName) => {
    if (!profileName) return;
    setMyPostsLoading(true);
    try {
      const res = await apiFetch('/api/posts');
      if (!res.ok) throw new Error();
      const json = await res.json();
      const list = Array.isArray(json.posts) ? json.posts : [];
      setMyPosts(list.filter(p => p?.author?.profileName === profileName).sort((a, b) => Date.parse(b?.createdAt || 0) - Date.parse(a?.createdAt || 0)));
    } catch { setMyPosts([]); }
    finally { setMyPostsLoading(false); }
  };

  useEffect(() => {
    if (!isPostsView || !user?.profileName || myPostsLoading || myPosts.length > 0) return;
    loadMyPosts(user.profileName);
  }, [isPostsView, user?.profileName]);

  /* ── Edit / Save ── */
  const handleSave = () => {
    if (!editData.profileName.trim()) { alert(t('profile_username_empty')); return; }
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (editData.profileName !== user.profileName) {
      if (users.some(u => u.profileName === editData.profileName && u.email !== user.email)) { alert(t('profile_username_taken')); return; }
    }
    const updatedUser = { ...user, ...editData };
    localStorage.setItem('users', JSON.stringify(users.map(u => u.email === user.email ? updatedUser : u)));
    const userJson = JSON.stringify(updatedUser);
    sessionStorage.setItem('currentUser', userJson);
    localStorage.setItem('currentUser', userJson);
    setUser(updatedUser);
    setIsEditing(false);
    window.dispatchEvent(new Event('authchange'));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => setEditData({ ...editData, profilePic: reader.result }); reader.readAsDataURL(file); }
  };

  /* ── Send inline message ── */
  const handleChatSend = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !user?.profileName) return;
    await sendMessage(myName, user.profileName, chatInput);
    setChatInput('');
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  if (!user) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>{t('profile_loading')}</div>;

  return (
    <main className="scrollable-col animate-up" style={{ padding: '1.5rem', maxWidth: '820px', margin: '0 auto' }}>

      {/* ── Profile Card ── */}
      <div className="glass" style={{ padding: '2.5rem', position: 'relative', marginBottom: '1.5rem' }}>
        {isOwnProfile && !isEditing && (
          <button onClick={() => setIsEditing(true)} style={editBtnStyle}>{t('profile_edit')}</button>
        )}

        <div style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={isEditing ? editData.profilePic : (user.profilePic || 'https://i.pravatar.cc/150?img=1')}
              alt="Profile"
              style={{ width: '130px', height: '130px', borderRadius: '50%', border: '4px solid var(--saffron)', marginBottom: '1.25rem', objectFit: 'cover' }}
            />
            {isEditing && (
              <label style={{ position: 'absolute', bottom: '1.25rem', right: '0', background: 'var(--saffron)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <input type="file" hidden accept="image/*" onChange={handleFileChange} />
              </label>
            )}
          </div>

          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '420px', margin: '0 auto' }}>
              <div style={fieldGroup}>
                <label style={labelStyle}>{t('profile_first_name')}</label>
                <input type="text" value={editData.firstName} onChange={e => setEditData({ ...editData, firstName: e.target.value })} placeholder={t('profile_first_name_placeholder')} style={inputStyle} />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>{t('profile_last_name')}</label>
                <input type="text" value={editData.lastName} onChange={e => setEditData({ ...editData, lastName: e.target.value })} placeholder={t('profile_last_name_placeholder')} style={inputStyle} />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>{t('profile_username')}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--saffron)', fontWeight: 600 }}>@</span>
                  <input type="text" value={editData.profileName} onChange={e => setEditData({ ...editData, profileName: e.target.value.toLowerCase().replace(/\s/g, '') })} style={{ ...inputStyle, paddingLeft: '2rem' }} />
                </div>
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>{t('profile_bio')}</label>
                <textarea value={editData.bio} onChange={e => setEditData({ ...editData, bio: e.target.value })} placeholder={t('profile_bio_placeholder')} style={{ ...inputStyle, height: '90px', resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={handleSave} style={saveBtnStyle}>{t('profile_save')}</button>
                <button onClick={() => setIsEditing(false)} style={cancelBtnStyle}>{t('profile_cancel')}</button>
              </div>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{user.firstName} {user.lastName}</h2>
              <p style={{ color: 'var(--saffron)', fontWeight: 600, fontSize: '1rem' }}>@{user.profileName}</p>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', fontSize: '1rem', lineHeight: 1.6 }}>
                {user.bio || t('profile_no_bio')}
              </p>
            </>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '3rem', justifyContent: 'center', marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '2rem' }}>
          {[['42', 'Posts'], ['1.2K', 'Followers'], ['384', 'Following']].map(([val, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <h3 style={{ color: 'var(--saffron)', fontSize: '1.4rem', marginBottom: '0.2rem' }}>{val}</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Actions for other profiles */}
        {!isOwnProfile && !isEditing && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              onClick={() => setChatOpen(v => !v)}
              style={{
                background: chatOpen ? 'rgba(249,115,22,0.12)' : 'linear-gradient(135deg, var(--saffron, #f97316), var(--gold, #fbbf24))',
                border: chatOpen ? '1px solid var(--saffron, #f97316)' : 'none',
                color: chatOpen ? 'var(--saffron, #f97316)' : 'white',
                padding: '0.75rem 2rem',
                borderRadius: '999px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: chatOpen ? 'none' : '0 4px 16px rgba(249,115,22,0.35)',
                transition: 'all 0.2s',
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {chatOpen ? 'Hide Chat' : 'Send Message'}
            </button>

            <button
              onClick={() => navigate('/messages')}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '0.75rem 1.5rem', borderRadius: '999px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              All Messages
            </button>
          </div>
        )}

        {/* Own profile - view posts button */}
        {isOwnProfile && !isEditing && !isPostsView && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem' }}>
            <button onClick={() => setSearchParams({ view: 'posts' })} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '0.65rem 1.25rem', borderRadius: '999px', cursor: 'pointer', fontWeight: 700 }}>
              {t('profile_all_posts')}
            </button>
          </div>
        )}

        {/* Posts grid */}
        {isOwnProfile && !isEditing && isPostsView && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <button onClick={() => setSearchParams({})} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '0.65rem 1.25rem', borderRadius: '999px', cursor: 'pointer', fontWeight: 700 }}>
                {t('profile_hide_posts')}
              </button>
            </div>
            {myPostsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>{t('profile_posts_loading')}</div>
            ) : myPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>{t('profile_no_posts')}</div>
            ) : selectedPost ? (
              <div className="glass" style={{ padding: '1.25rem' }}>
                <button onClick={() => setSearchParams({ view: 'posts' })} style={{ ...cancelBtnStyle, marginBottom: '1rem', padding: '0.5rem 0.9rem', borderRadius: '8px' }}>
                  {t('profile_all_posts')}
                </button>
                {selectedPost.media?.type === 'image' && selectedPost.media?.url && (
                  <img src={resolveApiUrl(selectedPost.media.url)} alt="Post" style={{ width: '100%', borderRadius: '14px', maxHeight: '480px', objectFit: 'cover', marginBottom: '0.9rem' }} />
                )}
                {selectedPost.media?.type === 'video' && selectedPost.media?.url && (
                  <video src={resolveApiUrl(selectedPost.media.url)} controls style={{ width: '100%', borderRadius: '14px', maxHeight: '480px', marginBottom: '0.9rem' }} />
                )}
                <div style={{ fontSize: '1rem', lineHeight: 1.6 }}>{selectedPost.description}</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {myPosts.map(post => (
                  <button key={post.id} type="button" onClick={() => setSearchParams({ view: 'posts', post: post.id })} style={{ border: 'none', padding: 0, background: 'transparent', cursor: 'pointer', borderRadius: '10px', overflow: 'hidden', aspectRatio: '1/1' }}>
                    {post.media?.type === 'image' && post.media?.url && <img src={resolveApiUrl(post.media.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                    {post.media?.type === 'video' && post.media?.url && <video src={resolveApiUrl(post.media.url)} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                    {!post.media?.url && <div className="glass" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>Post</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Inline Chat Panel (other user's profile only) ── */}
      {!isOwnProfile && chatOpen && (
        <div className="glass animate-up" style={{ display: 'flex', flexDirection: 'column', height: '420px', overflow: 'hidden' }}>
          {/* Chat header */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={user.profilePic || 'https://i.pravatar.cc/150?img=1'} alt="" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--saffron, #f97316)' }} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{user.firstName} {user.lastName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>@{user.profileName}</div>
            </div>
            <button
              onClick={() => navigate(`/messages?chat=${user.profileName}`)}
              style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '0.4rem 0.9rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
            >
              Open in Messages →
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {chatMessages.length === 0 ? (
              <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <p>Start chatting with {user.firstName}!</p>
              </div>
            ) : chatMessages.map(msg => {
              const isMine = msg.from === myName;
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '70%',
                    padding: '0.55rem 0.9rem',
                    borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isMine ? 'linear-gradient(135deg, var(--saffron, #f97316), var(--gold, #fbbf24))' : 'rgba(255,255,255,0.07)',
                    color: isMine ? 'white' : 'var(--text-primary)',
                    fontSize: '0.88rem',
                    lineHeight: 1.45,
                  }}>
                    <div>{msg.text}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '0.2rem', textAlign: 'right' }}>{fmt(msg.ts)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleChatSend} style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={`Message ${user.firstName}…`}
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', padding: '0.65rem 1.1rem', color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none' }}
            />
            <button type="submit" disabled={!chatInput.trim()} style={{
              background: chatInput.trim() ? 'linear-gradient(135deg, var(--saffron, #f97316), var(--gold, #fbbf24))' : 'rgba(255,255,255,0.05)',
              border: 'none', borderRadius: '50%', width: '40px', height: '40px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: chatInput.trim() ? 'pointer' : 'not-allowed', flexShrink: 0,
              boxShadow: chatInput.trim() ? '0 4px 12px rgba(249,115,22,0.3)' : 'none',
            }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={chatInput.trim() ? 'white' : 'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
        </div>
      )}

    </main>
  );
};

/* ─── Styles ────────────────────────────────────────────────────────────── */
const fieldGroup = { display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' };
const labelStyle = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' };
const inputStyle = { background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'white', fontSize: '0.95rem', width: '100%', outline: 'none' };
const saveBtnStyle = { flex: 1, background: 'linear-gradient(135deg, var(--saffron), var(--gold))', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' };
const cancelBtnStyle = { flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' };
const editBtnStyle = { position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '0.45rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' };

export default Profile;
