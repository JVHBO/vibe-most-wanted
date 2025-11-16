"use client";

import { useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { docsTranslations, type DocsSupportedLanguage, type DocsTranslationKey } from "@/lib/docs-translations";

type DocSection = "economy" | "vbms" | "battles" | "poker" | "achievements" | "quests" | "cards" | "faq";

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
    { id: "vbms" as DocSection, label: "VBMS Tokens", icon: "/images/icons/coins.svg" },
    { id: "battles" as DocSection, label: t("battles"), icon: "/images/icons/battle.svg" },
    { id: "poker" as DocSection, label: "Poker Battle", icon: "/images/icons/cards.svg" },
    { id: "achievements" as DocSection, label: t("achievements"), icon: "/images/icons/achievement.svg" },
    { id: "quests" as DocSection, label: t("quests"), icon: "/images/icons/mission.svg" },
    { id: "cards" as DocSection, label: t("cards"), icon: "/images/icons/cards.svg" },
    { id: "faq" as DocSection, label: t("faq"), icon: "/images/icons/help.svg" },
  ];

  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-ice p-4">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-vintage-gold hover:text-vintage-orange transition mb-6 font-modern"
        >
          <span className="text-xl">←</span>
          <span>{t("backToGame")}</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-vintage-gold mb-2 flex items-center justify-center gap-3">
            <NextImage src="/images/icons/help.svg" alt="Docs" width={48} height={48} />
            {t("documentation")}
          </h1>
          <p className="text-vintage-burnt-gold font-modern">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-vintage-charcoal/80 backdrop-blur-lg border-2 border-vintage-gold/30 rounded-xl p-4 sticky top-4 shadow-gold">
              <h3 className="text-vintage-gold font-display font-bold mb-4 flex items-center gap-2">
                <NextImage src="/images/icons/stats.svg" alt="Menu" width={20} height={20} />
                {t("sections")}
              </h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-all font-modern flex items-center gap-2 ${
                      activeSection === section.id
                        ? "bg-gradient-to-r from-vintage-gold to-vintage-gold-dark text-vintage-black font-bold shadow-gold"
                        : "text-vintage-gold/70 hover:bg-vintage-gold/10 border border-vintage-gold/20"
                    }`}
                  >
                    <NextImage src={section.icon} alt={section.label} width={20} height={20} />
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-vintage-charcoal/80 backdrop-blur-lg border-2 border-vintage-gold/30 rounded-xl p-6 shadow-gold">
              {activeSection === "economy" && <EconomyDocs t={t} />}
              {activeSection === "vbms" && <VBMSDocs />}
              {activeSection === "battles" && <BattlesDocs t={t} getCoinsWord={getCoinsWord} />}
              {activeSection === "poker" && <PokerBattleDocs />}
              {activeSection === "achievements" && <AchievementsDocs t={t} />}
              {activeSection === "quests" && <QuestsDocs t={t} />}
              {activeSection === "cards" && <CardsDocs t={t} />}
              {activeSection === "faq" && <FAQDocs t={t} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Economy Section
function EconomyDocs({ t }: { t: (key: DocsTranslationKey) => string }) {
  return (
    <div className="space-y-6 text-vintage-ice font-modern">
      <div>
        <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4 flex items-center gap-2">
          <NextImage src="/images/icons/coins.svg" alt="Economy" width={32} height={32} />
          {t("economyTitle")}
        </h2>
        <p className="mb-4 leading-relaxed">
          {t("economyIntro")}
        </p>
      </div>

      {/* How to Earn Coins */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-3 flex items-center gap-2">
          <NextImage src="/images/icons/mission.svg" alt="Earn" width={24} height={24} />
          {t("howToEarnCoins")}
        </h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-vintage-gold">•</span>
            <div>
              <strong className="text-vintage-gold">{t("earnPve")}:</strong> {t("earnPveDesc")}
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-vintage-gold">•</span>
            <div>
              <strong className="text-vintage-gold">{t("earnPvp")}:</strong> {t("earnPvpDesc")}
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-vintage-gold">•</span>
            <div>
              <strong className="text-vintage-gold">{t("earnAttack")}:</strong> {t("earnAttackDesc")}
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-vintage-gold">•</span>
            <div>
              <strong className="text-vintage-gold">{t("earnAchievements")}:</strong> {t("earnAchievementsDesc")}
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-vintage-gold">•</span>
            <div>
              <strong className="text-vintage-gold">{t("earnQuests")}:</strong> {t("earnQuestsDesc")}
            </div>
          </li>
        </ul>
      </div>

      {/* Daily Limit */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-2">{t("dailyLimit")}</h3>
        <p>{t("dailyLimitDesc")}</p>
      </div>

      {/* Entry Fees */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-3">{t("entryFees")}</h3>
        <ul className="space-y-1">
          <li className="flex items-center gap-2">
            <span className="text-vintage-gold">•</span>
            {t("entryFeeAttack")}
          </li>
          <li className="flex items-center gap-2">
            <span className="text-vintage-gold">•</span>
            {t("entryFeePvp")}
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            {t("entryFeePve")}
          </li>
        </ul>
      </div>
    </div>
  );
}

// Battles Section
function BattlesDocs({ t, getCoinsWord }: { t: (key: DocsTranslationKey) => string; getCoinsWord: () => string }) {
  return (
    <div className="space-y-6 text-vintage-ice font-modern">
      <div>
        <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4 flex items-center gap-2">
          <NextImage src="/images/icons/battle.svg" alt="Battles" width={32} height={32} />
          {t("battlesTitle")}
        </h2>
        <p className="mb-4 leading-relaxed">
          {t("battlesIntro")}
        </p>
      </div>

      {/* PvE Mode */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-2">{t("pveMode")}</h3>
        <p className="mb-3">{t("pveModeDesc")}</p>
        <div className="pl-4">
          <p className="font-bold text-vintage-gold mb-2">{t("pveDifficulties")}:</p>
          <ul className="space-y-1">
            <li>• {t("pveGey")}: +5 {getCoinsWord()}</li>
            <li>• {t("pveTop")}: +10 {getCoinsWord()}</li>
            <li>• {t("pveG")}: +15 {getCoinsWord()}</li>
            <li>• {t("pveMid")}: +20 {getCoinsWord()}</li>
            <li>• {t("pveGigachad")}: +120 {getCoinsWord()}</li>
          </ul>
        </div>
      </div>

      {/* PvP Mode */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-2">{t("pvpMode")}</h3>
        <p className="mb-3">{t("pvpModeDesc")}</p>
        <div className="pl-4">
          <p className="font-bold text-vintage-gold mb-2">{t("pvpRewards")}:</p>
          <ul className="space-y-1">
            <li className="text-green-400">• {t("pvpWin")}</li>
            <li className="text-red-400">• {t("pvpLoss")}</li>
            <li className="text-gray-400">• {t("pvpTie")}</li>
          </ul>
        </div>
      </div>

      {/* Attack Mode */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-2">{t("attackMode")}</h3>
        <p className="mb-3">{t("attackModeDesc")}</p>
        <div className="pl-4">
          <p className="font-bold text-vintage-gold mb-2">{t("attackHow")}:</p>
          <ol className="space-y-1">
            <li>1. {t("attackStep1")}</li>
            <li>2. {t("attackStep2")}</li>
            <li>3. {t("attackStep3")}</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// Achievements Section
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

// Quests Section
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

// Cards Section
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

// Poker Battle Section
function PokerBattleDocs() {
  return (
    <div className="space-y-6 text-vintage-ice font-modern">
      <div>
        <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4 flex items-center gap-2">
          <NextImage src="/images/icons/cards.svg" alt="Poker Battle" width={32} height={32} />
          🎴 Poker Battle
        </h2>
        <p className="mb-4 leading-relaxed">
          A strategic card battle mode where you face opponents in intense poker-style rounds. Build your deck, select cards wisely, and use powerful boosts to dominate!
        </p>
      </div>

      {/* How to Play */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-3">🎯 How to Play</h3>
        <ol className="space-y-2">
          <li><strong className="text-vintage-gold">1. Build Your Deck:</strong> Select 10 cards from your collection</li>
          <li><strong className="text-vintage-gold">2. Each Round:</strong> Pick 1 card from your hand to play</li>
          <li><strong className="text-vintage-gold">3. Use Boosts:</strong> Enhance your cards with special abilities</li>
          <li><strong className="text-vintage-gold">4. Win Rounds:</strong> Higher power wins the round and the pot</li>
          <li><strong className="text-vintage-gold">5. Best of 10:</strong> Win more rounds than your opponent to victory!</li>
        </ol>
      </div>

      {/* Game Modes */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-3">🎮 Game Modes</h3>
        <div className="space-y-3">
          <div>
            <p className="font-bold text-blue-400">⚔️ PvE - vs CPU</p>
            <p className="text-sm">Practice against AI opponents with 5 difficulty levels. No entry fee!</p>
          </div>
          <div>
            <p className="font-bold text-purple-400">👥 PvP - Multiplayer</p>
            <p className="text-sm">Challenge real players! Create or join rooms with customizable stakes.</p>
          </div>
        </div>
      </div>

      {/* Boosts */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-3">💥 Boosts & Actions</h3>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-2xl">⚔️</span>
            <div>
              <strong className="text-yellow-400">BOOST:</strong> +30% power to your card (Cost: 2x ante)
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-2xl">🛡️</span>
            <div>
              <strong className="text-blue-400">SHIELD:</strong> Block opponent's boost (Cost: 2x ante)
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-2xl">💥</span>
            <div>
              <strong className="text-red-400">CRITICAL:</strong> x2 card power! (Cost: 4x ante)
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-2xl">✋</span>
            <div>
              <strong className="text-gray-400">PASS:</strong> Play without boost (Free - Save your coins!)
            </div>
          </div>
        </div>
      </div>

      {/* Stakes & Rewards */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-3">💰 Stakes & Rewards</h3>
        <div className="space-y-2">
          <p><strong className="text-vintage-gold">Ante Options:</strong> 2, 10, 50, or 200 coins</p>
          <p><strong className="text-vintage-gold">How It Works:</strong> Each player pays the ante once at the start</p>
          <p><strong className="text-vintage-gold">The Pot:</strong> Ante × 2 (both players contribute)</p>
          <p><strong className="text-vintage-gold">Winner Takes:</strong> 95% of the pot (5% house fee)</p>
          <p><strong className="text-vintage-gold">Game Format:</strong> Best of 5 rounds - first to win 3 rounds takes the pot!</p>
          <p className="text-sm text-vintage-burnt-gold mt-3">💡 Example: 10 coin ante → 20 coin pot → winner gets 19 coins!</p>
        </div>
      </div>

      {/* Token Types */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-3">🪙 Token Types</h3>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <span className="text-vintage-gold">💎</span>
            <strong>TESTVBMS:</strong> Main game currency (default)
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">💵</span>
            <strong>testUSDC:</strong> Stable coin betting
          </li>
          <li className="flex items-center gap-2">
            <span className="text-purple-400">🎴</span>
            <strong>VIBE_NFT:</strong> Wager your NFT cards! (For fun only)
          </li>
        </ul>
      </div>

      {/* Tips */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4 border border-blue-500/30">
        <h3 className="text-xl font-bold text-blue-300 mb-3">💡 Pro Tips</h3>
        <ul className="space-y-1 text-sm">
          <li>• Save your strongest cards for crucial rounds</li>
          <li>• Use SHIELD to counter opponent's BOOST attempts</li>
          <li>• CRITICAL is expensive but can turn the game around!</li>
          <li>• Watch your bankroll - don't run out of coins</li>
          <li>• Winning 6+ rounds guarantees victory in best-of-10</li>
        </ul>
      </div>
    </div>
  );
}

// VBMS Tokens Section
function VBMSDocs() {
  return (
    <div className="space-y-6 text-vintage-ice font-modern">
      <div>
        <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4 flex items-center gap-2">
          <NextImage src="/images/icons/coins.svg" alt="VBMS" width={32} height={32} />
          💎 VBMS Tokens
        </h2>
        <p className="mb-4 leading-relaxed">
          Learn about the two token types in Vibe Most Wanted: TESTVBMS (in-game currency) and VBMS (real blockchain tokens).
        </p>
      </div>

      {/* Token Types */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-3">🪙 Two Token Types</h3>
        <div className="space-y-3">
          <div>
            <p className="font-bold text-blue-400">💎 TESTVBMS (Virtual Currency)</p>
            <ul className="text-sm space-y-1 mt-2 ml-4">
              <li>• Used for in-game purchases and battles</li>
              <li>• Earned by playing games, completing quests, achievements</li>
              <li>• Stored in your profile (not on blockchain)</li>
              <li>• Can be converted to real VBMS tokens</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-green-400">🔗 VBMS (Blockchain Tokens)</p>
            <ul className="text-sm space-y-1 mt-2 ml-4">
              <li>• Real ERC20 tokens on Base blockchain</li>
              <li>• Claim to your wallet address</li>
              <li>• Can be traded, sold, or held</li>
              <li>• Contract: 0xb03439567cd22f278b21e1ffcdfb8e1696763827</li>
            </ul>
          </div>
        </div>
      </div>

      {/* The Inbox System */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-3">📬 The Inbox System</h3>
        <p className="mb-3">When you earn VBMS rewards, they go to your inbox first. This allows you to:</p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-vintage-gold">1.</span>
            <div>
              <strong className="text-vintage-gold">Accumulate Rewards:</strong> Save gas fees by claiming larger amounts
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-vintage-gold">2.</span>
            <div>
              <strong className="text-vintage-gold">Earn Bonuses:</strong> Get bonus VBMS for larger claims and waiting periods
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-vintage-gold">3.</span>
            <div>
              <strong className="text-vintage-gold">Choose When to Claim:</strong> Claim immediately or save for later
            </div>
          </li>
        </ul>
      </div>

      {/* How to Claim */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-3">💰 How to Claim VBMS</h3>
        <div className="space-y-3">
          <div>
            <p className="font-bold text-blue-400">Method 1: Claim from Inbox</p>
            <ol className="text-sm space-y-1 mt-2 ml-4">
              <li>1. Accumulate VBMS in your inbox (earn from games)</li>
              <li>2. Click the inbox icon to see your balance</li>
              <li>3. Click "Collect VBMS" when you have 100+ VBMS</li>
              <li>4. Sign the transaction with your wallet</li>
              <li>5. VBMS tokens sent directly to your wallet!</li>
            </ol>
          </div>
          <div>
            <p className="font-bold text-purple-400">Method 2: Convert TESTVBMS</p>
            <ol className="text-sm space-y-1 mt-2 ml-4">
              <li>1. Earn TESTVBMS by playing games</li>
              <li>2. Open your coins balance modal</li>
              <li>3. Click "Convert to VBMS" when you have 100+ TESTVBMS</li>
              <li>4. Sign the transaction</li>
              <li>5. Your TESTVBMS converts to real VBMS tokens!</li>
            </ol>
          </div>
        </div>
        <p className="text-sm text-vintage-burnt-gold mt-3">
          💡 Minimum claim amount: 100 VBMS
        </p>
      </div>

      {/* Bonus System */}
      <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg p-4 border border-yellow-500/30">
        <h3 className="text-xl font-bold text-yellow-400 mb-3">🎁 Claim Bonuses</h3>
        <p className="mb-3">Earn extra VBMS when you claim by meeting these conditions:</p>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-2xl">💰</span>
            <div>
              <strong className="text-yellow-400">Large Claim Bonus (+1%):</strong> Claim 1,000+ VBMS at once
              <p className="text-sm text-vintage-burnt-gold">Example: Claim 1,000 → Get 1,010 VBMS (+10 bonus)</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-2xl">📅</span>
            <div>
              <strong className="text-yellow-400">Weekly Bonus (+5%):</strong> Wait 7+ days since last claim
              <p className="text-sm text-vintage-burnt-gold">Example: Claim 500 after 7 days → Get 525 VBMS (+25 bonus)</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-2xl">☀️</span>
            <div>
              <strong className="text-yellow-400">Daily First Claim (+50):</strong> First claim of the day
              <p className="text-sm text-vintage-burnt-gold">Example: First claim today → Get +50 VBMS bonus</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-yellow-300 mt-4 italic">
          🌟 Bonuses stack! Wait 7 days and claim 1,000+ for maximum rewards!
        </p>
      </div>

      {/* Daily Limits */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-red-500/20">
        <h3 className="text-xl font-bold text-red-400 mb-3">⚠️ Claim Limits</h3>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <span className="text-red-400">•</span>
            <strong>Minimum Claim:</strong> 100 VBMS per transaction
          </li>
          <li className="flex items-center gap-2">
            <span className="text-red-400">•</span>
            <strong>Maximum Claim:</strong> 100,000 VBMS per transaction
          </li>
          <li className="flex items-center gap-2">
            <span className="text-red-400">•</span>
            <strong>Daily Limit:</strong> 500,000 VBMS per 24 hours
          </li>
        </ul>
        <p className="text-sm text-vintage-burnt-gold mt-3">
          💡 Limits reset every 24 hours from your last claim
        </p>
      </div>

      {/* Security */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4 border border-blue-500/30">
        <h3 className="text-xl font-bold text-blue-300 mb-3">🛡️ Security & Verification</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-blue-400">✓</span>
            <div>
              <strong>Backend Signature:</strong> Every claim is signed by our secure backend
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400">✓</span>
            <div>
              <strong>Nonce Protection:</strong> Each claim uses a unique nonce (prevents replay attacks)
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400">✓</span>
            <div>
              <strong>Smart Contract Verification:</strong> VBMSPoolTroll contract validates all claims on-chain
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400">✓</span>
            <div>
              <strong>Blacklist Protection:</strong> Suspicious addresses are blocked automatically
            </div>
          </li>
        </ul>
      </div>

      {/* Tips */}
      <div className="bg-vintage-black/30 rounded-lg p-4 border border-vintage-gold/20">
        <h3 className="text-xl font-bold text-vintage-gold mb-3">💡 Pro Tips</h3>
        <ul className="space-y-1 text-sm">
          <li>• Wait to accumulate 1,000+ VBMS for the 1% bonus</li>
          <li>• Claim once a week to get the 5% weekly bonus</li>
          <li>• Make your first claim of the day to get +50 VBMS</li>
          <li>• Convert TESTVBMS when you have 100+ for easy claiming</li>
          <li>• Check your inbox regularly to track rewards</li>
          <li>• Gas fees are paid by you, so claim larger amounts to save on fees</li>
        </ul>
      </div>
    </div>
  );
}

// FAQ Section
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
