"use client";

/**
 * BrowserNotifications
 *
 * Polls Convex periodically and fires Web Notification API alerts for:
 *   1. New Wanted Cast winner (cast auction changes)
 *   2. Raid energy fully expired (user should refill deck)
 *
 * Only runs when Notification.permission === "granted".
 * Uses one-time Convex queries (not WebSocket subscriptions) to save bandwidth.
 */

import { useEffect, useRef } from "react";
import { useConvex } from "convex/react";
import { useAccount } from "wagmi";
import { api } from "@/convex/_generated/api";
import { useLanguage } from "@/contexts/LanguageContext";
import type { SupportedLanguage } from "@/lib/translations";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const WINNER_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour between winner notifs
const ENERGY_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours between energy notifs
const STORAGE_KEY_WINNER = "vbms_last_notified_winner";
const STORAGE_KEY_WINNER_TIME = "vbms_last_winner_notif_time";
const STORAGE_KEY_ENERGY = "vbms_last_energy_notif";

// Translated notification text for all 10 languages
const NOTIF_TEXT: Record<SupportedLanguage, {
  winnerTitle: string;
  winnerBody: (author: string, winner: string) => string;
  energyTitle: string;
  energyBody: string;
}> = {
  "en": {
    winnerTitle: "$VBMS – New Wanted Cast Winner!",
    winnerBody: (author, winner) => `${winner} won the auction! @${author} is now WANTED 🎯`,
    energyTitle: "$VBMS – Raid Energy Expired",
    energyBody: "Your raid deck energy has run out. Come back to refuel and keep attacking!",
  },
  "pt-BR": {
    winnerTitle: "$VBMS – Novo Ganhador do Wanted Cast!",
    winnerBody: (author, winner) => `${winner} ganhou o leilão! @${author} agora é PROCURADO 🎯`,
    energyTitle: "$VBMS – Energia da Raid Expirou",
    energyBody: "A energia do seu deck de raid acabou. Volte para reabastecer e continuar atacando!",
  },
  "es": {
    winnerTitle: "$VBMS – ¡Nuevo Ganador del Wanted Cast!",
    winnerBody: (author, winner) => `¡${winner} ganó la subasta! @${author} ahora es BUSCADO 🎯`,
    energyTitle: "$VBMS – Energía de Raid Expirada",
    energyBody: "La energía de tu deck de raid se agotó. ¡Vuelve a recargar y sigue atacando!",
  },
  "hi": {
    winnerTitle: "$VBMS – नया Wanted Cast विजेता!",
    winnerBody: (author, winner) => `${winner} ने नीलामी जीती! @${author} अब WANTED है 🎯`,
    energyTitle: "$VBMS – रेड ऊर्जा समाप्त",
    energyBody: "आपके रेड डेक की ऊर्जा खत्म हो गई। वापस आएं और हमला जारी रखें!",
  },
  "ru": {
    winnerTitle: "$VBMS – Новый победитель Wanted Cast!",
    winnerBody: (author, winner) => `${winner} выиграл аукцион! @${author} теперь в РОЗЫСКЕ 🎯`,
    energyTitle: "$VBMS – Энергия рейда закончилась",
    energyBody: "Энергия вашей колоды рейда иссякла. Вернитесь, чтобы пополнить и продолжить атаки!",
  },
  "zh-CN": {
    winnerTitle: "$VBMS – 通缉令新赢家！",
    winnerBody: (author, winner) => `${winner}赢得了拍卖！@${author}现在被通缉 🎯`,
    energyTitle: "$VBMS – 突袭能量已耗尽",
    energyBody: "您的突袭牌组能量已用完。回来补充能量继续攻击！",
  },
  "id": {
    winnerTitle: "$VBMS – Pemenang Wanted Cast Baru!",
    winnerBody: (author, winner) => `${winner} memenangkan lelang! @${author} kini DICARI 🎯`,
    energyTitle: "$VBMS – Energi Raid Habis",
    energyBody: "Energi deck raid kamu habis. Kembali untuk mengisi ulang dan lanjutkan serangan!",
  },
  "fr": {
    winnerTitle: "$VBMS – Nouveau gagnant du Wanted Cast !",
    winnerBody: (author, winner) => `${winner} a remporté la mise ! @${author} est maintenant RECHERCHÉ 🎯`,
    energyTitle: "$VBMS – Énergie de Raid Épuisée",
    energyBody: "L'énergie de votre deck de raid est épuisée. Revenez pour la recharger et continuer !",
  },
  "ja": {
    winnerTitle: "$VBMS – Wanted Castの新しい勝者！",
    winnerBody: (author, winner) => `${winner}がオークションに勝利！@${author}はWANTEDになりました 🎯`,
    energyTitle: "$VBMS – レイドエネルギー切れ",
    energyBody: "レイドデッキのエネルギーが切れました。補充して攻撃を続けましょう！",
  },
  "it": {
    winnerTitle: "$VBMS – Nuovo vincitore del Wanted Cast!",
    winnerBody: (author, winner) => `${winner} ha vinto l'asta! @${author} è ora RICERCATO 🎯`,
    energyTitle: "$VBMS – Energia Raid Esaurita",
    energyBody: "L'energia del tuo mazzo raid è esaurita. Torna a ricaricare e continua ad attaccare!",
  },
};

