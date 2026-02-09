"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/lib/fid/convex-generated/api";
import Link from "next/link";
import { AudioManager } from "@/lib/fid/audio-manager";
import { useLanguage } from "@/contexts/LanguageContext";
import { fidTranslations } from "@/lib/fid/fidTranslations";
import { sdk } from "@farcaster/miniapp-sdk";
import { useFarcasterContext } from "@/hooks/fid/useFarcasterContext";

interface MostWantedCard {
  _id: string;
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  cardImageUrl?: string;
  rarity: string;
  mintScore: number;
  currentScore: number;
  scoreDiff: number;
  votes: number;
}

const ITEMS_PER_PAGE = 50;

export default function MostWantedPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const { lang, setLang } = useLanguage();
  const t = fidTranslations[lang];
  const farcasterContext = useFarcasterContext();
  const [showVBMSModal, setShowVBMSModal] = useState(false);

  // Get all cards for search/pagination
  const mostWanted = useQuery(api.mostWanted.getRanking, { limit: 1000 });

  if (!mostWanted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black p-4 flex items-center justify-center">
        <div className="text-vintage-gold text-xl animate-pulse">{t.loading}</div>
      </div>
    );
  }

  // Filter cards by search term
  const filteredCards = (mostWanted.cards as MostWantedCard[] || []).filter((card: MostWantedCard) =>
    searchTerm === "" ||
    card.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.fid.toString().includes(searchTerm)
  );

  // Pagination
  const totalPages = Math.ceil(filteredCards.length / ITEMS_PER_PAGE);
  const paginatedCards = filteredCards.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  // Reset to first page when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with language selector */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1"></div>
          <div className="text-center flex-2">
            <h1 className="text-2xl font-bold text-vintage-gold">
              {t.mostWantedTitle}
            </h1>
            <p className="text-vintage-ice/60 text-sm mt-1">
              {t.mostWantedDesc}
            </p>
          </div>
          <div className="flex-1 flex justify-end">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as any)}
              className="h-8 px-2 bg-[#1a1a1a] border border-vintage-gold/30 rounded-lg text-vintage-gold font-bold focus:outline-none focus:border-vintage-gold text-xs hover:border-vintage-gold hover:bg-vintage-gold/10 transition-all cursor-pointer [&>option]:bg-[#1a1a1a] [&>option]:text-vintage-gold"
            >
              <option value="en">EN</option>
              <option value="pt-BR">PT</option>
              <option value="es">ES</option>
              <option value="it">IT</option>
              <option value="fr">FR</option>
              <option value="ja">JA</option>
              <option value="zh-CN">ZH</option>
              <option value="ru">RU</option>
              <option value="hi">HI</option>
              <option value="id">ID</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder={t.searchByUsernameOrFid}
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full px-4 py-2 bg-vintage-black border border-vintage-gold/30 rounded-lg text-vintage-gold placeholder-vintage-ice/40 focus:outline-none focus:border-vintage-gold"
          />
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between mb-4 text-vintage-ice/60 text-sm">
          <span>{filteredCards.length} {(t as unknown as Record<string, string>).cardsTotal || "cards"}</span>
          {totalPages > 1 && (
            <span>{(t as unknown as Record<string, string>).page || "Page"} {currentPage + 1} / {totalPages}</span>
          )}
        </div>

        {paginatedCards.length > 0 ? (
          <div className="space-y-2 mb-4">
            {paginatedCards.map((card: MostWantedCard, index: number) => {
              const globalIndex = currentPage * ITEMS_PER_PAGE + index;
              return (
                <Link
                  key={card._id}
                  href={"/fid/" + card.fid}
                  onClick={() => AudioManager.buttonClick()}
                  className="flex items-center gap-3 p-3 bg-vintage-charcoal rounded-xl border border-vintage-gold/30 hover:border-vintage-gold transition-all"
                >
                  <div className={"w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm " + (
                    globalIndex === 0 ? "bg-yellow-500 text-black" :
                    globalIndex === 1 ? "bg-gray-400 text-black" :
                    globalIndex === 2 ? "bg-amber-600 text-white" :
                    "bg-vintage-gold/20 text-vintage-gold"
                  )}>
                    {globalIndex + 1}
                  </div>
                  <img
                    src={card.cardImageUrl || card.pfpUrl}
                    alt={card.username}
                    className="w-12 h-16 object-cover rounded-lg border border-vintage-gold/30"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-vintage-gold font-bold truncate">@{card.username}</p>
                    <p className="text-vintage-ice/60 text-xs">{(t as any)[card.rarity.toLowerCase()] || card.rarity}</p>
                    {card.votes > 0 && (
                      <p className="text-yellow-400 text-xs font-bold">{card.votes} {(t as any).votes || 'votes'}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={"font-bold text-sm " + (card.scoreDiff > 0 ? "text-green-400" : card.scoreDiff < 0 ? "text-red-400" : "text-vintage-ice/50")}>
                      {card.scoreDiff > 0 ? "+" : ""}{card.scoreDiff.toFixed(4)}
                    </p>
                    <p className="text-vintage-ice/50 text-xs">
                      {card.mintScore.toFixed(3)} {'→'} {card.currentScore.toFixed(3)}
                    </p>
                    {(() => {
                      // Check if card can upgrade based on current score (using correct thresholds)
                      const getRarityFromScore = (score: number) => {
                        if (score >= 0.99) return 'Mythic';
                        if (score >= 0.90) return 'Legendary';
                        if (score >= 0.79) return 'Epic';
                        if (score >= 0.70) return 'Rare';
                        return 'Common';
                      };
                      const currentRarityLevel = getRarityFromScore(card.currentScore);
                      const mintRarityLevel = card.rarity;
                      const rarityOrder = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
                      const canUpgrade = rarityOrder.indexOf(currentRarityLevel) > rarityOrder.indexOf(mintRarityLevel);
                      return canUpgrade ? (
                        <p className="text-yellow-400 text-[10px] font-bold animate-pulse mt-0.5">
                          ⬆ {t.upgradeAvailable}
                        </p>
                      ) : null;
                    })()}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-vintage-ice">
            {searchTerm ? t.noCardsFoundSearch : t.noRankingData}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mb-20">
            <button
              onClick={() => {
                AudioManager.buttonClick();
                setCurrentPage(p => Math.max(0, p - 1));
              }}
              disabled={currentPage === 0}
              className="px-4 py-2 bg-vintage-black border border-vintage-gold/30 rounded-lg text-vintage-gold disabled:opacity-30 disabled:cursor-not-allowed hover:border-vintage-gold transition-all"
            >
              {t.previous || '← Previous'}
            </button>
            <div className="flex items-center gap-2">
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i;
                } else if (currentPage < 3) {
                  pageNum = i;
                } else if (currentPage > totalPages - 4) {
                  pageNum = totalPages - 5 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => {
                      AudioManager.buttonClick();
                      setCurrentPage(pageNum);
                    }}
                    className={"w-8 h-8 rounded-lg font-bold text-sm transition-all " + (
                      currentPage === pageNum
                        ? "bg-vintage-gold text-black"
                        : "bg-vintage-black border border-vintage-gold/30 text-vintage-gold hover:border-vintage-gold"
                    )}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                AudioManager.buttonClick();
                setCurrentPage(p => Math.min(totalPages - 1, p + 1));
              }}
              disabled={currentPage >= totalPages - 1}
              className="px-4 py-2 bg-vintage-black border border-vintage-gold/30 rounded-lg text-vintage-gold disabled:opacity-30 disabled:cursor-not-allowed hover:border-vintage-gold transition-all"
            >
              {t.next || 'Next →'}
            </button>
          </div>
        )}

        <div className="h-20"></div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-[9999] safe-area-bottom">
        <div className="bg-vintage-charcoal/95 backdrop-blur-lg rounded-none border-t-2 border-vintage-gold/30 p-1 flex gap-1">
          <button
            onClick={() => {
              AudioManager.buttonClick();
              setShowVBMSModal(true);
            }}
            className="flex-1 min-w-0 px-1 py-2 flex flex-col items-center justify-center gap-0.5 rounded-lg font-semibold transition-all text-[10px] leading-tight bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30"
          >
            <span className="text-[10px] font-bold whitespace-nowrap">Vibe</span>
            <span className="text-xl leading-none">♠</span>
          </button>
          <div className="flex-1 min-w-0 px-1 py-2 flex flex-col items-center justify-center gap-0.5 rounded-lg font-semibold text-[10px] leading-tight bg-vintage-gold/20 text-vintage-gold border-2 border-vintage-gold">
            <span className="text-[10px] font-bold whitespace-nowrap">{t.mostWantedTitle}</span>
            <span className="text-xl leading-none">♣</span>
          </div>
          <Link href="/fid" onClick={() => AudioManager.buttonClick()} className="flex-1 min-w-0 px-1 py-2 flex flex-col items-center justify-center gap-0.5 rounded-lg font-semibold transition-all text-[10px] leading-tight bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30">
            <span className="text-[10px] font-bold whitespace-nowrap">{t.back}</span>
            <span className="text-xl leading-none">←</span>
          </Link>
        </div>
      </div>

      {/* VBMS Confirmation Modal */}
      {showVBMSModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-2xl p-4 w-full max-w-sm">
            <h3 className="text-vintage-gold font-bold text-lg mb-3 text-center">
              {(t as unknown as Record<string, string>).openVBMS || 'Open Vibe Most Wanted?'}
            </h3>
            <p className="text-vintage-ice/80 text-sm text-center mb-4">
              {(t as unknown as Record<string, string>).openVBMSDesc || 'You will be redirected to Vibe Most Wanted to play the game.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  AudioManager.buttonClick();
                  setShowVBMSModal(false);
                }}
                className="flex-1 py-2 bg-vintage-burnt-gold/30 hover:bg-vintage-burnt-gold/50 text-vintage-gold font-bold rounded-xl transition-all"
              >
                {(t as unknown as Record<string, string>).cancel || 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  AudioManager.buttonClick();
                  const VBMS_MINIAPP_URL = 'https://farcaster.xyz/miniapps/0sNKxskaSKsH/vbms---game-and-wanted-cast';
                  if (farcasterContext.isInMiniapp) {
                    try {
                      await sdk.actions.openMiniApp({ url: VBMS_MINIAPP_URL });
                    } catch (err) {
                      window.open(VBMS_MINIAPP_URL, '_blank');
                    }
                  } else {
                    window.open(VBMS_MINIAPP_URL, '_blank');
                  }
                  setShowVBMSModal(false);
                }}
                className="flex-1 py-2 bg-vintage-gold hover:bg-yellow-500 text-vintage-black font-bold rounded-xl transition-all"
              >
                {(t as unknown as Record<string, string>).open || 'Open'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
