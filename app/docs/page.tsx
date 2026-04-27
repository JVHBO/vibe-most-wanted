"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { docsTranslations, type DocsSupportedLanguage, type DocsTranslationKey } from "@/lib/docs-translations";
import { AudioManager } from "@/lib/audio-manager";

type DocSection = "economy" | "battles" | "poker" | "mecha" | "raidboss" | "vibefid" | "quests" | "cards" | "faq" | "baccarat" | "aura" | "socialquests" | "vibemail";

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'pt-BR', label: 'PT' },
  { code: 'es', label: 'ES' },
  { code: 'zh-CN', label: '中文' },
  { code: 'ru', label: 'RU' },
  { code: 'hi', label: 'HI' },
  { code: 'id', label: 'ID' },
  { code: 'fr', label: 'FR' },
  { code: 'ja', label: 'JP' },
  { code: 'it', label: 'IT' },
];

export default function DocsPage() {
  const { lang, setLang } = useLanguage();
  const [activeSection, setActiveSection] = useState<DocSection>("economy");
  const [langOpen, setLangOpen] = useState(false);

  const t = (key: DocsTranslationKey): string => {
    return (docsTranslations as any)[lang as DocsSupportedLanguage]?.[key] || (docsTranslations as any)['en'][key] || key;
  };

  const sections: { id: DocSection; label: string }[] = [
    { id: "economy", label: t("economy") },
    { id: "battles", label: t("battles") },
    { id: "poker", label: t("pokerBattle") },
    { id: "mecha", label: t("mechaArena") },
    { id: "raidboss", label: t("raidBoss") },
    { id: "vibefid", label: t("vibeFID") },
    { id: "quests", label: t("quests") },
    { id: "cards", label: t("cards") },
    { id: "baccarat", label: "Baccarat" },
    { id: "faq", label: t("faq") },
    { id: "aura", label: t("aura") },
    { id: "socialquests", label: t("socialquests") },
    { id: "vibemail", label: t("vibemail") },
  ];

  return (
    <div className="h-screen flex flex-col bg-vintage-black text-white overflow-hidden">

      {/* ── TOP BAR ── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3" style={{ background: 'rgba(26,26,26,0.97)', borderBottom: '2px solid rgba(255,215,0,0.25)', backdropFilter: 'blur(12px)', height: 52 }}>
        <Link
          href="/"
          onClick={() => AudioManager.buttonClick()}
          className="px-3 py-1.5 text-white text-[11px] font-bold uppercase tracking-wider transition-colors rounded-md flex-shrink-0"
          style={{ background: '#CC2222', borderRadius: 6 }}
        >
          ← {t('back')}
        </Link>

        <h1 className="flex-1 text-center font-modern font-black text-vintage-gold uppercase tracking-widest" style={{ fontSize: 16 }}>
          {t("documentation")}
        </h1>

        {/* Language picker */}
        <div className="relative">
          <button
            onClick={() => { AudioManager.buttonClick(); setLangOpen(v => !v); }}
            className="px-2 py-1 bg-vintage-gold text-black text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] active:shadow-none transition-all"
          >
            {languages.find(l => l.code === lang)?.label ?? 'EN'} ▼
          </button>
          {langOpen && (
            <div className="absolute top-full mt-1 right-0 z-50 bg-[#1a1a1a] border-2 border-black shadow-[4px_4px_0px_#000] min-w-[70px]">
              {languages.map(language => (
                <button
                  key={language.code}
                  onClick={() => {
                    AudioManager.buttonClick();
                    setLang(language.code as DocsSupportedLanguage);
                    setLangOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-xs border-b border-black/30 last:border-0 transition-colors ${
                    lang === language.code ? 'bg-vintage-gold text-black font-bold' : 'text-white hover:bg-white/10'
                  }`}
                >
                  {language.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION TABS (3-col grid, all visible) ── */}
      <div className="flex-shrink-0 grid grid-cols-3 gap-1.5 px-3 py-2 border-b-2 border-black bg-[#161616]">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => { AudioManager.buttonClick(); setActiveSection(section.id); }}
            onMouseEnter={() => AudioManager.buttonHover()}
            className={`px-2 py-1.5 text-xs font-bold border-2 border-black transition-all truncate ${
              activeSection === section.id
                ? 'bg-vintage-gold text-black translate-x-[2px] translate-y-[2px] shadow-none'
                : 'bg-[#2c2c2c] text-white shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000]'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT (scrollable) ── */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="bg-[#1a1a1a] border-2 border-black shadow-[4px_4px_0px_#000] p-4 mb-4">

          {/* Economy */}
          {activeSection === "economy" && (
            <div>
              <h2 className="text-xl font-display font-bold text-vintage-gold mb-3 uppercase">{t("economyTitle")}</h2>
              <div className="space-y-3 text-sm text-white/90">
                <p>{t("economyIntro")}</p>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("howToEarnCoins")}</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li><strong>{t("earnPve")}:</strong> {t("earnPveDesc")}</li>
                  <li><strong>{t("earnPvp")}:</strong> {t("earnPvpDesc")}</li>
                  <li><strong>{t("earnAttack")}:</strong> {t("earnAttackDesc")}</li>
                  <li><strong>{t("earnQuests")}:</strong> {t("earnQuestsDesc")}</li>
                </ul>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("entryFees")}</h3>
                <ul className="list-disc list-inside space-y-1.5">
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
              <h2 className="text-xl font-display font-bold text-vintage-gold mb-3 uppercase">{t("battlesTitle")}</h2>
              <div className="space-y-3 text-sm text-white/90">
                <p>{t("battlesIntro")}</p>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("pveMode")}</h3>
                <p>{t("pveModeDesc")}</p>
                <h4 className="text-sm font-bold text-vintage-gold mt-3">{t("pveDifficulties")}</h4>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>{t("pveGey")}</li>
                  <li>{t("pveTop")}</li>
                  <li>{t("pveG")}</li>
                  <li>{t("pveMid")}</li>
                  <li>{t("pveGigachad")}</li>
                </ul>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("pvpMode")}</h3>
                <p>{t("pvpModeDesc")}</p>
                <h4 className="text-sm font-bold text-vintage-gold mt-3">{t("pvpRewards")}</h4>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>{t("pvpWin")}</li>
                  <li>{t("pvpLoss")}</li>
                  <li>{t("pvpTie")}</li>
                </ul>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("attackMode")}</h3>
                <p>{t("attackModeDesc")}</p>
                <ul className="list-disc list-inside space-y-1.5 mt-2">
                  <li>{t("attackStep1")}</li>
                  <li>{t("attackStep2")}</li>
                  <li>{t("attackStep3")}</li>
                </ul>
              </div>
            </div>
          )}


          {/* Mecha Arena */}
          {activeSection === "mecha" && (
            <div>
              <h2 className="text-xl font-display font-bold text-vintage-gold mb-3 uppercase">{t("mechaArena")}</h2>
              <div className="space-y-3 text-sm text-white/90">
                <p>{t("mechaIntro")}</p>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("mechaHowItWorks")}</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>{t("mechaStep1")}</li>
                  <li>{t("mechaStep2")}</li>
                  <li>{t("mechaStep3")}</li>
                  <li>{t("mechaStep4")}</li>
                  <li>{t("mechaStep5")}</li>
                </ul>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("mechaBettingOdds")}</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li><strong>{t("mechaRounds13")}</strong></li>
                  <li><strong>{t("mechaRounds45")}</strong></li>
                  <li><strong>{t("mechaRounds67")}</strong></li>
                  <li><strong>{t("mechaTieBet")}</strong></li>
                </ul>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("mechaCollections")}</h3>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {['🌅 GM VBRS','🎭 $VBMS','🍥 Viberuto','🐱 Meowverse','🆔 VibeFID','🧟 Vibe Rot Bangers'].map(c => (
                    <span key={c} className="bg-black/50 px-2 py-1 border border-black/50 text-xs">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Raid Boss */}
          {activeSection === "raidboss" && (
            <div>
              <h2 className="text-xl font-display font-bold text-vintage-gold mb-3 uppercase">{t("raidBoss")}</h2>
              <div className="space-y-3 text-sm text-white/90">
                <p>{t("raidBossIntro")}</p>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("raidHowItWorks")}</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>{t("raidStep1")}</li><li>{t("raidStep2")}</li><li>{t("raidStep3")}</li>
                  <li>{t("raidStep4")}</li><li>{t("raidStep5")}</li>
                </ul>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("raidRewards")}</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>{t("raidReward1")}</li><li>{t("raidReward2")}</li><li>{t("raidReward3")}</li>
                </ul>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("raidTips")}</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>{t("raidTip1")}</li><li>{t("raidTip2")}</li><li>{t("raidTip3")}</li>
                </ul>
              </div>
            </div>
          )}

          {/* VibeFID */}
          {activeSection === "vibefid" && (
            <div>
              <h2 className="text-xl font-display font-bold text-vintage-gold mb-3 uppercase">{t("vibeFID")}</h2>
              <div className="space-y-3 text-sm text-white/90">
                <p>{t("vibeFIDIntro")}</p>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("vibeFIDHowItWorks")}</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>{t("vibeFIDStep1")}</li><li>{t("vibeFIDStep2")}</li>
                  <li>{t("vibeFIDStep3")}</li><li>{t("vibeFIDStep4")}</li>
                </ul>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("vibeFIDNeynarScore")}</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li><strong className="text-purple-400">{t("vibeFIDMythic")}</strong></li>
                  <li><strong className="text-orange-400">{t("vibeFIDLegendary")}</strong></li>
                  <li><strong className="text-pink-400">{t("vibeFIDEpic")}</strong></li>
                  <li><strong className="text-blue-400">{t("vibeFIDRare")}</strong></li>
                  <li><strong className="text-gray-400">{t("vibeFIDCommon")}</strong></li>
                </ul>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("vibeFIDBenefits")}</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>{t("vibeFIDBenefit1")}</li><li>{t("vibeFIDBenefit2")}</li><li>{t("vibeFIDBenefit3")}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Quests */}
          {activeSection === "quests" && (
            <div>
              <h2 className="text-xl font-display font-bold text-vintage-gold mb-3 uppercase">{t("questsTitle")}</h2>
              <div className="space-y-3 text-sm text-white/90">
                <p>{t("questsIntro")}</p>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("dailyQuests")}</h3>
                <p>{t("dailyQuestsDesc")}</p>
                <ul className="list-disc list-inside space-y-1.5 mt-1"><li>{t("dailyQuest1")}</li></ul>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("weeklyQuests")}</h3>
                <p>{t("weeklyQuestsDesc")}</p>
                <ul className="list-disc list-inside space-y-1.5 mt-1">
                  <li>{t("weeklyQuest1")}</li><li>{t("weeklyQuest2")}</li>
                  <li>{t("weeklyQuest3")}</li><li>{t("weeklyQuest4")}</li>
                </ul>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("weeklyRewards")}</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>{t("weeklyTier1")}</li><li>{t("weeklyTier2")}</li>
                  <li>{t("weeklyTier3")}</li><li>{t("weeklyTier4")}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Cards */}
          {activeSection === "cards" && (
            <div>
              <h2 className="text-xl font-display font-bold text-vintage-gold mb-3 uppercase">{t("cardsTitle")}</h2>
              <div className="space-y-3 text-sm text-white/90">
                <p>{t("cardsIntro")}</p>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("cardRarity")}</h3>
                <p>{t("cardRarityDesc")}</p>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("cardWear")}</h3>
                <p>{t("cardWearDesc")}</p>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("cardFoil")}</h3>
                <p>{t("cardFoilDesc")}</p>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("powerCalculation")}</h3>
                <p className="font-mono bg-black/50 p-2 border border-black/50 text-xs">{t("powerFormula")}</p>
                <p className="text-vintage-burnt-gold text-xs">{t("powerExample")}</p>
              </div>
            </div>
          )}

          {/* Baccarat */}
          {activeSection === "baccarat" && (
            <div>
              <h2 className="text-xl font-display font-bold text-vintage-gold mb-3 uppercase">Baccarat</h2>
              <div className="space-y-3 text-sm text-white/90">
                <p>Classic Baccarat casino mode where you bet on Player, Banker, or Tie using your VBMS coins.</p>

                <h3 className="text-base font-bold text-vintage-gold mt-4">How to Play</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>Choose your bet: <strong>Player</strong>, <strong>Banker</strong>, or <strong>Tie</strong></li>
                  <li>Select your wager amount in VBMS coins</li>
                  <li>Cards are dealt automatically — closest to 9 wins</li>
                  <li>Face cards and 10s are worth 0; Aces are worth 1</li>
                </ul>

                <h3 className="text-base font-bold text-vintage-gold mt-4">Payouts</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li><strong>Player win:</strong> 1:1</li>
                  <li><strong>Banker win:</strong> 1:1 (5% commission)</li>
                  <li><strong>Tie:</strong> 8:1</li>
                </ul>

                <h3 className="text-base font-bold text-vintage-gold mt-4">Tips</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>Banker bet has the lowest house edge (~1.06%)</li>
                  <li>Tie bets are high risk, high reward</li>
                  <li>Use your daily VBMS earnings to play</li>
                </ul>
              </div>
            </div>
          )}

          {/* FAQ */}
          {activeSection === "faq" && (
            <div>
              <h2 className="text-xl font-display font-bold text-vintage-gold mb-3 uppercase">{t("faqTitle")}</h2>
              <div className="space-y-4 text-sm text-white/90">
                {([1,2,3,4,5,6,7,8] as const).map(n => (
                  <div key={n} className="border-l-2 border-vintage-gold/50 pl-3">
                    <h3 className="text-sm font-bold text-vintage-gold mb-1">{t(`faq${n}Q` as DocsTranslationKey)}</h3>
                    <p className="text-white/80">{t(`faq${n}A` as DocsTranslationKey)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Poker Battle */}
          {activeSection === "poker" && (
            <div>
              <h2 className="text-xl font-display font-bold text-vintage-gold mb-3 uppercase">{t("pokerBattle")}</h2>
              <div className="space-y-3 text-sm text-white/90">
                <p>{t("pokerIntro")}</p>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("pokerStakes")}</h3>
                <p>{t("pokerRules")}</p>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>{t("pokerRule1")}</li>
                  <li>{t("pokerRule2")}</li>
                  <li>{t("pokerRule3")}</li>
                  <li>{t("pokerRule4")}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Aura XP */}
          {activeSection === "aura" && (
            <div>
              <h2 className="text-xl font-display font-bold text-vintage-gold mb-3 uppercase">{t("aura")}</h2>
              <div className="space-y-3 text-sm text-white/90">
                <p>{t("auraIntro")}</p>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("auraHowItWorks")}</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>{t("auraStep1")}</li>
                  <li>{t("auraStep2")}</li>
                  <li>{t("auraStep3")}</li>
                  <li>{t("auraStep4")}</li>
                </ul>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("auraTiers")}</h3>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {[
                    { label: t("auraHuman"), value: "0", color: "text-gray-400" },
                    { label: t("auraGreatApe"), value: "200", color: "text-amber-300" },
                    { label: t("auraSSJ1"), value: "800", color: "text-yellow-400" },
                    { label: t("auraSSJ2"), value: "2500", color: "text-orange-400" },
                    { label: t("auraSSJ3"), value: "6000", color: "text-red-500" },
                    { label: t("auraSSJ4"), value: "14000", color: "text-red-700" },
                    { label: t("auraSSJGod"), value: "28000", color: "text-purple-600" },
                    { label: t("auraSSJBlue"), value: "52000", color: "text-blue-500" },
                  ].map((tier, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-black/50 border-2 border-black rounded">{tier.label}</div>
                      <span className={`font-mono ${tier.color}`}>{tier.value} XP</span>
                    </div>
                  ))}
                </div>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("auraBenefits")}</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>{t("auraBenefit1")}</li>
                  <li>{t("auraBenefit2")}</li>
                  <li>{t("auraBenefit3")}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Social Quests */}
          {activeSection === "socialquests" && (
            <div>
              <h2 className="text-xl font-display font-bold text-vintage-gold mb-3 uppercase">{t("socialquests")}</h2>
              <div className="space-y-3 text-sm text-white/90">
                <p>{t("socialquestsIntro")}</p>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("socialquestsHowItWorks")}</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>{t("socialquestsStep1")}</li>
                  <li>{t("socialquestsStep2")}</li>
                  <li>{t("socialquestsStep3")}</li>
                </ul>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("socialquestsRewards")}</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>{t("socialquestsReward1")}</li>
                  <li>{t("socialquestsReward2")}</li>
                  <li>{t("socialquestsReward3")}</li>
                </ul>
              </div>
            </div>
          )}


          {/* VibeMail */}
          {activeSection === "vibemail" && (
            <div>
              <h2 className="text-xl font-display font-bold text-vintage-gold mb-3 uppercase">{t("vibemail")}</h2>
              <div className="space-y-3 text-sm text-white/90">
                <p>{t("vibemailIntro")}</p>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("vibemailHowItWorks")}</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>{t("vibemailStep1")}</li>
                  <li>{t("vibemailStep2")}</li>
                  <li>{t("vibemailStep3")}</li>
                  <li>{t("vibemailStep4")}</li>
                </ul>
                <h3 className="text-base font-bold text-vintage-gold mt-4">{t("vibemailFeatures")}</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>{t("vibemailFeature1")}</li>
                  <li>{t("vibemailFeature2")}</li>
                  <li>{t("vibemailFeature3")}</li>
                  <li>{t("vibemailFeature4")}</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Social links */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { href: "https://x.com/Lowprofile_eth", label: "Twitter/X", color: "text-white", icon: <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
            { href: "https://farcaster.xyz/~/channel/vibe-most-wanted", label: "Farcaster", color: "text-purple-400", icon: <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/></svg> },
            { href: "https://github.com/JVHBO", label: "GitHub", color: "text-gray-300", icon: <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> },
          ].map(({ href, label, color, icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => AudioManager.buttonClick()}
              className="flex items-center justify-center gap-1.5 p-2 bg-[#1a1a1a] border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <span className={color}>{icon}</span>
              <span className="text-white font-bold text-xs">{label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