export function BrowserNotifications() {
  const convex = useConvex();
  const { address } = useAccount();
  const { lang } = useLanguage();
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    const checkAndNotify = async () => {
      if (Notification.permission !== "granted") return;

      const texts = NOTIF_TEXT[langRef.current] || NOTIF_TEXT["en"];

      // ── 1. Wanted Cast winner ────────────────────────────────────────────
      try {
        const winningCasts = await convex.query(api.castAuctions.getWinningCasts, {});
        if (winningCasts && winningCasts.length > 0) {
          const latest = winningCasts[0];
          const castKey = `${latest.castHash ?? ""}-${latest.winnerAddress ?? ""}`;
          const lastNotified = localStorage.getItem(STORAGE_KEY_WINNER);

          if (castKey && castKey !== lastNotified) {
            // New winner — respect 1-hour cooldown to avoid spam
            const now = Date.now();
            const lastWinnerTime = parseInt(localStorage.getItem(STORAGE_KEY_WINNER_TIME) ?? "0");
            if (now - lastWinnerTime > WINNER_COOLDOWN_MS) {
              const winner = latest.winnerUsername ? `@${latest.winnerUsername}` : "Someone";
              const author = latest.castAuthor ?? "unknown";
              new Notification(texts.winnerTitle, {
                body: texts.winnerBody(author, winner),
                icon: "/favicon-32x32.png",
                tag: "vbms-cast-winner",
              });
              localStorage.setItem(STORAGE_KEY_WINNER_TIME, String(now));
            }
            // Always update castKey so we don't re-notify for same winner next poll
            localStorage.setItem(STORAGE_KEY_WINNER, castKey);
          }
        }
      } catch {
        // silently fail — non-critical
      }

      // ── 2. Raid energy ───────────────────────────────────────────────────
      if (address) {
        try {
          const raidDeck = await convex.query(api.raidBoss.getPlayerRaidDeck, { address });
          if (raidDeck && raidDeck.cardEnergy && raidDeck.cardEnergy.length > 0) {
            const now = Date.now();
            const allExpired = raidDeck.cardEnergy.every(
              (c: { energyExpiresAt: number }) =>
                c.energyExpiresAt !== 0 && c.energyExpiresAt < now
            );

            if (allExpired) {
              // Only notify once per expiry window (don't spam every 5 min)
              const lastEnergyNotif = parseInt(localStorage.getItem(STORAGE_KEY_ENERGY) ?? "0");
              // Notify at most once per 4 hours
              if (now - lastEnergyNotif > ENERGY_COOLDOWN_MS) {
                new Notification(texts.energyTitle, {
                  body: texts.energyBody,
                  icon: "/favicon-32x32.png",
                  tag: "vbms-raid-energy",
                });
                localStorage.setItem(STORAGE_KEY_ENERGY, String(now));
              }
            } else {
              // Energy is active — reset so next expiry fires again
              localStorage.removeItem(STORAGE_KEY_ENERGY);
            }
          }
        } catch {
          // silently fail — non-critical
        }
      }
    };

    // Expose test function on window for manual testing
    (window as any).vbmsTestNotification = () => {
      if (Notification.permission !== "granted") {
        console.warn("[BrowserNotifications] Permission not granted");
        return;
      }
      const texts = NOTIF_TEXT[langRef.current] || NOTIF_TEXT["en"];
      new Notification(texts.winnerTitle, {
        body: texts.winnerBody("jvhbo", "@testuser"),
        icon: "/favicon-32x32.png",
        tag: "vbms-test",
      });
      setTimeout(() => {
        new Notification(texts.energyTitle, {
          body: texts.energyBody,
          icon: "/favicon-32x32.png",
          tag: "vbms-test-energy",
        });
      }, 2000);
      console.log("[BrowserNotifications] Test notifications sent!");
    };

    // Run immediately then every 5 minutes
    checkAndNotify();
    const interval = setInterval(checkAndNotify, POLL_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      delete (window as any).vbmsTestNotification;
    };
  }, [convex, address]);

  return null; // No UI — purely background logic
}
