"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { docsTranslations, type DocsSupportedLanguage, type DocsTranslationKey } from "@/lib/docs-translations";

type DocSection = "economy" | "battles" | "poker" | "mecha" | "raidboss" | "vibefid" | "achievements" | "quests" | "cards" | "faq";

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
    <div className="fixed top-20 sm:top-24 right-2 sm:right-4 z-50">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-vintage-gold text-vintage-black font-bold rounded border-2 border-vintage-gold hover:bg-vintage-burnt-gold transition text-sm sm:text-base"
        >
          {currentLang.label} ▼
        </button>

        {isOpen && (
          <div className="absolute top-full mt-2 right-0 bg-vintage-charcoal border-2 border-vintage-gold rounded shadow-lg overflow-hidden min-w-[120px] sm:min-w-[150px]">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => {
                  setLang(language.code as DocsSupportedLanguage);
                  setIsOpen(false);
                }}
                className={`w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left hover:bg-vintage-gold/20 transition text-sm sm:text-base ${
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
    <div className="mt-8 sm:mt-12 md:mt-16 pt-6 sm:pt-8 border-t-2 border-vintage-gold/30">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-vintage-gold mb-4 sm:mb-6 text-center">
        FOLLOW US
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto">
        {/* Twitter/X */}
        <a
          href="https://x.com/Lowprofile_eth"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-vintage-black/50 border-2 border-vintage-gold/30 rounded hover:border-vintage-gold transition"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-vintage-gold" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span className="text-vintage-ice font-bold text-sm sm:text-base">Twitter/X</span>
        </a>

        {/* Farcaster */}
        <a
          href="https://farcaster.xyz/~/channel/vibe-most-wanted"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-vintage-black/50 border-2 border-vintage-gold/30 rounded hover:border-vintage-gold transition"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-vintage-gold" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
          </svg>
          <span className="text-vintage-ice font-bold text-sm sm:text-base">Farcaster</span>
        </a>

        {/* GitHub */}
        <a
          href="https://github.com/JVHBO"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-vintage-black/50 border-2 border-vintage-gold/30 rounded hover:border-vintage-gold transition"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-vintage-gold" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <span className="text-vintage-ice font-bold text-sm sm:text-base">GitHub</span>
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
    { id: "mecha" as DocSection, label: "🤖 Mecha Arena" },
    { id: "raidboss" as DocSection, label: "👹 Raid Boss" },
    { id: "vibefid" as DocSection, label: "🆔 VibeFID" },
    { id: "achievements" as DocSection, label: t("achievements") },
    { id: "quests" as DocSection, label: t("quests") },
    { id: "cards" as DocSection, label: t("cards") },
    { id: "faq" as DocSection, label: t("faq") },
  ];

  return (
    <div className="min-h-screen bg-vintage-black text-vintage-ice p-2 sm:p-4">
      <div className="max-w-5xl mx-auto">
        <LanguageSelector />

        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-vintage-gold hover:text-vintage-orange transition mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <span>←</span>
          <span className="font-bold">{t("backToGame")}</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-vintage-gold mb-2">
            {t("documentation")}
          </h1>
          <p className="text-sm sm:text-base text-vintage-burnt-gold px-2">{t("subtitle")}</p>
        </div>

        {/* Section Navigation */}
        <div className="flex flex-wrap gap-2 justify-center mb-6 sm:mb-8">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded text-sm sm:text-base font-bold transition border-2 ${
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
        <div className="bg-vintage-charcoal border-2 border-vintage-gold/30 rounded p-3 sm:p-4 md:p-6">
          {/* Economy */}
          {activeSection === "economy" && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-vintage-gold mb-3 sm:mb-4">{t("economyTitle")}</h2>
              <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-vintage-ice">
                <p>{t("economyIntro")}</p>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">{t("howToEarnCoins")}</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>{t("earnPve")}:</strong> {t("earnPveDesc")}</li>
                  <li><strong>{t("earnPvp")}:</strong> {t("earnPvpDesc")}</li>
                  <li><strong>{t("earnAttack")}:</strong> {t("earnAttackDesc")}</li>
                  <li><strong>{t("earnAchievements")}:</strong> {t("earnAchievementsDesc")}</li>
                  <li><strong>{t("earnQuests")}:</strong> {t("earnQuestsDesc")}</li>
                </ul>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">{t("dailyLimit")}</h3>
                <p>{t("dailyLimitDesc")}</p>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">{t("entryFees")}</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>{t("entryFeeAttack")}</li>
                  <li>{t("entryFeePvp")}</li>
                  <li>{t("entryFeePve")}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Battles */}
          {activeSection === "battles" && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-vintage-gold mb-3 sm:mb-4">{t("battlesTitle")}</h2>
              <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-vintage-ice">
                <p>{t("battlesIntro")}</p>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">{t("pveMode")}</h3>
                <p>{t("pveModeDesc")}</p>

                <h4 className="text-base sm:text-lg font-bold text-vintage-gold mt-3 sm:mt-4">{t("pveDifficulties")}</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>{t("pveGey")}</li>
                  <li>{t("pveTop")}</li>
                  <li>{t("pveG")}</li>
                  <li>{t("pveMid")}</li>
                  <li>{t("pveGigachad")}</li>
                </ul>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">{t("pvpMode")}</h3>
                <p>{t("pvpModeDesc")}</p>

                <h4 className="text-base sm:text-lg font-bold text-vintage-gold mt-3 sm:mt-4">{t("pvpRewards")}</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>{t("pvpWin")}</li>
                  <li>{t("pvpLoss")}</li>
                  <li>{t("pvpTie")}</li>
                </ul>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">{t("attackMode")}</h3>
                <p>{t("attackModeDesc")}</p>

                <h4 className="text-base sm:text-lg font-bold text-vintage-gold mt-3 sm:mt-4">{t("attackHow")}</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>{t("attackStep1")}</li>
                  <li>{t("attackStep2")}</li>
                  <li>{t("attackStep3")}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Poker */}
          {activeSection === "poker" && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-vintage-gold mb-3 sm:mb-4">Poker Battle</h2>
              <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-vintage-ice">
                <p>Play poker against CPU or other players using VBMS stakes.</p>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">Stakes</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>10 VBMS</li>
                  <li>50 VBMS</li>
                  <li>200 VBMS</li>
                  <li>2000 VBMS</li>
                </ul>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">Rules</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>Best of 5 rounds - First to win 4 rounds wins the match</li>
                  <li>Winner takes 95% of pot (5% house fee)</li>
                  <li>Blockchain secured (VBMS contract on Base)</li>
                  <li>PvP matches are live - both players play simultaneously</li>
                </ul>
              </div>
            </div>
          )}


          {/* Mecha Arena */}
          {activeSection === "mecha" && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-vintage-gold mb-3 sm:mb-4">🤖 Mecha Arena</h2>
              <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-vintage-ice">
                <p>Watch CPU vs CPU battles and bet on the outcome! Spectate epic card battles between AI opponents.</p>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">How It Works</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>Choose from 13 different arena collections</li>
                  <li>Two CPUs battle automatically using cards from that collection</li>
                  <li>Deposit VBMS to get betting credits</li>
                  <li>Bet on each round (1-7) with growing odds</li>
                  <li>Instant payouts when rounds resolve</li>
                </ul>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">Betting Odds</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Rounds 1-3:</strong> 1.5x odds</li>
                  <li><strong>Rounds 4-5:</strong> 1.8x odds</li>
                  <li><strong>Rounds 6-7:</strong> 2.0x odds</li>
                  <li><strong>Tie Bet:</strong> 3.5x odds</li>
                </ul>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">🔥 Daily Boost</h3>
                <p>Every day, one arena collection gets <strong className="text-orange-400">+0.5x bonus odds</strong>! Look for the HOT badge.</p>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">Collections</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  <span className="bg-vintage-black/50 px-2 py-1 rounded text-sm">🌅 GM VBRS</span>
                  <span className="bg-vintage-black/50 px-2 py-1 rounded text-sm">🎭 Vibe Most Wanted</span>
                  <span className="bg-vintage-black/50 px-2 py-1 rounded text-sm">💋 Coquettish</span>
                  <span className="bg-vintage-black/50 px-2 py-1 rounded text-sm">🍥 Viberuto</span>
                  <span className="bg-vintage-black/50 px-2 py-1 rounded text-sm">🐱 Meowverse</span>
                  <span className="bg-vintage-black/50 px-2 py-1 rounded text-sm">🐸 Poorly Drawn Pepes</span>
                  <span className="bg-vintage-black/50 px-2 py-1 rounded text-sm">🌿 Team Pothead</span>
                  <span className="bg-vintage-black/50 px-2 py-1 rounded text-sm">🔮 Tarot</span>
                  <span className="bg-vintage-black/50 px-2 py-1 rounded text-sm">🏈 American Football</span>
                  <span className="bg-vintage-black/50 px-2 py-1 rounded text-sm">🆔 VibeFID</span>
                  <span className="bg-vintage-black/50 px-2 py-1 rounded text-sm">⚾ Baseball Cabal</span>
                  <span className="bg-vintage-black/50 px-2 py-1 rounded text-sm">✨ Vibe FX</span>
                  <span className="bg-vintage-black/50 px-2 py-1 rounded text-sm">💻 History of Computer</span>
                </div>
              </div>
            </div>
          )}

          {/* Raid Boss */}
          {activeSection === "raidboss" && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-vintage-gold mb-3 sm:mb-4">👹 Raid Boss</h2>
              <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-vintage-ice">
                <p>Team up with other players to defeat powerful bosses and earn exclusive rewards!</p>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">How It Works</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>Bosses appear on a rotating schedule</li>
                  <li>Select cards from your collection to attack</li>
                  <li>Deal damage based on your card power</li>
                  <li>Contribute to the community effort</li>
                  <li>Earn rewards based on damage contribution</li>
                </ul>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">Rewards</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>TESTVBMS coins based on damage dealt</li>
                  <li>Bonus rewards for top contributors</li>
                  <li>Special achievements for boss defeats</li>
                </ul>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">Tips</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>Use high-power cards for maximum damage</li>
                  <li>Cards from the boss collection deal extra damage</li>
                  <li>Coordinate with other players for faster kills</li>
                </ul>
              </div>
            </div>
          )}

          {/* VibeFID */}
          {activeSection === "vibefid" && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-vintage-gold mb-3 sm:mb-4">🆔 VibeFID</h2>
              <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-vintage-ice">
                <p>Generate unique trading cards based on your Farcaster ID! Your FID determines your card traits.</p>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">How It Works</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>Connect with Farcaster to mint your VibeFID card</li>
                  <li>Your Neynar score determines the card rarity</li>
                  <li>Your FID number determines foil and wear traits</li>
                  <li>Lower FID = Better chances for rare traits</li>
                </ul>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">Neynar Score → Rarity</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong className="text-purple-400">Mythic</strong> (≥ 0.99): 800 base power</li>
                  <li><strong className="text-orange-400">Legendary</strong> (≥ 0.90): 240 base power</li>
                  <li><strong className="text-pink-400">Epic</strong> (≥ 0.79): 80 base power</li>
                  <li><strong className="text-blue-400">Rare</strong> (≥ 0.70): 20 base power</li>
                  <li><strong className="text-gray-400">Common</strong> (&lt; 0.70): 5 base power</li>
                </ul>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">FID → Traits</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong className="text-yellow-400">≤ 5,000 (OG)</strong>: 100% Prize Foil + 100% Pristine</li>
                  <li><strong>5,001 - 20,000</strong>: 80% Prize Foil, 90% Pristine</li>
                  <li><strong>20,001 - 100,000</strong>: Mixed chances</li>
                  <li><strong>&gt; 100,000</strong>: Lower chances for rare traits</li>
                </ul>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">VibeFID Benefits</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>⚡ <strong>Power Boost:</strong> +10% power to all your cards</li>
                  <li>♾️ <strong>Infinite Energy:</strong> No energy limit for battles</li>
                  <li>🃏 <strong>No Deck Restriction:</strong> Use any cards in your deck</li>
                </ul>
              </div>
            </div>
          )}

          {/* Achievements */}
          {activeSection === "achievements" && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-vintage-gold mb-3 sm:mb-4">{t("achievementsTitle")}</h2>
              <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-vintage-ice">
                <p>{t("achievementsIntro")}</p>
                <p className="text-vintage-burnt-gold"><strong>{t("totalRewards")}</strong></p>
                <p className="text-vintage-burnt-gold"><strong>{t("achievementCount")}</strong></p>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">{t("rarityAchievements")}</h3>
                <p>{t("rarityDesc")}</p>
                <p className="text-vintage-burnt-gold">{t("rarityCount")}</p>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">{t("wearAchievements")}</h3>
                <p>{t("wearDesc")}</p>
                <p className="text-vintage-burnt-gold">{t("wearCount")}</p>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">{t("foilAchievements")}</h3>
                <p>{t("foilDesc")}</p>
                <p className="text-vintage-burnt-gold">{t("foilCount")}</p>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">{t("progressiveAchievements")}</h3>
                <p>{t("progressiveDesc")}</p>
              </div>
            </div>
          )}

          {/* Quests */}
          {activeSection === "quests" && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-vintage-gold mb-3 sm:mb-4">{t("questsTitle")}</h2>
              <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-vintage-ice">
                <p>{t("questsIntro")}</p>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">{t("dailyQuests")}</h3>
                <p>{t("dailyQuestsDesc")}</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>{t("dailyQuest1")}</li>
                </ul>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">{t("weeklyQuests")}</h3>
                <p>{t("weeklyQuestsDesc")}</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>{t("weeklyQuest1")}</li>
                  <li>{t("weeklyQuest2")}</li>
                  <li>{t("weeklyQuest3")}</li>
                  <li>{t("weeklyQuest4")}</li>
                </ul>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">{t("weeklyRewards")}</h3>
                <p>{t("weeklyRewardsDesc")}</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>{t("weeklyTier1")}</li>
                  <li>{t("weeklyTier2")}</li>
                  <li>{t("weeklyTier3")}</li>
                  <li>{t("weeklyTier4")}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Cards */}
          {activeSection === "cards" && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-vintage-gold mb-3 sm:mb-4">{t("cardsTitle")}</h2>
              <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-vintage-ice">
                <p>{t("cardsIntro")}</p>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">{t("cardAttributes")}</h3>

                <div>
                  <h4 className="text-base sm:text-lg font-bold text-vintage-gold mt-3 sm:mt-4">{t("cardRarity")}</h4>
                  <p>{t("cardRarityDesc")}</p>
                </div>

                <div>
                  <h4 className="text-base sm:text-lg font-bold text-vintage-gold mt-3 sm:mt-4">{t("cardWear")}</h4>
                  <p>{t("cardWearDesc")}</p>
                </div>

                <div>
                  <h4 className="text-base sm:text-lg font-bold text-vintage-gold mt-3 sm:mt-4">{t("cardFoil")}</h4>
                  <p>{t("cardFoilDesc")}</p>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">{t("powerCalculation")}</h3>
                <p className="font-mono bg-vintage-black/50 p-2 sm:p-3 rounded text-xs sm:text-sm">{t("powerFormula")}</p>
                <p className="text-vintage-burnt-gold">{t("powerExample")}</p>

                <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mt-4 sm:mt-6">{t("defenseDeck")}</h3>
                <p>{t("defenseDeckDesc")}</p>
              </div>
            </div>
          )}

          {/* FAQ */}
          {activeSection === "faq" && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-vintage-gold mb-3 sm:mb-4">{t("faqTitle")}</h2>
              <div className="space-y-4 sm:space-y-6 text-sm sm:text-base text-vintage-ice">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-vintage-gold mb-1.5 sm:mb-2">{t("faq1Q")}</h3>
                  <p>{t("faq1A")}</p>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-vintage-gold mb-1.5 sm:mb-2">{t("faq2Q")}</h3>
                  <p>{t("faq2A")}</p>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-vintage-gold mb-1.5 sm:mb-2">{t("faq3Q")}</h3>
                  <p>{t("faq3A")}</p>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-vintage-gold mb-1.5 sm:mb-2">{t("faq4Q")}</h3>
                  <p>{t("faq4A")}</p>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-vintage-gold mb-1.5 sm:mb-2">{t("faq5Q")}</h3>
                  <p>{t("faq5A")}</p>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-vintage-gold mb-1.5 sm:mb-2">{t("faq6Q")}</h3>
                  <p>{t("faq6A")}</p>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-vintage-gold mb-1.5 sm:mb-2">{t("faq7Q")}</h3>
                  <p>{t("faq7A")}</p>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-vintage-gold mb-1.5 sm:mb-2">{t("faq8Q")}</h3>
                  <p>{t("faq8A")}</p>
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
