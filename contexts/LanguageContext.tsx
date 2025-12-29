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
    try {
      const stored = localStorage.getItem('language') as SupportedLanguage;
      const validLanguages: SupportedLanguage[] = ['pt-BR', 'en', 'es', 'hi', 'ru', 'zh-CN', 'id', 'fr', 'ja', 'it'];
      if (stored && validLanguages.includes(stored)) {
        setLangState(stored);
      }
    } catch (error) {
      // localStorage might not be available in some contexts (e.g., Farcaster miniapp iframe)
      console.warn('localStorage not available, using default language');
    }
  }, []);

  // Save language to localStorage when it changes
  const setLang = useCallback((newLang: SupportedLanguage) => {
    setLangState(newLang);
    try {
      localStorage.setItem('language', newLang);
    } catch (error) {
      // localStorage might not be available in some contexts (e.g., Farcaster miniapp iframe)
      console.warn('localStorage not available, cannot persist language preference');
    }
  }, []);

  // Translation function with English fallback for missing keys
  const t = useCallback((key: TranslationKey, params: Record<string, any> = {}) => {
    // Try current language first, then fall back to English, then to key itself
    let text = (translations as any)[lang][key]
      || (translations as any)['en'][key]
      || key;

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
