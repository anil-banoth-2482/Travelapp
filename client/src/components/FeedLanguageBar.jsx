import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

const FeedLanguageBar = () => {
  const { feedPreferences, availableLanguages, updateFeedPreferences, t } = useLanguage();
  const [showLangs, setShowLangs] = useState(false);
  const langRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setShowLangs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMode = (newMode) => {
    const newLangs = newMode === 'single' ? [feedPreferences.languages[0]] : feedPreferences.languages;
    updateFeedPreferences({ mode: newMode, languages: newLangs });
  };

  const handleLanguageToggle = (code) => {
    let newLangs = [...feedPreferences.languages];
    if (newLangs.includes(code)) {
      if (newLangs.length > 1) {
        newLangs = newLangs.filter(c => c !== code);
      }
    } else {
      if (feedPreferences.mode === 'single') {
        newLangs = [code];
        setShowLangs(false); // Auto-close in single mode
      } else {
        if (newLangs.length < 2) {
          newLangs.push(code);
        } else {
          newLangs = [newLangs[1], code];
        }
      }
    }
    updateFeedPreferences({ languages: newLangs });
  };

  const getLangLabel = (code) => availableLanguages.find(l => l.code === code)?.native || code;

  // Shared theme styles
  const activeStyle = {
    background: 'linear-gradient(135deg, var(--saffron), var(--gold))',
    color: 'white',
    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
  };

  return (
    <div className="glass" style={{ 
      padding: '0.5rem 1rem', 
      marginBottom: '1.5rem', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      position: 'sticky',
      top: '10px',
      zIndex: 10,
      margin: '0 1rem',
      gap: '1rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1 }}>
        {/* Custom Mode Toggle */}
        <div style={{ 
          display: 'flex', 
          background: 'rgba(0,0,0,0.2)', 
          padding: '3px', 
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          {['single', 'dual'].map((m) => (
            <button
              key={m}
              onClick={() => toggleMode(m)}
              style={{
                padding: '4px 14px',
                borderRadius: '18px',
                fontSize: '0.7rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                ...(feedPreferences.mode === m ? activeStyle : { background: 'transparent', color: 'var(--text-secondary)' })
              }}
            >
              {m === 'single' ? t('feed_mode_single') : t('feed_mode_dual')}
            </button>
          ))}
        </div>

        {/* Language Selection Dropdown */}
        <div ref={langRef} style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowLangs(!showLangs)}
            style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: 'var(--text-primary)', 
              padding: '5px 14px', 
              borderRadius: '20px', 
              cursor: 'pointer', 
              fontSize: '0.85rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: '0.2s',
              boxShadow: showLangs ? '0 0 15px rgba(251, 191, 36, 0.1)' : 'none'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.03)'}
          >
            <span style={{ color: 'var(--gold)', letterSpacing: '0.3px' }}>
              {feedPreferences.languages.map(getLangLabel).join(' + ')}
            </span>
            <span style={{ fontSize: '0.6rem', transition: 'transform 0.3s', transform: showLangs ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
          </button>

          {showLangs && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              left: 0,
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px',
              padding: '0.75rem',
              minWidth: '220px',
              boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              zIndex: 100,
              animation: 'fadeInUp 0.2s ease-out'
            }}>
              <style>
                {`
                  @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                `}
              </style>
              {availableLanguages.map(lang => {
                const isSelected = feedPreferences.languages.includes(lang.code);
                return (
                  <div 
                    key={lang.code}
                    onClick={() => handleLanguageToggle(lang.code)}
                    style={{
                      padding: '0.6rem 0.4rem',
                      borderRadius: '10px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      background: isSelected ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255,255,255,0.03)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--saffron)' : 'transparent',
                      color: isSelected ? 'var(--saffron)' : 'var(--text-primary)',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.target.style.background = 'rgba(255,255,255,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.target.style.background = 'rgba(255,255,255,0.03)';
                    }}
                  >
                    <div style={{ fontSize: '0.9rem', marginBottom: '2px' }}>{lang.native}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>{lang.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedLanguageBar;
