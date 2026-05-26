import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import translations from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('app_language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app_language', lang);
  }, [lang]);

  const toggleLanguage = useCallback(() => {
    setLang(prev => {
      if (prev === 'en') return 'zh';
      if (prev === 'zh') return 'ru';
      return 'en';
    });
  }, []);

  const setLanguage = useCallback((l) => {
    setLang(l);
  }, []);

  const t = useCallback((key, fallback) => {
    return translations[lang]?.[key] || fallback || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
