import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import PostCard from '../components/PostCard';
import { apiFetch } from '../utils/api';

const Travel = () => {
  const { feedPreferences, t } = useLanguage();
  const [selectedState, setSelectedState] = useState('all');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('currentUser'));
    } catch {
      return null;
    }
  }, []);

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

        const res = await apiFetch('/api/geocode/reverse', {
          method: 'POST',
          body: JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        });

        if (!res.ok) throw new Error('Geocoding failed');

        const json = await res.json();
        if (mounted && json.stateSlug) {
          const validState = states.some((s) => s.value === json.stateSlug);
          if (validState) setSelectedState(json.stateSlug);
        }
      } catch (err) {
        console.warn('Geolocation fallback:', err.message);
      } finally {
        if (mounted) setLocating(false);
      }
    };

    autoLocate();
    return () => { mounted = false; };
  }, [states]);

  // aiScores: map of post.id → numeric score from OpenAI (0–10)
  const [aiScores, setAiScores] = useState({});

  // Tier badge derived from AI score (0-10)
  const tierLabel = (score) => {
    if (score === undefined) return 'loading';
    if (score >= 8) return 'high';
    if (score >= 5) return 'medium';
    if (score >= 2) return 'low';
    return 'none';
  };

  // Visible posts: state + language filtered — all logic inlined to avoid stale closures
  const visiblePosts = useMemo(() => {
    return posts.filter((post) => {
      if (currentUser?.profileName && post?.author?.profileName === currentUser.profileName) {
        return false;
      }

      // ── language filter ──
      const langs = post?.lang || [];
      if (langs.length > 0) {
        const selectedLangs = feedPreferences.languages;
        if (feedPreferences.mode === 'single') {
          if (!(langs.length === 1 && langs[0] === selectedLangs[0])) return false;
        } else {
          if (!langs.every((l) => selectedLangs.includes(l))) return false;
        }
      }

      // ── travel/state filter ──
      if (post?.location?.stateSlug) {
        // Post has a location tag — always qualifies, filter by state
        if (selectedState === 'all') return true;
        return post.location.stateSlug === selectedState;
      }

      // No location tag: only show under "All" if AI scored it travel-worthy (or not yet scored)
      if (selectedState !== 'all') return false;
      const s = aiScores[post.id];
      return s === undefined || s >= 4;
    });
  }, [posts, selectedState, feedPreferences, aiScores, currentUser?.profileName]);

  // Ask the server / OpenAI to score each visible post
  useEffect(() => {
    if (visiblePosts.length === 0) return;
    const unscored = visiblePosts.filter((p) => aiScores[p.id] === undefined);
    if (unscored.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch('/api/ai/score-posts', {
          method: 'POST',
          body: JSON.stringify({ 
            posts: unscored.map((p) => ({ 
              id: p.id, 
              description: p.description,
              hasLocation: !!p?.location?.stateSlug
            })) 
          }),
        });
        if (!res.ok) throw new Error('AI scoring failed');
        const json = await res.json();
        const newScores = {};
        (json.scores || []).forEach((score, i) => {
          if (unscored[i]) newScores[unscored[i].id] = score;
        });
        if (!cancelled) setAiScores((prev) => ({ ...prev, ...newScores }));
      } catch (err) {
        console.warn('AI scoring unavailable, fallback applied:', err.message);
        // Fallback: location-tagged posts score 5, generic posts score 2
        const fallback = {};
        unscored.forEach((p) => { fallback[p.id] = p?.location?.stateSlug ? 5 : 2; });
        if (!cancelled) setAiScores((prev) => ({ ...prev, ...fallback }));
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePosts, currentUser]);

  // Final sorted list: AI score desc → newest first within same score
  const filteredPosts = useMemo(() => {
    return [...visiblePosts]
      .sort((a, b) => {
        const sa = aiScores[a.id] ?? 3;
        const sb = aiScores[b.id] ?? 3;
        if (sb !== sa) return sb - sa;
        return Date.parse(b?.createdAt || 0) - Date.parse(a?.createdAt || 0);
      })
      .map((post) => ({ ...post, _tierLabel: tierLabel(aiScores[post.id]) }));
  }, [visiblePosts, aiScores]);


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
              <PostCard key={post.id} post={post}>
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
                  {post.location?.state && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '6px' }}>📍 {post.location.state}</span>
                  )}
                  {(post.lang || []).map((l) => (
                    <span key={l} style={{ fontSize: '0.75rem', color: 'var(--saffron)' }}>#{l}</span>
                  ))}
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
