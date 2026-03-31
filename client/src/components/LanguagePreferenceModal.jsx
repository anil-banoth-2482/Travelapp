import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const LanguagePreferenceModal = ({ isOpen, onClose }) => {
  const { availableLanguages, feedPreferences, updateFeedPreferences } = useLanguage();
  const [tempPrefs, setTempPrefs] = useState(feedPreferences);

  if (!isOpen) return null;

  const handleLanguageToggle = (code) => {
    let newLangs = [...tempPrefs.languages];
    if (newLangs.includes(code)) {
      if (newLangs.length > 1) {
        newLangs = newLangs.filter(c => c !== code);
      }
    } else {
      if (tempPrefs.mode === 'single') {
        newLangs = [code];
      } else {
        if (newLangs.length < 2) {
          newLangs.push(code);
        } else {
          newLangs = [newLangs[1], code];
        }
      }
    }
    setTempPrefs({ ...tempPrefs, languages: newLangs });
  };

  const handleModeChange = (mode) => {
    const newLangs = mode === 'single' ? [tempPrefs.languages[0]] : tempPrefs.languages;
    setTempPrefs({ ...tempPrefs, mode, languages: newLangs });
  };

  const handleSave = () => {
    updateFeedPreferences({ ...tempPrefs, isInitialSetupDone: true });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      backdropFilter: 'blur(8px)'
    }}>
      <div className="glass" style={{
        width: '90%', maxWidth: '500px', padding: '2rem',
        display: 'flex', flexDirection: 'column', gap: '1.5rem',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: 'var(--saffron)' }}>
            Customize Your Feed
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Choose how you want to experience content in your home feed.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '12px' }}>
          <button 
            onClick={() => handleModeChange('single')}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none',
              background: tempPrefs.mode === 'single' ? 'var(--saffron)' : 'transparent',
              color: 'white', cursor: 'pointer', transition: '0.3s', fontWeight: 600
            }}
          >
            Single Language
          </button>
          <button 
            onClick={() => handleModeChange('dual')}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none',
              background: tempPrefs.mode === 'dual' ? 'var(--saffron)' : 'transparent',
              color: 'white', cursor: 'pointer', transition: '0.3s', fontWeight: 600
            }}
          >
            Dual Language
          </button>
        </div>

        <div>
          <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>
            Select {tempPrefs.mode === 'single' ? 'one language' : 'up to two languages'}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
            {availableLanguages.map(lang => (
              <div 
                key={lang.code}
                onClick={() => handleLanguageToggle(lang.code)}
                style={{
                  padding: '1rem', borderRadius: '12px', textAlign: 'center', cursor: 'pointer',
                  border: '1px solid',
                  borderColor: tempPrefs.languages.includes(lang.code) ? 'var(--saffron)' : 'rgba(255,255,255,0.1)',
                  background: tempPrefs.languages.includes(lang.code) ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255,255,255,0.03)',
                  transition: '0.2s'
                }}
              >
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{lang.native}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{lang.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={tempPrefs.smartDetection}
              onChange={(e) => setTempPrefs({...tempPrefs, smartDetection: e.target.checked})}
              style={{ width: '18px', height: '18px', accentColor: 'var(--saffron)' }}
            />
            <div>
              <div style={{ fontWeight: 500 }}>AI Smart Detection</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Automatically detect and show code-mixed content.</div>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={tempPrefs.autoTranslate}
              onChange={(e) => setTempPrefs({...tempPrefs, autoTranslate: e.target.checked})}
              style={{ width: '18px', height: '18px', accentColor: 'var(--saffron)' }}
            />
            <div>
              <div style={{ fontWeight: 500 }}>Auto-translate mixed content</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Translate mixed snippets to your primary language.</div>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={tempPrefs.preferNativeScript}
              onChange={(e) => setTempPrefs({...tempPrefs, preferNativeScript: e.target.checked})}
              style={{ width: '18px', height: '18px', accentColor: 'var(--saffron)' }}
            />
            <div>
              <div style={{ fontWeight: 500 }}>Prefer Native Script</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Show native scripts over romanized text (e.g., Hindi over Hinglish).</div>
            </div>
          </label>
        </div>

        <button 
          onClick={handleSave}
          className="glass"
          style={{
            marginTop: '1rem', padding: '1rem', border: 'none',
            background: 'linear-gradient(135deg, var(--saffron), var(--gold))',
            color: 'white', fontWeight: 700, borderRadius: '12px', cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
};

export default LanguagePreferenceModal;
