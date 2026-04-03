import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch, resolveApiUrl } from '../utils/api';

const Explore = () => {
  const { feedPreferences, t } = useLanguage();
  const [selectedTag, setSelectedTag] = useState('All');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const tags = useMemo(() => ['All', '#DesiFood', '#Dance', '#Arts', '#Festivals', '#Tradition'], []);

  const topicKeywords = useMemo(
    () => ({
      '#DesiFood': ['desifood', 'food', 'biryani', 'dosa', 'idli', 'samosa', 'chai', 'masala', 'curry', 'paneer', 'gulab', 'jalebi', 'pani', 'paratha', 'thali', 'poha'],
      '#Dance': ['dance', 'dancer', 'bharatanatyam', 'kathak', 'odissi', 'kuchipudi', 'garba', 'bhangra', 'classical dance', 'folk dance', 'mudra', 'ghungroo'],
      '#Arts': ['art', 'arts', 'painting', 'sketch', 'drawing', 'sculpture', 'craft', 'handicraft', 'madhubani', 'warli', 'rangoli', 'weaving', 'pottery'],
      '#Festivals': ['festival', 'festivals', 'diwali', 'deepavali', 'holi', 'eid', 'pongal', 'onam', 'navratri', 'dussehra', 'ganesh', 'durga', 'diya', 'lights', 'fireworks'],
      '#Tradition': ['tradition', 'traditional', 'culture', 'heritage', 'ritual', 'custom', 'temple', 'pooja', 'puja', 'mehndi', 'saree', 'dhoti', 'kurta', 'wedding'],
    }),
    [],
  );

  const loadPosts = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/posts');
      if (!res.ok) throw new Error('Failed to load posts');
      const json = await res.json();
      const list = Array.isArray(json.posts) ? json.posts : [];
      setPosts(list);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const matchesTopic = (post) => {
    if (selectedTag === 'All') return true;

    const text = String(post?.description || '').toLowerCase();
    const tagText = selectedTag.toLowerCase();
    if (text.includes(tagText)) return true;

    const keywords = topicKeywords[selectedTag] || [];
    return keywords.some((k) => text.includes(k));
  };

  const matchesLanguage = (post) => {
    const langs = post?.lang || [];
    if (langs.length === 0) return true;

    const selectedLangs = feedPreferences.languages;
    if (feedPreferences.mode === 'single') {
      return langs.length === 1 && langs[0] === selectedLangs[0];
    }
    return langs.every((l) => selectedLangs.includes(l));
  };

  const filteredPosts = posts
    .filter(matchesTopic)
    .filter(matchesLanguage);

  const displayTag = (tag) => (tag === 'All' ? t('all') : tag);

  return (
    <main className="scrollable-col animate-up" style={{ padding: '2rem' }}>
      <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>{t('explore_title')}</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
          {t('explore_subtitle')}
        </p>
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {tags.map((tag) => {
            const isActive = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                style={{
                  padding: '0.55rem 1rem',
                  background: isActive ? 'linear-gradient(135deg, var(--saffron), var(--gold))' : 'rgba(255,255,255,0.06)',
                  color: isActive ? 'white' : 'var(--text-primary)',
                  borderRadius: '999px',
                  fontSize: '0.9rem',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  transition: '0.2s',
                  fontWeight: 600,
                }}
              >
                {displayTag(tag)}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '1.75rem auto 0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            {t('explore_loading')}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            {t('explore_no_posts_for')} {displayTag(selectedTag)}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredPosts.map((post) => {
              const mediaUrl = resolveApiUrl(post.imageUrl || post.media?.url || '');
              const mediaType = post.media?.type || (mediaUrl ? 'image' : '');

              return (
                <div key={post.id} className="glass" style={{ padding: '1.25rem', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.9rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <img
                        src={post.avatarUrl || post.author?.profilePic || 'https://i.pravatar.cc/150?img=1'}
                        alt="Author"
                        style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold)' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {post.name || 'User'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {post.username ? `@${post.username}` : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}>
                      {displayTag(selectedTag)}
                    </div>
                  </div>

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

                  <div style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>
                    {post.description}
                  </div>

                  {post.language && (
                    <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--saffron)' }}>#{post.language}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default Explore;
