'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations, type SupportedLanguage, type TranslationKey } from '@/lib/translations';

interface LanguageContextType {
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  t: (key: TranslationKey, params?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SupportedLanguage>('en');

  // Load language from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('language') as SupportedLanguage;
    if (stored && (stored === 'pt-BR' || stored === 'en' || stored === 'es' || stored === 'hi' || stored === 'ru')) {
      setLangState(stored);
    }
  }, []);

  // Save language to localStorage when it changes
  const setLang = useCallback((newLang: SupportedLanguage) => {
    setLangState(newLang);
    localStorage.setItem('language', newLang);
  }, []);

  // Translation function
  const t = useCallback((key: TranslationKey, params: Record<string, any> = {}) => {
    let text = (translations as any)[lang][key] || key;

    // Replace parameters in the text
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });

    return text;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
