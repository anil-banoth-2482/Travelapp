import React, { useEffect, useState } from 'react';
import FeedLanguageBar from '../components/FeedLanguageBar';
import PostCard from '../components/PostCard';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../utils/api';

const Home = () => {
  const { feedPreferences, t } = useLanguage();
  const currentUser = (() => {
    try { return JSON.parse(sessionStorage.getItem('currentUser')); }
    catch { return null; }
  })();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/posts');
      if (!res.ok) throw new Error('Failed to load posts');
      const json = await res.json();
      const list = Array.isArray(json.posts) ? json.posts : [];
      list.sort((a, b) => Date.parse(b?.createdAt || 0) - Date.parse(a?.createdAt || 0));
      setPosts(list);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPosts(); }, []);

  const filteredPosts = posts.filter(post => {
    if (currentUser?.profileName && post?.author?.profileName === currentUser.profileName) return false;
    const selectedLangs = feedPreferences.languages;
    const langs = post.lang || [];
    if (langs.length === 0) return true;
    if (feedPreferences.mode === 'single') return langs.length === 1 && langs[0] === selectedLangs[0];
    return langs.every(l => selectedLangs.includes(l));
  });

  return (
    <div style={{ padding: '0', maxWidth: '700px', margin: '0 auto' }}>
      <FeedLanguageBar />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            {t('home_loading')}
          </div>
        ) : filteredPosts.length > 0 ? filteredPosts.map(post => (
          <PostCard key={post.id} post={post}>
            {/* Language tags */}
            {(post.lang || []).length > 0 && (
              <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(post.lang || []).map(l => (
                  <span key={l} style={{ fontSize: '0.75rem', color: 'var(--saffron)' }}>#{l}</span>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '6px' }}>
                  {(post.lang || []).length > 1 || post.type === 'mixed' ? t('post_type_mixed') : t('post_type_single')}
                </span>
              </div>
            )}
          </PostCard>
        )) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            {t('home_no_posts')}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
