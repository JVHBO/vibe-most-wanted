"use client";

import { useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { docsTranslations, type DocsSupportedLanguage, type DocsTranslationKey } from "@/lib/docs-translations";

type DocSection = "economy" | "battles" | "poker" | "achievements" | "quests" | "cards" | "faq";

// Language selector component
function LanguageSelector() {
  const { lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  ];

  const currentLang = languages.find(l => l.code === lang) || languages[0];

  return (
    <div className="fixed top-24 right-4 z-50">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-vintage-gold to-vintage-burnt-gold text-vintage-black font-bold rounded-xl shadow-gold hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-vintage-gold/50"
        >
          <span className="text-2xl">{currentLang.flag}</span>
          <span className="hidden sm:block">{currentLang.label}</span>
          <span className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {isOpen && (
          <div className="absolute top-full mt-2 right-0 bg-vintage-charcoal border-2 border-vintage-gold/50 rounded-xl shadow-2xl overflow-hidden min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => {
                  setLang(language.code as DocsSupportedLanguage);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-vintage-gold/20 transition-all font-modern ${
                  lang === language.code ? 'bg-vintage-gold/30 text-vintage-gold font-bold' : 'text-vintage-ice'
                }`}
              >
                <span className="text-2xl">{language.flag}</span>
                <span>{language.label}</span>
                {lang === language.code && <span className="ml-auto text-vintage-gold">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Social media links component
function SocialMediaSection() {
  const socialLinks = [
    {
      name: 'X (Twitter)',
      icon: '𝕏',
      url: 'https://x.com/VibeMostWanted',
      color: 'from-black to-gray-800',
      hoverColor: 'hover:from-gray-800 hover:to-black'
    },
    {
      name: 'Warpcast',
      icon: '📡',
      url: 'https://warpcast.com/VibeMostWanted',
      color: 'from-purple-600 to-purple-800',
      hoverColor: 'hover:from-purple-500 hover:to-purple-700'
    },
    {
      name: 'GitHub',
      icon: '💻',
      url: 'https://github.com/JVHBO',
      color: 'from-gray-700 to-gray-900',
      hoverColor: 'hover:from-gray-600 hover:to-gray-800'
    }
  ];

  return (
    <div className="mt-12 pt-8 border-t-2 border-vintage-gold/30">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-display font-bold text-vintage-gold mb-3 flex items-center justify-center gap-3">
          <span className="animate-pulse">🌟</span>
          FOLLOW US
          <span className="animate-pulse">🌟</span>
        </h2>
        <p className="text-vintage-burnt-gold font-modern text-lg">
          Join our community and stay updated!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {socialLinks.map((social) => (
          <a
            key={social.name}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group relative bg-gradient-to-br ${social.color} ${social.hoverColor} p-6 rounded-2xl border-2 border-vintage-gold/30 hover:border-vintage-gold transition-all duration-300 hover:scale-105 hover:shadow-2xl shadow-gold`}
          >
            <div className="text-center">
              <div className="text-6xl mb-3 group-hover:scale-110 transition-transform duration-300">
                {social.icon}
              </div>
              <h3 className="text-xl font-display font-bold text-white mb-2">
                {social.name}
              </h3>
              <div className="text-vintage-gold/80 group-hover:text-vintage-gold transition-colors">
                Click to follow →
              </div>
            </div>

            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
          </a>
        ))}
      </div>

      {/* Creator credit */}
      <div className="mt-8 text-center">
        <p className="text-vintage-burnt-gold font-modern">
          Created with ❤️ by the VIBE MOST WANTED team
        </p>
        <p className="text-vintage-gold/50 text-sm mt-2">
          © 2025 VIBE MOST WANTED - All rights reserved
        </p>
      </div>
    </div>
  );
}

