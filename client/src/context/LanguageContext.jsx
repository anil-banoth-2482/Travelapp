import React, { createContext, useState, useContext, useEffect } from 'react';
import { en } from '../locales/en';
import { hi } from '../locales/hi';
import { te } from '../locales/te';
import { bn } from '../locales/bn';
import { kn } from '../locales/kn';
import { pa } from '../locales/pa';

export const availableLanguages = [
  { code: 'en', native: 'English', label: 'English' },
  { code: 'hi', native: 'हिन्दी', label: 'Hindi' },
  { code: 'te', native: 'తెలుగు', label: 'Telugu' },
  { code: 'bn', native: 'বাংলা', label: 'Bengali' },
  { code: 'kn', native: 'ಕನ್ನಡ', label: 'Kannada' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', label: 'Punjabi' },
];

const translations = {
  en,
  hi,
  te,
  bn,
  kn,
  pa,
};

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  // App UI Language
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('app_language') || 'en';
  });

  // Content Feed Language Preferences
  const [feedPreferences, setFeedPreferences] = useState(() => {
    const saved = localStorage.getItem('feed_language_preferences');
    return saved ? JSON.parse(saved) : {
      mode: 'single', // 'single' or 'dual'
      languages: ['en'], // Array of 1 or 2 language codes
      smartDetection: true,
      autoTranslate: false,
      preferNativeScript: true,
      isInitialSetupDone: false
    };
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('feed_language_preferences', JSON.stringify(feedPreferences));
  }, [feedPreferences]);

  const t = (key) => {
    return translations[language][key] || key;
  };

  const updateFeedPreferences = (updates) => {
    setFeedPreferences(prev => ({ ...prev, ...updates }));
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      availableLanguages,
      feedPreferences,
      updateFeedPreferences
    }}>
      {children}
    </LanguageContext.Provider>
  );
};
