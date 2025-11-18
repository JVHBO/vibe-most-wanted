"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { docsTranslations, type DocsSupportedLanguage, type DocsTranslationKey } from "@/lib/docs-translations";

type DocSection = "economy" | "battles" | "poker" | "achievements" | "quests" | "cards" | "faq";

// Simple language selector
function LanguageSelector() {
  const { lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'pt-BR', label: 'Português' },
    { code: 'es', label: 'Español' },
    { code: 'zh-CN', label: '中文' },
    { code: 'ru', label: 'Русский' },
    { code: 'hi', label: 'हिन्दी' },
  ];

  const currentLang = languages.find(l => l.code === lang) || languages[0];

  return (
    <div className="fixed top-24 right-4 z-50">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 bg-vintage-gold text-vintage-black font-bold rounded border-2 border-vintage-gold hover:bg-vintage-burnt-gold transition"
        >
          {currentLang.label} ▼
        </button>

        {isOpen && (
          <div className="absolute top-full mt-2 right-0 bg-vintage-charcoal border-2 border-vintage-gold rounded shadow-lg overflow-hidden min-w-[150px]">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => {
                  setLang(language.code as DocsSupportedLanguage);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-vintage-gold/20 transition ${
                  lang === language.code ? 'bg-vintage-gold/30 text-vintage-gold font-bold' : 'text-vintage-ice'
                }`}
              >
                {language.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Social media section
function SocialMediaSection() {
  return (
    <div className="mt-16 pt-8 border-t-2 border-vintage-gold/30">
      <h2 className="text-2xl font-display font-bold text-vintage-gold mb-6 text-center">
        FOLLOW US
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {/* Twitter/X */}
        <a
          href="https://x.com/Lowprofile_eth"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 bg-vintage-black/50 border-2 border-vintage-gold/30 rounded hover:border-vintage-gold transition"
        >
          <svg className="w-6 h-6 text-vintage-gold" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span className="text-vintage-ice font-bold">Twitter/X</span>
        </a>

        {/* Farcaster */}
        <a
          href="https://farcaster.xyz/~/channel/vibe-most-wanted"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 bg-vintage-black/50 border-2 border-vintage-gold/30 rounded hover:border-vintage-gold transition"
        >
          <svg className="w-6 h-6 text-vintage-gold" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
          </svg>
          <span className="text-vintage-ice font-bold">Farcaster</span>
        </a>

        {/* GitHub */}
        <a
          href="https://github.com/JVHBO"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 bg-vintage-black/50 border-2 border-vintage-gold/30 rounded hover:border-vintage-gold transition"
        >
          <svg className="w-6 h-6 text-vintage-gold" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <span className="text-vintage-ice font-bold">GitHub</span>
        </a>
      </div>
    </div>
  );
}

export default function DocsPage() {
  const { lang } = useLanguage();
  const [activeSection, setActiveSection] = useState<DocSection>("economy");

  const t = (key: DocsTranslationKey): string => {
    return (docsTranslations as any)[lang as DocsSupportedLanguage]?.[key] || (docsTranslations as any)['en'][key] || key;
  };

  const sections = [
    { id: "economy" as DocSection, label: t("economy") },
    { id: "battles" as DocSection, label: t("battles") },
    { id: "poker" as DocSection, label: "Poker Battle" },
    { id: "achievements" as DocSection, label: t("achievements") },
    { id: "quests" as DocSection, label: t("quests") },
    { id: "cards" as DocSection, label: t("cards") },
    { id: "faq" as DocSection, label: t("faq") },
  ];

  return (
    <div className="min-h-screen bg-vintage-black text-vintage-ice p-4">
      <div className="max-w-5xl mx-auto">
        <LanguageSelector />

        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-vintage-gold hover:text-vintage-orange transition mb-6"
        >
          <span>←</span>
          <span className="font-bold">{t("backToGame")}</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-display font-bold text-vintage-gold mb-2">
            {t("documentation")}
          </h1>
          <p className="text-vintage-burnt-gold">{t("subtitle")}</p>
        </div>

        {/* Section Navigation */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded font-bold transition border-2 ${
                activeSection === section.id
                  ? 'bg-vintage-gold text-vintage-black border-vintage-gold'
                  : 'bg-vintage-charcoal text-vintage-ice border-vintage-gold/30 hover:border-vintage-gold'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-vintage-charcoal border-2 border-vintage-gold/30 rounded p-6">
          {/* Economy */}
          {activeSection === "economy" && (
            <div>
              <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4">{t("economy")}</h2>
              <div className="space-y-4 text-vintage-ice">
                <p>{t("economyDesc")}</p>

                <h3 className="text-xl font-bold text-vintage-gold mt-6">Daily Limits</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>10 PvE battles per day</li>
                  <li>5 attacks per day</li>
                  <li>5 poker CPU battles per day</li>
                </ul>

                <h3 className="text-xl font-bold text-vintage-gold mt-6">How to Earn</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>Win PvE battles (10-500 VBMS based on difficulty)</li>
                  <li>Complete achievements (50-1000 VBMS)</li>
                  <li>Finish quests (100-500 VBMS)</li>
                  <li>Win poker battles (95% of pot)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Battles */}
          {activeSection === "battles" && (
            <div>
              <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4">{t("battles")}</h2>
              <div className="space-y-4 text-vintage-ice">
                <p>{t("battlesDesc")}</p>

                <h3 className="text-xl font-bold text-vintage-gold mt-6">Difficulties</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>Gey: 10-50 power, 10-20 VBMS reward</li>
                  <li>Goofy: 60-120 power, 30-50 VBMS reward</li>
                  <li>Gooner: 130-200 power, 60-100 VBMS reward</li>
                  <li>Gangster: 210-300 power, 120-200 VBMS reward</li>
                  <li>Gigachad: 310-500 power, 250-500 VBMS reward</li>
                </ul>
              </div>
            </div>
          )}

          {/* Poker */}
          {activeSection === "poker" && (
            <div>
              <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4">Poker Battle</h2>
              <div className="space-y-4 text-vintage-ice">
                <p>Play poker against CPU or other players using VBMS stakes.</p>

                <h3 className="text-xl font-bold text-vintage-gold mt-6">Stakes</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>10 VBMS</li>
                  <li>50 VBMS</li>
                  <li>200 VBMS</li>
                  <li>2000 VBMS</li>
                </ul>

                <h3 className="text-xl font-bold text-vintage-gold mt-6">Rules</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>Best of 5 rounds</li>
                  <li>Winner takes 95% of pot (5% house fee)</li>
                  <li>Blockchain secured (VBMS contract on Base)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Achievements */}
          {activeSection === "achievements" && (
            <div>
              <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4">{t("achievements")}</h2>
              <p className="text-vintage-ice">{t("achievementsDesc")}</p>
            </div>
          )}

          {/* Quests */}
          {activeSection === "quests" && (
            <div>
              <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4">{t("quests")}</h2>
              <p className="text-vintage-ice">{t("questsDesc")}</p>
            </div>
          )}

          {/* Cards */}
          {activeSection === "cards" && (
            <div>
              <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4">{t("cards")}</h2>
              <p className="text-vintage-ice">{t("cardsDesc")}</p>
            </div>
          )}

          {/* FAQ */}
          {activeSection === "faq" && (
            <div>
              <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4">{t("faq")}</h2>
              <div className="space-y-4 text-vintage-ice">
                <div>
                  <h3 className="font-bold text-vintage-gold">What is VBMS?</h3>
                  <p>VBMS is the in-game token on Base blockchain. Earn it by playing and use it for poker battles.</p>
                </div>
                <div>
                  <h3 className="font-bold text-vintage-gold">How do I claim rewards?</h3>
                  <p>Rewards go to your inbox. You can claim them to your wallet or keep accumulating for bonuses.</p>
                </div>
                <div>
                  <h3 className="font-bold text-vintage-gold">What's the difference between TESTVBMS and VBMS?</h3>
                  <p>TESTVBMS is virtual in-game currency. VBMS is the real blockchain token you can claim.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <SocialMediaSection />
      </div>
    </div>
  );
}
