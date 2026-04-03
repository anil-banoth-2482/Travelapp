import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import PostCard from '../components/PostCard';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Travel = () => {
  const { feedPreferences, t } = useLanguage();
  const [selectedState, setSelectedState] = useState('all');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  const { user } = useAuth();

  const states = useMemo(
    () => [
      { value: 'all', labelKey: 'travel_all_states' },
      { value: 'andhra-pradesh', label: 'Andhra Pradesh' },
      { value: 'telangana', label: 'Telangana' },
      { value: 'tamil-nadu', label: 'Tamil Nadu' },
      { value: 'kerala', label: 'Kerala' },
      { value: 'karnataka', label: 'Karnataka' },
      { value: 'maharashtra', label: 'Maharashtra' },
      { value: 'rajasthan', label: 'Rajasthan' },
      { value: 'uttar-pradesh', label: 'Uttar Pradesh' },
      { value: 'goa', label: 'Goa' },
      { value: 'himachal-pradesh', label: 'Himachal Pradesh' },
      { value: 'uttarakhand', label: 'Uttarakhand' },
      { value: 'west-bengal', label: 'West Bengal' },
      { value: 'gujarat', label: 'Gujarat' },
      { value: 'punjab', label: 'Punjab' },
      { value: 'delhi', label: 'Delhi' },
    ],
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

  useEffect(() => {
    let mounted = true;

    const stateNameToSlug = {
      'andhra pradesh': 'andhra-pradesh',
      'telangana': 'telangana',
      'tamil nadu': 'tamil-nadu',
      'kerala': 'kerala',
      'karnataka': 'karnataka',
      'maharashtra': 'maharashtra',
      'rajasthan': 'rajasthan',
      'uttar pradesh': 'uttar-pradesh',
      'goa': 'goa',
      'himachal pradesh': 'himachal-pradesh',
      'uttarakhand': 'uttarakhand',
      'west bengal': 'west-bengal',
      'gujarat': 'gujarat',
      'punjab': 'punjab',
      'delhi': 'delhi',
      'national capital territory of delhi': 'delhi',
    };

    const autoLocate = async () => {
      if (!navigator.geolocation) return;
      setLocating(true);
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000,
          });
        });

        const { latitude, longitude } = pos.coords;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          { headers: { 'Accept-Language': 'en' } },
        );
        if (!res.ok) throw new Error('Nominatim failed');
        const json = await res.json();
        const stateName = (json.address?.state || '').toLowerCase();
        const slug = stateNameToSlug[stateName];
        if (mounted && slug) {
          setSelectedState(slug);
        }
      } catch (err) {
        console.warn('Geolocation fallback:', err.message);
      } finally {
        if (mounted) setLocating(false);
      }
    };

    autoLocate();
    return () => { mounted = false; };
  }, []);

  // Tier badge derived from tourism score (0-100)
  const tierLabel = (score) => {
    if (score === undefined || score === null) return 'none';
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'low';
    return 'none';
  };

  // Visible posts: state + language filtered — all logic inlined to avoid stale closures
  const visiblePosts = useMemo(() => {
    return posts.filter((post) => {
      if (user?.username && post?.username === user.username) {
        return false;
      }

      // ── language filter ──
      const lang = post?.language || '';
      if (lang) {
        const selectedLangs = feedPreferences.languages;
        if (lang !== 'mixed') {
          if (feedPreferences.mode === 'single') {
            if (lang !== selectedLangs[0]) return false;
          } else {
            if (!selectedLangs.includes(lang)) return false;
          }
        }
      }

      // ── travel/state filter ──
      if (post?.state) {
        if (selectedState === 'all') return true;
        return post.state === selectedState;
      }

      // No location tag: only show under "All" if AI scored it travel-worthy (or not yet scored)
      if (selectedState !== 'all') return false;
      const s = post.tourismScore ?? 0;
      return s >= 40;
    });
  }, [posts, selectedState, feedPreferences, user?.username]);

  // Final sorted list: AI score desc → newest first within same score
  const filteredPosts = useMemo(() => {
    return [...visiblePosts]
      .sort((a, b) => {
        const sa = a.tourismScore ?? 0;
        const sb = b.tourismScore ?? 0;
        if (sb !== sa) return sb - sa;
        return Date.parse(b?.createdAt || 0) - Date.parse(a?.createdAt || 0);
      })
      .map((post) => ({ ...post, _tierLabel: tierLabel(post.tourismScore) }));
  }, [visiblePosts]);


  const selectStyle = {
    width: '100%',
    maxWidth: '380px',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--text-primary)',
    outline: 'none',
    fontSize: '1rem',
  };

  return (
    <main className="scrollable-col animate-up" style={{ padding: '2rem' }}>
      <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>{t('travel_title')}</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
          {t('travel_subtitle')}
        </p>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} style={selectStyle} disabled={locating}>
            {states.map((s) => (
              <option key={s.value} value={s.value} style={{ color: '#000' }}>
                {s.labelKey ? t(s.labelKey) : s.label}
              </option>
            ))}
          </select>
          {locating && <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--saffron)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>}
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '1.75rem auto 0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            {t('travel_loading')}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            {t('travel_no_posts')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredPosts.map((post) => (
              <PostCard key={post._id} post={post}>
                {/* Travel badges + tags */}
                <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {post._tierLabel === 'high' && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'linear-gradient(135deg, var(--saffron), var(--gold))', color: '#fff', padding: '2px 10px', borderRadius: '20px' }}>🔥 Featured Travel</span>
                  )}
                  {post._tierLabel === 'medium' && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(255,165,0,0.18)', color: 'var(--gold)', border: '1px solid rgba(255,165,0,0.35)', padding: '2px 10px', borderRadius: '20px' }}>✈️ Travel Post</span>
                  )}
                  {post._tierLabel === 'low' && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)', padding: '2px 10px', borderRadius: '20px' }}>🌿 Local Interest</span>
                  )}
                  {post.state && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '6px' }}>📍 {post.state}</span>
                  )}
                  {post.language && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--saffron)' }}>#{post.language}</span>
                  )}
                </div>
              </PostCard>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default Travel;
