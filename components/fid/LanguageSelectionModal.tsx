'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SupportedLanguage } from "@/lib/translations";

const LANGUAGE_OPTIONS: { value: SupportedLanguage; label: string; code: string }[] = [
  { value: 'en', label: 'English', code: 'EN' },
  { value: 'pt-BR', label: 'Português', code: 'BR' },
  { value: 'es', label: 'Español', code: 'ES' },
  { value: 'hi', label: 'हिन्दी', code: 'HI' },
  { value: 'ru', label: 'Русский', code: 'RU' },
  { value: 'zh-CN', label: '中文', code: 'ZH' },
  { value: 'id', label: 'Bahasa', code: 'ID' },
  { value: 'fr', label: 'Français', code: 'FR' },
  { value: 'ja', label: '日本語', code: 'JA' },
  { value: 'it', label: 'Italiano', code: 'IT' },
];

const STORAGE_KEY = 'vibefid_language_selected';

export function LanguageSelectionModal() {
  const { lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(lang);

  // Check if user has already selected language
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // First time - show modal
        setIsOpen(true);
      }
    } catch (e) {
      // localStorage not available
      console.warn('localStorage not available');
    }
  }, []);

  const handleConfirm = () => {
    setLang(selectedLang);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch (e) {
      console.warn('Failed to save to localStorage');
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold/50 p-6 max-w-sm w-full shadow-[0_0_60px_rgba(255,215,0,0.15)]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <h2 className="font-display text-2xl text-vintage-gold tracking-wide mb-2">
            Select Language
          </h2>
          <p className="text-vintage-burnt-gold text-sm">
            Choose your preferred language
          </p>
        </div>

        {/* Language Grid */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedLang(option.value)}
              className={`
                flex items-center gap-2 px-3 py-3 rounded-xl transition-all
                ${selectedLang === option.value
                  ? 'bg-vintage-gold/20 border-2 border-vintage-gold text-vintage-gold'
                  : 'bg-vintage-black/50 border border-vintage-gold/20 text-gray-300 hover:bg-vintage-gold/10 hover:border-vintage-gold/40'
                }
              `}
            >
              <span className="text-xs font-bold text-vintage-gold bg-vintage-gold/20 px-1.5 py-0.5 rounded">{option.code}</span>
              <span className="text-sm font-medium truncate">{option.label}</span>
            </button>
          ))}
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          className="w-full py-4 bg-vintage-gold text-black font-display font-bold text-lg border-2 border-black shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