export default function DocsPage() {
  const { lang } = useLanguage();
  const [activeSection, setActiveSection] = useState<DocSection>("economy");

  // Translation helper
  const t = (key: DocsTranslationKey): string => {
    return (docsTranslations as any)[lang as DocsSupportedLanguage]?.[key] || (docsTranslations as any)['en'][key] || key;
  };

  // Helper to get "coins" word in the current language
  const getCoinsWord = (): string => {
    switch (lang) {
      case 'pt-BR': return 'moedas';
      case 'es': return 'monedas';
      case 'zh-CN': return '金币';
      case 'ru': return 'монет';
      case 'hi': return 'सिक्के';
      default: return 'coins';
    }
  };

  const sections = [
    { id: "economy" as DocSection, label: t("economy"), icon: "/images/icons/coins.svg" },
    { id: "battles" as DocSection, label: t("battles"), icon: "/images/icons/battle.svg" },
    { id: "poker" as DocSection, label: "Poker Battle", icon: "/images/icons/cards.svg" },
    { id: "achievements" as DocSection, label: t("achievements"), icon: "/images/icons/achievement.svg" },
    { id: "quests" as DocSection, label: t("quests"), icon: "/images/icons/mission.svg" },
    { id: "cards" as DocSection, label: t("cards"), icon: "/images/icons/cards.svg" },
    { id: "faq" as DocSection, label: t("faq"), icon: "/images/icons/help.svg" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-vintage-deep-black via-vintage-black to-vintage-deep-black text-vintage-ice p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-vintage-gold rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-vintage-burnt-gold rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Language Selector */}
        <LanguageSelector />

        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-vintage-gold hover:text-vintage-orange transition mb-6 font-modern group"
        >
          <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span>
          <span className="font-bold">{t("backToGame")}</span>
        </Link>

        {/* Header with animated gradient */}
        <div className="text-center mb-12 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-vintage-gold/10 to-transparent blur-2xl" />
          <h1 className="text-5xl md:text-7xl font-display font-bold bg-gradient-to-r from-vintage-gold via-vintage-burnt-gold to-vintage-gold bg-clip-text text-transparent mb-4 animate-in slide-in-from-top duration-500">
            {t("documentation")}
          </h1>
          <p className="text-xl text-vintage-burnt-gold font-modern animate-in slide-in-from-top duration-700 delay-100">
            {t("subtitle")}
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 animate-in fade-in duration-1000 delay-200">
            <span className="px-4 py-2 bg-vintage-gold/20 rounded-full text-vintage-gold text-sm font-bold">
              📚 Complete Guide
            </span>
            <span className="px-4 py-2 bg-blue-500/20 rounded-full text-blue-300 text-sm font-bold">
              🌍 6 Languages
            </span>
            <span className="px-4 py-2 bg-green-500/20 rounded-full text-green-300 text-sm font-bold">
              ✨ Always Updated
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-vintage-charcoal/80 backdrop-blur-lg border-2 border-vintage-gold/30 rounded-2xl p-6 sticky top-4 shadow-2xl shadow-gold/20 animate-in slide-in-from-left duration-500">
              <h3 className="text-vintage-gold font-display font-bold text-xl mb-6 flex items-center gap-2">
                <NextImage src="/images/icons/stats.svg" alt="Menu" width={24} height={24} />
                {t("sections")}
              </h3>
              <nav className="space-y-3">
                {sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-5 py-3 rounded-xl transition-all duration-300 font-modern flex items-center gap-3 group ${
                      activeSection === section.id
                        ? "bg-gradient-to-r from-vintage-gold to-vintage-gold-dark text-vintage-black font-bold shadow-xl scale-105"
                        : "text-vintage-gold/70 hover:bg-vintage-gold/10 border-2 border-vintage-gold/20 hover:border-vintage-gold/40 hover:scale-102"
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <NextImage
                      src={section.icon}
                      alt={section.label}
                      width={24}
                      height={24}
                      className={activeSection === section.id ? "" : "group-hover:scale-110 transition-transform"}
                    />
                    <span>{section.label}</span>
                    {activeSection === section.id && <span className="ml-auto">→</span>}
                  </button>
                ))}
              </nav>

              {/* Quick stats */}
              <div className="mt-8 pt-6 border-t border-vintage-gold/20 space-y-3">
                <div className="text-sm text-vintage-burnt-gold font-modern">
                  <div className="flex items-center justify-between mb-2">
                    <span>📊 Total Sections</span>
                    <span className="text-vintage-gold font-bold">7</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span>🎮 Game Modes</span>
                    <span className="text-vintage-gold font-bold">5+</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>🏆 Features</span>
                    <span className="text-vintage-gold font-bold">20+</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 animate-in slide-in-from-right duration-500">
            <div className="bg-vintage-charcoal/80 backdrop-blur-lg border-2 border-vintage-gold/30 rounded-2xl p-8 shadow-2xl shadow-gold/20 min-h-[600px]">
              {activeSection === "economy" && <EconomyDocs t={t} />}
              {activeSection === "battles" && <BattlesDocs t={t} getCoinsWord={getCoinsWord} />}
              {activeSection === "poker" && <PokerBattleDocs />}
              {activeSection === "achievements" && <AchievementsDocs t={t} />}
              {activeSection === "quests" && <QuestsDocs t={t} />}
              {activeSection === "cards" && <CardsDocs t={t} />}
              {activeSection === "faq" && <FAQDocs t={t} />}
            </div>

            {/* Social Media Section */}
            <div className="mt-8 bg-vintage-charcoal/80 backdrop-blur-lg border-2 border-vintage-gold/30 rounded-2xl p-8 shadow-2xl shadow-gold/20">
              <SocialMediaSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Economy Section (Enhanced)
function EconomyDocs({ t }: { t: (key: DocsTranslationKey) => string }) {
  return (
    <div className="space-y-8 text-vintage-ice font-modern">
      <div className="animate-in fade-in slide-in-from-top duration-500">
        <h2 className="text-4xl font-display font-bold text-vintage-gold mb-6 flex items-center gap-3">
          <NextImage src="/images/icons/coins.svg" alt="Economy" width={40} height={40} className="animate-bounce" />
          {t("economyTitle")}
        </h2>
        <p className="text-lg mb-4 leading-relaxed text-vintage-ice/90">
          {t("economyIntro")}
        </p>
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-l-4 border-blue-500 rounded-lg p-4 my-4">
          <p className="text-blue-300 font-bold mb-2">💡 Pro Tip:</p>
          <p className="text-sm">Complete daily quests and achievements to maximize your earnings! Combine PvE battles with Attack mode for the best results.</p>
        </div>
      </div>

      {/* How to Earn Coins */}
      <div className="bg-gradient-to-br from-vintage-black/50 to-vintage-charcoal/50 rounded-xl p-6 border-2 border-vintage-gold/30 hover:border-vintage-gold/50 transition-all duration-300 hover:shadow-xl animate-in slide-in-from-left duration-500 delay-100">
        <h3 className="text-2xl font-bold text-vintage-gold mb-5 flex items-center gap-3">
          <NextImage src="/images/icons/mission.svg" alt="Earn" width={28} height={28} />
          {t("howToEarnCoins")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-vintage-black/30 rounded-lg p-4 border border-green-500/30">
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚔️</span>
              <div>
                <strong className="text-green-400 text-lg">{t("earnPve")}</strong>
                <p className="text-sm mt-1">{t("earnPveDesc")}</p>
                <p className="text-xs text-vintage-burnt-gold mt-2">💰 Rewards: 5-120 coins per battle</p>
              </div>
            </div>
          </div>

          <div className="bg-vintage-black/30 rounded-lg p-4 border border-purple-500/30">
            <div className="flex items-start gap-3">
              <span className="text-3xl">🎴</span>
              <div>
                <strong className="text-purple-400 text-lg">{t("earnPvp")}</strong>
                <p className="text-sm mt-1">{t("earnPvpDesc")}</p>
                <p className="text-xs text-vintage-burnt-gold mt-2">💰 Winner gets the pot!</p>
              </div>
            </div>
          </div>

          <div className="bg-vintage-black/30 rounded-lg p-4 border border-red-500/30">
            <div className="flex items-start gap-3">
              <span className="text-3xl">🗡️</span>
              <div>
                <strong className="text-red-400 text-lg">{t("earnAttack")}</strong>
                <p className="text-sm mt-1">{t("earnAttackDesc")}</p>
                <p className="text-xs text-vintage-burnt-gold mt-2">💰 Up to 500 coins per attack</p>
              </div>
            </div>
          </div>

          <div className="bg-vintage-black/30 rounded-lg p-4 border border-yellow-500/30">
            <div className="flex items-start gap-3">
              <span className="text-3xl">🏆</span>
              <div>
                <strong className="text-yellow-400 text-lg">{t("earnAchievements")}</strong>
                <p className="text-sm mt-1">{t("earnAchievementsDesc")}</p>
                <p className="text-xs text-vintage-burnt-gold mt-2">💰 Collect all for big rewards!</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-vintage-black/30 rounded-lg p-4 border border-blue-500/30">
          <div className="flex items-start gap-3">
            <span className="text-3xl">📋</span>
            <div className="flex-1">
              <strong className="text-blue-400 text-lg">{t("earnQuests")}</strong>
              <p className="text-sm mt-1">{t("earnQuestsDesc")}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-blue-500/10 rounded px-3 py-2">
                  <span className="text-blue-300">Daily Quests:</span> 50-100 coins
                </div>
                <div className="bg-purple-500/10 rounded px-3 py-2">
                  <span className="text-purple-300">Weekly Quests:</span> 200-800 coins
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Limits */}
      <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 rounded-xl p-6 border-2 border-red-500/30 animate-in slide-in-from-right duration-500 delay-200">
        <h3 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
          ⏰ {t("dailyLimit")}
        </h3>
        <p className="mb-4">{t("dailyLimitDesc")}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-vintage-black/40 rounded-lg p-3 text-center">
            <div className="text-2xl mb-2">⚔️</div>
            <div className="text-sm text-vintage-burnt-gold">PvE Battles</div>
            <div className="text-xl font-bold text-vintage-gold">10/day</div>
          </div>
          <div className="bg-vintage-black/40 rounded-lg p-3 text-center">
            <div className="text-2xl mb-2">🗡️</div>
            <div className="text-sm text-vintage-burnt-gold">Attacks</div>
            <div className="text-xl font-bold text-vintage-gold">5/day</div>
          </div>
          <div className="bg-vintage-black/40 rounded-lg p-3 text-center">
            <div className="text-2xl mb-2">♠️</div>
            <div className="text-sm text-vintage-burnt-gold">Poker CPU</div>
            <div className="text-xl font-bold text-vintage-gold">5/day</div>
          </div>
        </div>
        <p className="text-sm text-vintage-burnt-gold mt-4 text-center">
          ⏰ All limits reset daily at midnight UTC
        </p>
      </div>

      {/* Entry Fees */}
      <div className="bg-gradient-to-br from-vintage-black/50 to-vintage-charcoal/50 rounded-xl p-6 border-2 border-vintage-gold/30 animate-in slide-in-from-left duration-500 delay-300">
        <h3 className="text-2xl font-bold text-vintage-gold mb-4">{t("entryFees")}</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
            <span className="text-2xl">🗡️</span>
            <div className="flex-1">
              <div className="font-bold text-red-400">Attack Mode</div>
              <div className="text-sm text-vintage-ice/80">{t("entryFeeAttack")}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
            <span className="text-2xl">🎴</span>
            <div className="flex-1">
              <div className="font-bold text-purple-400">PvP Mode</div>
              <div className="text-sm text-vintage-ice/80">{t("entryFeePvp")}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
            <span className="text-2xl">⚔️</span>
            <div className="flex-1">
              <div className="font-bold text-green-400">PvE Mode</div>
              <div className="text-sm text-vintage-ice/80">{t("entryFeePve")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tips for earning more */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border-2 border-purple-500/30 animate-in fade-in duration-700 delay-400">
        <h3 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
          💡 Pro Strategies for Maximum Earnings
        </h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">✓</span>
            <span><strong>Complete Daily Quests First:</strong> Easy 300-400 coins guaranteed every day</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">✓</span>
            <span><strong>Use All PvE Attempts:</strong> 10 battles × 120 coins (Gigachad) = 1200 coins potential</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">✓</span>
            <span><strong>Attack Top Players:</strong> Better defense decks = higher rewards (up to 500 coins)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">✓</span>
            <span><strong>Unlock Achievements:</strong> One-time rewards add up to thousands of coins</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-1">✓</span>
            <span><strong>Weekly Leaderboard:</strong> Top 10 players get bonus rewards every Monday!</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// Battles Section (Enhanced)
function BattlesDocs({ t, getCoinsWord }: { t: (key: DocsTranslationKey) => string; getCoinsWord: () => string }) {
  return (
    <div className="space-y-8 text-vintage-ice font-modern">
      <div className="animate-in fade-in slide-in-from-top duration-500">
        <h2 className="text-4xl font-display font-bold text-vintage-gold mb-6 flex items-center gap-3">
          <NextImage src="/images/icons/battle.svg" alt="Battles" width={40} height={40} className="animate-pulse" />
          {t("battlesTitle")}
        </h2>
        <p className="text-lg mb-4 leading-relaxed">
          {t("battlesIntro")}
        </p>
      </div>

      {/* PvE Mode */}
      <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-xl p-6 border-2 border-green-500/40 hover:border-green-400/60 transition-all duration-300 hover:shadow-2xl shadow-green-500/20 animate-in slide-in-from-left duration-500 delay-100">
        <h3 className="text-3xl font-bold text-green-400 mb-4 flex items-center gap-3">
          ⚔️ {t("pveMode")}
        </h3>
        <p className="text-lg mb-5">{t("pveModeDesc")}</p>

        <div className="bg-vintage-black/40 rounded-lg p-5 mb-4">
          <p className="font-bold text-green-300 mb-4 text-xl flex items-center gap-2">
            <span>🎯</span> {t("pveDifficulties")}:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30 hover:bg-green-500/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="font-bold text-green-300">{t("pveGey")}</span>
                <span className="text-vintage-gold font-bold">+5 {getCoinsWord()}</span>
              </div>
              <div className="text-xs text-vintage-burnt-gold mt-1">Power: ~75 | Easy</div>
            </div>

            <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/30 hover:bg-blue-500/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-300">{t("pveTop")}</span>
                <span className="text-vintage-gold font-bold">+10 {getCoinsWord()}</span>
              </div>
              <div className="text-xs text-vintage-burnt-gold mt-1">Power: ~105 | Medium</div>
            </div>

            <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/30 hover:bg-yellow-500/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="font-bold text-yellow-300">{t("pveG")}</span>
                <span className="text-vintage-gold font-bold">+15 {getCoinsWord()}</span>
              </div>
              <div className="text-xs text-vintage-burnt-gold mt-1">Power: ~360 | Hard</div>
            </div>

            <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/30 hover:bg-orange-500/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-300">{t("pveMid")}</span>
                <span className="text-vintage-gold font-bold">+20 {getCoinsWord()}</span>
              </div>
              <div className="text-xs text-vintage-burnt-gold mt-1">Power: ~750 | Very Hard</div>
            </div>

            <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/30 hover:bg-red-500/20 transition-all md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-300 text-lg">{t("pveGigachad")} 👑</span>
                <span className="text-vintage-gold font-bold text-lg">+120 {getCoinsWord()}</span>
              </div>
              <div className="text-xs text-vintage-burnt-gold mt-1">Power: ~855 | EXTREME - Best Rewards!</div>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/10 border-l-4 border-blue-400 rounded-lg p-4">
          <p className="text-blue-300 text-sm">
            <strong>💡 Tip:</strong> Daily limit is 10 PvE battles. Play Gigachad difficulty for maximum earnings (1200 coins/day potential)!
          </p>
        </div>
      </div>

      {/* PvP Mode */}
      <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-xl p-6 border-2 border-purple-500/40 hover:border-purple-400/60 transition-all duration-300 hover:shadow-2xl shadow-purple-500/20 animate-in slide-in-from-right duration-500 delay-200">
        <h3 className="text-3xl font-bold text-purple-400 mb-4 flex items-center gap-3">
          👥 {t("pvpMode")}
        </h3>
        <p className="text-lg mb-5">{t("pvpModeDesc")}</p>

        <div className="bg-vintage-black/40 rounded-lg p-5 mb-4">
          <p className="font-bold text-purple-300 mb-4 text-xl">{t("pvpRewards")}:</p>
          <div className="space-y-3">
            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏆</span>
                <div>
                  <div className="text-green-400 font-bold text-lg">{t("pvpWin")}</div>
                  <div className="text-sm text-vintage-ice/80">Winner gets the full pot!</div>
                </div>
              </div>
            </div>

            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💔</span>
                <div>
                  <div className="text-red-400 font-bold text-lg">{t("pvpLoss")}</div>
                  <div className="text-sm text-vintage-ice/80">Lose your ante but gain experience</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-500/10 rounded-lg p-4 border border-gray-500/30">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🤝</span>
                <div>
                  <div className="text-gray-400 font-bold text-lg">{t("pvpTie")}</div>
                  <div className="text-sm text-vintage-ice/80">Rare, but both get their ante back</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-purple-500/10 border-l-4 border-purple-400 rounded-lg p-4">
          <p className="text-purple-300 text-sm">
            <strong>⚡ Note:</strong> PvP has no daily limit! Play as many matches as you want. Stakes range from 2 to 200 coins.
          </p>
        </div>
      </div>

      {/* Attack Mode */}
      <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 rounded-xl p-6 border-2 border-red-500/40 hover:border-red-400/60 transition-all duration-300 hover:shadow-2xl shadow-red-500/20 animate-in slide-in-from-left duration-500 delay-300">
        <h3 className="text-3xl font-bold text-red-400 mb-4 flex items-center gap-3">
          🗡️ {t("attackMode")}
        </h3>
        <p className="text-lg mb-5">{t("attackModeDesc")}</p>

        <div className="bg-vintage-black/40 rounded-lg p-5 mb-4">
          <p className="font-bold text-red-300 mb-4 text-xl flex items-center gap-2">
            <span>📋</span> {t("attackHow")}:
          </p>
          <ol className="space-y-3">
            <li className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
              <strong className="text-red-300">1.</strong> {t("attackStep1")}
            </li>
            <li className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
              <strong className="text-red-300">2.</strong> {t("attackStep2")}
            </li>
            <li className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
              <strong className="text-red-300">3.</strong> {t("attackStep3")}
            </li>
          </ol>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-vintage-black/40 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">💰</div>
            <div className="text-sm text-vintage-burnt-gold">Entry Fee</div>
            <div className="text-lg font-bold text-red-400">50 coins</div>
          </div>
          <div className="bg-vintage-black/40 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">🎁</div>
            <div className="text-sm text-vintage-burnt-gold">Max Reward</div>
            <div className="text-lg font-bold text-vintage-gold">500 coins</div>
          </div>
        </div>

        <div className="bg-orange-500/10 border-l-4 border-orange-400 rounded-lg p-4">
          <p className="text-orange-300 text-sm">
            <strong>🎯 Strategy:</strong> Attack players with strong defense decks for better rewards! Daily limit: 5 attacks.
          </p>
        </div>
      </div>
    </div>
  );
}

// Poker Battle Section (Updated for VBMS only)
function PokerBattleDocs() {
  return (
    <div className="space-y-8 text-vintage-ice font-modern">
      <div className="animate-in fade-in slide-in-from-top duration-500">
        <h2 className="text-4xl font-display font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent mb-6 flex items-center gap-3">
          <span className="text-5xl">♠️</span>
          Poker Battle - VBMS Edition
        </h2>
        <p className="text-lg mb-4 leading-relaxed">
          The ultimate strategic card battle mode! Build powerful decks, outplay your opponents, and win big with VBMS tokens on the Base blockchain.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-3 border border-yellow-500/30 text-center">
            <div className="text-2xl mb-1">💎</div>
            <div className="text-yellow-400 font-bold">Real VBMS Stakes</div>
          </div>
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-3 border border-blue-500/30 text-center">
            <div className="text-2xl mb-1">⚡</div>
            <div className="text-blue-400 font-bold">Instant Payouts</div>
          </div>
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-3 border border-green-500/30 text-center">
            <div className="text-2xl mb-1">🔒</div>
            <div className="text-green-400 font-bold">Blockchain Secure</div>
          </div>
        </div>
      </div>

      {/* How to Play */}
      <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 rounded-xl p-6 border-2 border-blue-500/40 animate-in slide-in-from-left duration-500 delay-100">
        <h3 className="text-3xl font-bold text-blue-400 mb-5 flex items-center gap-3">
          🎯 How to Play
        </h3>
        <div className="space-y-4">
          <div className="bg-vintage-black/40 rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-start gap-3">
              <span className="text-3xl">1️⃣</span>
              <div>
                <strong className="text-blue-300 text-lg">Build Your Deck</strong>
                <p className="text-sm mt-1">Select 10 powerful cards from your collection. Strategy matters!</p>
              </div>
            </div>
          </div>

          <div className="bg-vintage-black/40 rounded-lg p-4 border-l-4 border-purple-500">
            <div className="flex items-start gap-3">
              <span className="text-3xl">2️⃣</span>
              <div>
                <strong className="text-purple-300 text-lg">Each Round</strong>
                <p className="text-sm mt-1">Pick 1 card from your hand - choose wisely!</p>
              </div>
            </div>
          </div>

          <div className="bg-vintage-black/40 rounded-lg p-4 border-l-4 border-yellow-500">
            <div className="flex items-start gap-3">
              <span className="text-3xl">3️⃣</span>
              <div>
                <strong className="text-yellow-300 text-lg">Use Boosts</strong>
                <p className="text-sm mt-1">Enhance your cards with powerful abilities (costs coins from your bankroll)</p>
              </div>
            </div>
          </div>

          <div className="bg-vintage-black/40 rounded-lg p-4 border-l-4 border-green-500">
            <div className="flex items-start gap-3">
              <span className="text-3xl">4️⃣</span>
              <div>
                <strong className="text-green-300 text-lg">Win Rounds</strong>
                <p className="text-sm mt-1">Higher power wins the round and the pot!</p>
              </div>
            </div>
          </div>

          <div className="bg-vintage-black/40 rounded-lg p-4 border-l-4 border-red-500">
            <div className="flex items-start gap-3">
              <span className="text-3xl">5️⃣</span>
              <div>
                <strong className="text-red-300 text-lg">Best of 5</strong>
                <p className="text-sm mt-1">First to win 3 rounds takes all the VBMS!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Modes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right duration-500 delay-200">
        <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-xl p-6 border-2 border-cyan-500/40 hover:border-cyan-400/60 transition-all hover:shadow-2xl shadow-cyan-500/20">
          <h3 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
            ⚔️ PvE - vs CPU
          </h3>
          <p className="mb-4">Practice against AI opponents with 5 difficulty levels. Perfect your strategy risk-free!</p>
          <div className="bg-vintage-black/40 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-vintage-burnt-gold">Entry Fee:</span>
              <span className="text-green-400 font-bold">FREE</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-vintage-burnt-gold">Rewards:</span>
              <span className="text-vintage-gold font-bold">Practice Mode</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-vintage-burnt-gold">Daily Limit:</span>
              <span className="text-yellow-400 font-bold">5 games</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-xl p-6 border-2 border-purple-500/40 hover:border-purple-400/60 transition-all hover:shadow-2xl shadow-purple-500/20">
          <h3 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-2">
            👥 PvP - Multiplayer
          </h3>
          <p className="mb-4">Challenge real players with VBMS tokens! Create or join rooms with customizable stakes.</p>
          <div className="bg-vintage-black/40 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-vintage-burnt-gold">Token:</span>
              <span className="text-yellow-400 font-bold">$VBMS Only</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-vintage-burnt-gold">Stakes:</span>
              <span className="text-vintage-gold font-bold">10-2000 VBMS</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-vintage-burnt-gold">Daily Limit:</span>
              <span className="text-green-400 font-bold">Unlimited!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Boosts & Actions */}
      <div className="bg-gradient-to-br from-orange-900/20 to-red-900/20 rounded-xl p-6 border-2 border-orange-500/40 animate-in slide-in-from-left duration-500 delay-300">
        <h3 className="text-3xl font-bold text-orange-400 mb-5 flex items-center gap-3">
          💥 Boosts & Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-vintage-black/40 rounded-lg p-5 border-2 border-yellow-500/40 hover:border-yellow-400/60 transition-all">
            <div className="flex items-start gap-3">
              <span className="text-4xl">⚔️</span>
              <div>
                <strong className="text-yellow-400 text-xl">BOOST</strong>
                <p className="text-sm mt-1">+30% power to your card</p>
                <div className="mt-2 inline-block bg-yellow-500/20 px-3 py-1 rounded-full text-xs text-yellow-300">
                  Cost: 2× ante
                </div>
              </div>
            </div>
          </div>

          <div className="bg-vintage-black/40 rounded-lg p-5 border-2 border-blue-500/40 hover:border-blue-400/60 transition-all">
            <div className="flex items-start gap-3">
              <span className="text-4xl">🛡️</span>
              <div>
                <strong className="text-blue-400 text-xl">SHIELD</strong>
                <p className="text-sm mt-1">Block opponent's boost</p>
                <div className="mt-2 inline-block bg-blue-500/20 px-3 py-1 rounded-full text-xs text-blue-300">
                  Cost: 2× ante
                </div>
              </div>
            </div>
          </div>

          <div className="bg-vintage-black/40 rounded-lg p-5 border-2 border-red-500/40 hover:border-red-400/60 transition-all">
            <div className="flex items-start gap-3">
              <span className="text-4xl">💥</span>
              <div>
                <strong className="text-red-400 text-xl">CRITICAL</strong>
                <p className="text-sm mt-1">Double your card power!</p>
                <div className="mt-2 inline-block bg-red-500/20 px-3 py-1 rounded-full text-xs text-red-300">
                  Cost: 4× ante
                </div>
              </div>
            </div>
          </div>

          <div className="bg-vintage-black/40 rounded-lg p-5 border-2 border-gray-500/40 hover:border-gray-400/60 transition-all">
            <div className="flex items-start gap-3">
              <span className="text-4xl">✋</span>
              <div>
                <strong className="text-gray-400 text-xl">PASS</strong>
                <p className="text-sm mt-1">Play without boost</p>
                <div className="mt-2 inline-block bg-green-500/20 px-3 py-1 rounded-full text-xs text-green-300">
                  FREE - Save coins!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stakes & Rewards */}
      <div className="bg-gradient-to-br from-yellow-900/20 to-amber-900/20 rounded-xl p-6 border-2 border-yellow-500/40 animate-in slide-in-from-right duration-500 delay-400">
        <h3 className="text-3xl font-bold text-yellow-400 mb-5 flex items-center gap-3">
          💰 Stakes & Rewards
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-lg p-4 border border-green-500/40 text-center">
            <div className="text-green-400 font-bold mb-1">Low</div>
            <div className="text-2xl font-bold text-vintage-gold">10</div>
            <div className="text-xs text-vintage-burnt-gold">VBMS</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-lg p-4 border border-yellow-500/40 text-center">
            <div className="text-yellow-400 font-bold mb-1">Mid</div>
            <div className="text-2xl font-bold text-vintage-gold">50</div>
            <div className="text-xs text-vintage-burnt-gold">VBMS</div>
          </div>

          <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-lg p-4 border border-red-500/40 text-center">
            <div className="text-red-400 font-bold mb-1">High</div>
            <div className="text-2xl font-bold text-vintage-gold">200</div>
            <div className="text-xs text-vintage-burnt-gold">VBMS</div>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-pink-800/20 rounded-lg p-4 border border-purple-500/40 text-center">
            <div className="text-purple-400 font-bold mb-1">Extreme</div>
            <div className="text-2xl font-bold text-vintage-gold">2000</div>
            <div className="text-xs text-vintage-burnt-gold">VBMS</div>
          </div>
        </div>

        <div className="space-y-3 bg-vintage-black/40 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-vintage-burnt-gold">How It Works:</span>
            <span className="text-vintage-ice">Both players pay ante once</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-vintage-burnt-gold">The Pot:</span>
            <span className="text-yellow-400 font-bold">Ante × 2</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-vintage-burnt-gold">Winner Gets:</span>
            <span className="text-green-400 font-bold">100% of pot</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-vintage-burnt-gold">Game Format:</span>
            <span className="text-vintage-gold font-bold">Best of 5 rounds</span>
          </div>
        </div>

        <div className="mt-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-l-4 border-yellow-400 rounded-lg p-4">
          <p className="text-yellow-300 font-bold">💡 Example:</p>
          <p className="text-sm mt-2">10 VBMS ante → 20 VBMS pot → Winner gets 20 VBMS!</p>
        </div>
      </div>

      {/* Pro Tips */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border-2 border-blue-500/30 animate-in fade-in duration-700 delay-500">
        <h3 className="text-3xl font-bold text-blue-300 mb-5 flex items-center gap-3">
          💡 Pro Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-vintage-black/40 rounded-lg p-4 border-l-4 border-green-500">
            <div className="flex items-start gap-2">
              <span className="text-green-400 text-xl mt-1">✓</span>
              <span className="text-sm">Save your strongest cards for crucial rounds 3-5</span>
            </div>
          </div>
          <div className="bg-vintage-black/40 rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-start gap-2">
              <span className="text-blue-400 text-xl mt-1">✓</span>
              <span className="text-sm">Use SHIELD strategically to counter opponent's BOOST</span>
            </div>
          </div>
          <div className="bg-vintage-black/40 rounded-lg p-4 border-l-4 border-red-500">
            <div className="flex items-start gap-2">
              <span className="text-red-400 text-xl mt-1">✓</span>
              <span className="text-sm">CRITICAL is expensive but game-changing!</span>
            </div>
          </div>
          <div className="bg-vintage-black/40 rounded-lg p-4 border-l-4 border-yellow-500">
            <div className="flex items-start gap-2">
              <span className="text-yellow-400 text-xl mt-1">✓</span>
              <span className="text-sm">Watch your bankroll - don't run out of coins mid-game</span>
            </div>
          </div>
          <div className="bg-vintage-black/40 rounded-lg p-4 border-l-4 border-purple-500">
            <div className="flex items-start gap-2">
              <span className="text-purple-400 text-xl mt-1">✓</span>
              <span className="text-sm">Start with lower stakes to learn strategies</span>
            </div>
          </div>
          <div className="bg-vintage-black/40 rounded-lg p-4 border-l-4 border-pink-500">
            <div className="flex items-start gap-2">
              <span className="text-pink-400 text-xl mt-1">✓</span>
              <span className="text-sm">First to 3 round wins takes it all - play smart!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Blockchain Info */}
      <div className="bg-gradient-to-br from-indigo-900/20 to-blue-900/20 rounded-xl p-6 border-2 border-indigo-500/40 animate-in slide-in-from-left duration-500 delay-600">
        <h3 className="text-3xl font-bold text-indigo-400 mb-4 flex items-center gap-3">
          ⛓️ Blockchain Security
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔒</span>
            <div>
              <div className="font-bold text-indigo-300">Smart Contract Secured</div>
              <div className="text-sm text-vintage-ice/80">All battles are verified on-chain</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            <div>
              <div className="font-bold text-blue-300">Instant Settlement</div>
              <div className="text-sm text-vintage-ice/80">Winners receive VBMS immediately</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌊</span>
            <div>
              <div className="font-bold text-cyan-300">Base Network</div>
              <div className="text-sm text-vintage-ice/80">Low fees, fast transactions</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Achievements, Quests, Cards, FAQ sections remain similar but with enhanced styling
// (Keeping them the same for brevity, but you can apply similar enhancements)

function AchievementsDocs({ t }: { t: (key: DocsTranslationKey) => string }) {
  return (
    <div className="space-y-6 text-vintage-ice font-modern">
      <div>
        <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4 flex items-center gap-2">
          <NextImage src="/images/icons/achievement.svg" alt="Achievements" width={32} height={32} />
          {t("achievementsTitle")}
        </h2>
        <p className="mb-4 leading-relaxed">
          {t("achievementsIntro")}
        </p>
        <div className="flex gap-4 mb-4">
          <span className="text-vintage-gold font-bold">{t("totalRewards")}</span>
          <span className="text-vintage-burnt-gold">|</span>
          <span className="text-vintage-gold font-bold">{t("achievementCount")}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rarity Achievements */}
        <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
          <h3 className="text-xl font-bold text-vintage-gold mb-2">{t("rarityAchievements")}</h3>
          <p className="mb-2">{t("rarityDesc")}</p>
          <p className="text-sm text-vintage-burnt-gold">{t("rarityCount")}</p>
        </div>

        {/* Wear Achievements */}
        <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
          <h3 className="text-xl font-bold text-vintage-gold mb-2">{t("wearAchievements")}</h3>
          <p className="mb-2">{t("wearDesc")}</p>
          <p className="text-sm text-vintage-burnt-gold">{t("wearCount")}</p>
        </div>

        {/* Foil Achievements */}
        <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
          <h3 className="text-xl font-bold text-vintage-gold mb-2">{t("foilAchievements")}</h3>
          <p className="mb-2">{t("foilDesc")}</p>
          <p className="text-sm text-vintage-burnt-gold">{t("foilCount")}</p>
        </div>

        {/* Progressive Achievements */}
        <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
          <h3 className="text-xl font-bold text-vintage-gold mb-2">{t("progressiveAchievements")}</h3>
          <p className="mb-2">{t("progressiveDesc")}</p>
        </div>
      </div>
    </div>
  );
}

function QuestsDocs({ t }: { t: (key: DocsTranslationKey) => string }) {
  return (
    <div className="space-y-6 text-vintage-ice font-modern">
      <div>
        <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4 flex items-center gap-2">
          <NextImage src="/images/icons/mission.svg" alt="Quests" width={32} height={32} />
          {t("questsTitle")}
        </h2>
        <p className="mb-4 leading-relaxed">
          {t("questsIntro")}
        </p>
      </div>

      {/* Daily Quests */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-2">{t("dailyQuests")}</h3>
        <p className="text-sm text-vintage-burnt-gold mb-3">{t("dailyQuestsDesc")}</p>
        <ul className="space-y-1">
          <li className="flex items-start gap-2">
            <span className="text-vintage-gold">•</span>
            {t("dailyQuest1")}
          </li>
        </ul>
      </div>

      {/* Weekly Quests */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-2">{t("weeklyQuests")}</h3>
        <p className="text-sm text-vintage-burnt-gold mb-3">{t("weeklyQuestsDesc")}</p>
        <ul className="space-y-1">
          <li className="flex items-start gap-2">
            <span className="text-vintage-gold">1.</span>
            {t("weeklyQuest1")}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-vintage-gold">2.</span>
            {t("weeklyQuest2")}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-vintage-gold">3.</span>
            {t("weeklyQuest3")}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-vintage-gold">4.</span>
            {t("weeklyQuest4")}
          </li>
        </ul>
      </div>

      {/* Weekly Rewards */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-blue-500/20">
        <h3 className="text-xl font-bold text-blue-400 mb-2">{t("weeklyRewards")}</h3>
        <p className="text-sm text-vintage-burnt-gold mb-3">{t("weeklyRewardsDesc")}</p>
        <ul className="space-y-1">
          <li className="flex items-center gap-2">
            <span className="text-2xl">🥇</span>
            {t("weeklyTier1")}
          </li>
          <li className="flex items-center gap-2">
            <span className="text-2xl">🥈</span>
            {t("weeklyTier2")}
          </li>
          <li className="flex items-center gap-2">
            <span className="text-2xl">🥉</span>
            {t("weeklyTier3")}
          </li>
          <li className="flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            {t("weeklyTier4")}
          </li>
        </ul>
      </div>
    </div>
  );
}

function CardsDocs({ t }: { t: (key: DocsTranslationKey) => string }) {
  return (
    <div className="space-y-6 text-vintage-ice font-modern">
      <div>
        <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4 flex items-center gap-2">
          <NextImage src="/images/icons/cards.svg" alt="Cards" width={32} height={32} />
          {t("cardsTitle")}
        </h2>
        <p className="mb-4 leading-relaxed">
          {t("cardsIntro")}
        </p>
      </div>

      {/* Card Attributes */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-3">{t("cardAttributes")}</h3>
        <div className="space-y-3">
          <div>
            <p className="font-bold text-vintage-gold">{t("cardRarity")}:</p>
            <p className="text-sm">{t("cardRarityDesc")}</p>
          </div>
          <div>
            <p className="font-bold text-vintage-gold">{t("cardWear")}:</p>
            <p className="text-sm">{t("cardWearDesc")}</p>
          </div>
          <div>
            <p className="font-bold text-vintage-gold">{t("cardFoil")}:</p>
            <p className="text-sm">{t("cardFoilDesc")}</p>
          </div>
        </div>
      </div>

      {/* Power Calculation */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-2">{t("powerCalculation")}</h3>
        <p className="font-mono text-sm mb-2 text-vintage-gold">{t("powerFormula")}</p>
        <p className="text-sm text-vintage-burnt-gold">{t("powerExample")}</p>
      </div>

      {/* Defense Deck */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-2">{t("defenseDeck")}</h3>
        <p>{t("defenseDeckDesc")}</p>
      </div>
    </div>
  );
}

function FAQDocs({ t }: { t: (key: DocsTranslationKey) => string }) {
  return (
    <div className="space-y-6 text-vintage-ice font-modern">
      <div>
        <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4 flex items-center gap-2">
          <NextImage src="/images/icons/help.svg" alt="FAQ" width={32} height={32} />
          {t("faqTitle")}
        </h2>
      </div>

      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
          <div key={num} className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
            <h3 className="text-lg font-bold text-vintage-gold mb-2">
              {t(`faq${num}Q` as DocsTranslationKey)}
            </h3>
            <p className="text-vintage-ice">
              {t(`faq${num}A` as DocsTranslationKey)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
