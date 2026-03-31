import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch, resolveApiUrl } from '../utils/api';

const detectLanguagesFromText = (text) => {
  const t = (text || '').trim();
  if (!t) return [];

  const hasRange = (from, to) => {
    for (const ch of t) {
      const code = ch.codePointAt(0);
      if (code >= from && code <= to) return true;
    }
    return false;
  };

  const langs = [];
  if (hasRange(0x0900, 0x097f)) langs.push('hi'); // Devanagari (Hindi etc.)
  if (hasRange(0x0c00, 0x0c7f)) langs.push('te'); // Telugu
  if (hasRange(0x0980, 0x09ff)) langs.push('bn'); // Bengali
  if (hasRange(0x0c80, 0x0cff)) langs.push('kn'); // Kannada
  if (hasRange(0x0a00, 0x0a7f)) langs.push('pa'); // Gurmukhi (Punjabi)

  const hasLatin = /[a-zA-Z]/.test(t);
  if (hasLatin) langs.push('en');

  return Array.from(new Set(langs));
};

const CreatePost = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [description, setDescription] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [stateSlug, setStateSlug] = useState('auto');
  const [stateLabel, setStateLabel] = useState('');
  const [locating, setLocating] = useState(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('currentUser'));
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (mediaPreview && typeof mediaPreview === 'string' && mediaPreview.startsWith('blob:')) {
        URL.revokeObjectURL(mediaPreview);
      }
    };
  }, [mediaPreview]);

  const states = useMemo(
    () => [
      { value: 'auto', label: t('location_auto') },
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
    [t],
  );

  const detectDeviceState = async ({ updateState = true, silent = false } = {}) => {
    if (!navigator.geolocation) {
      if (!silent) alert(t('location_not_supported'));
      return null;
    }
    setLocating(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 60000,
        });
      });

      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      const res = await apiFetch('/api/geocode/reverse', {
        method: 'POST',
        body: JSON.stringify({ lat, lon }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t('location_failed'));
      }

      const json = await res.json();
      if (updateState) {
        setStateSlug(json.stateSlug);
        setStateLabel(json.state);
      }
      return json;
    } catch (err) {
      if (!silent) {
        if (err && err.code === 1) {
          alert(t('location_permission_denied'));
        } else {
          alert(err?.message || t('location_failed'));
        }
      }
      return null;
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    detectDeviceState({ updateState: true, silent: true });
  }, []);

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : '';

    if (!type) {
      alert(t('error_invalid_media'));
      e.target.value = '';
      return;
    }

    setMediaFile(file);
    setMediaType(type);

    if (mediaPreview && typeof mediaPreview === 'string' && mediaPreview.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const desc = description.trim();
    if (!mediaFile || !mediaPreview) {
      alert(t('error_media_required'));
      return;
    }
    if (!desc) {
      alert(t('error_description_required'));
      return;
    }

    setIsSaving(true);

    try {
      const detectedLangs = detectLanguagesFromText(desc);
      const postType = detectedLangs.length <= 1 ? 'single' : 'mixed';

      let locationPayload = null;
      if (stateSlug === 'auto') {
        const geo = await detectDeviceState({ updateState: false });
        if (geo?.stateSlug) {
          locationPayload = { state: geo.state, stateSlug: geo.stateSlug };
        }
      } else if (stateSlug) {
        const matched = states.find((s) => s.value === stateSlug);
        locationPayload = { state: stateLabel || matched?.label || stateSlug, stateSlug };
      }

      const dataUrl = await fileToDataUrl(mediaFile);
      const uploadRes = await apiFetch('/api/media', {
        method: 'POST',
        body: JSON.stringify({ mime: mediaFile.type, dataUrl }),
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error || t('error_media_upload_failed'));
      }
      const uploadJson = await uploadRes.json();
      const mediaUrl = resolveApiUrl(uploadJson.url);

      const newPost = {
        description: desc,
        lang: detectedLangs,
        type: postType,
        mediaType,
        mediaUrl,
        author: {
          profileName: currentUser.profileName,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          profilePic: currentUser.profilePic || '',
        },
        location: locationPayload,
      };

      const postRes = await apiFetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify(newPost),
      });
      if (!postRes.ok) {
        const err = await postRes.json().catch(() => ({}));
        throw new Error(err.error || t('error_post_failed'));
      }

      navigate('/home');
    } catch (err) {
      alert(err?.message || t('error_post_failed'));
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const cardStyle = {
    padding: '2rem',
    maxWidth: '720px',
    margin: '0 auto',
  };

  const inputStyle = {
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '0.9rem 1rem',
    color: 'white',
    fontSize: '1rem',
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit',
  };

  const primaryBtnStyle = {
    background: 'linear-gradient(135deg, var(--saffron), var(--gold))',
    color: 'white',
    border: 'none',
    padding: '1rem',
    borderRadius: '14px',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: isSaving ? 'not-allowed' : 'pointer',
    opacity: isSaving ? 0.7 : 1,
  };

  return (
    <main className="scrollable-col animate-up" style={{ padding: '2rem' }}>
      <div className="glass" style={cardStyle}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{t('create_post_title')}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          {t('create_post_subtitle')}
        </p>

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {t('location_label')}
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={stateSlug}
                onChange={(e) => {
                  setStateSlug(e.target.value);
                  setStateLabel('');
                }}
                style={{
                  flex: 1,
                  minWidth: '220px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              >
                {states.map((s) => (
                  <option key={s.value} value={s.value} style={{ color: '#000' }}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={detectDeviceState}
                disabled={locating}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-primary)',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  cursor: locating ? 'not-allowed' : 'pointer',
                  opacity: locating ? 0.7 : 1,
                  fontWeight: 600,
                }}
              >
                {locating ? t('location_detecting') : t('location_use_device')}
              </button>
            </div>
            {stateLabel && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {t('location_detected')}: <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{stateLabel}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {t('create_post_media_label')}
            </label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              style={{ color: 'var(--text-secondary)' }}
            />
          </div>

          {mediaPreview && (
            <div className="glass" style={{ padding: '1rem' }}>
              {mediaType === 'image' ? (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', borderRadius: '12px' }}
                />
              ) : (
                <video
                  src={mediaPreview}
                  controls
                  style={{ width: '100%', maxHeight: '420px', borderRadius: '12px' }}
                />
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {t('create_post_description_label')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('create_post_description_placeholder')}
              style={{ ...inputStyle, minHeight: '120px', resize: 'none' }}
            />
          </div>

          <button type="submit" style={primaryBtnStyle} disabled={isSaving}>
            {isSaving ? t('create_post_button_posting') : t('create_post_button_post')}
          </button>
        </form>
      </div>
    </main>
  );
};

export default CreatePost;
