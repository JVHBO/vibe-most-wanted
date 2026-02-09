"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/lib/fid/convex-generated/api";

interface FloatingCard {
  id: string;
  fid: number;
  imageUrl: string;
  x: number;
  duration: number;
  delay: number;
}

interface FloatingMessage {
  id: string;
  message: string;
  cardFid: number;
  x: number;
  duration: number;
  delay: number;
}

interface FloatingCardsBackgroundProps {
  userFid?: number; // Current user's FID to show their messages
  onMessageClick?: () => void; // Callback when clicking on a floating message
}

export function FloatingCardsBackground({ userFid, onMessageClick }: FloatingCardsBackgroundProps) {
  const [floatingCards, setFloatingCards] = useState<FloatingCard[]>([]);
  const [floatingMessages, setFloatingMessages] = useState<FloatingMessage[]>([]);

  const recentCards = useQuery(api.farcasterCards.getCardImagesOnly, {
    limit: 8,
  });

  // Get VibeMails for the current user only
  const recentVibeMails = useQuery(
    api.cardVotes.getRecentVibeMails,
    userFid ? { cardFid: userFid, limit: 4 } : "skip"
  );

  useEffect(() => {
    if (recentCards && recentCards.length > 0) {
      // Função para gerar número aleatório em range
      const random = (min: number, max: number) => Math.random() * (max - min) + min;

      const numCards = Math.min(8, recentCards.length);

      // Dividir a tela horizontalmente em seções (uma por carta)
      const sectionWidth = 100 / numCards;

      const cards = recentCards.slice(0, numCards).map((card: any, index: number) => {
        // Calcular a seção horizontal desta carta
        const sectionStart = index * sectionWidth;
        // Posição X com variação dentro da seção (margem de 2% nas bordas)
        const x = sectionStart + random(5, sectionWidth - 5);

        // Delay escalonado para não começarem todas juntas
        // Delays mais curtos para aparecer mais rápido
        const delay = index * 3 + random(0, 1);

        return {
          id: card._id || `card-${index}`,
          fid: card.fid,
          imageUrl: card.cardImageUrl || card.pfpUrl,
          x,
          duration: random(18, 25),
          delay, // Delay em segundos
        };
      });

      setFloatingCards(cards);
    }
  }, [recentCards]);

  // Process VibeMail messages
  useEffect(() => {
    if (recentVibeMails && recentVibeMails.length > 0) {
      const random = (min: number, max: number) => Math.random() * (max - min) + min;

      const messages = recentVibeMails.map((msg: any, index: number) => ({
        id: msg._id || `msg-${index}`,
        message: msg.message || "💌",
        cardFid: msg.cardFid,
        x: random(10, 90),
        duration: random(22, 30),
        delay: index * 5 + random(2, 4),
      }));

      setFloatingMessages(messages);
    }
  }, [recentVibeMails]);

  // Memoize keyframes CSS to avoid re-renders
  const keyframesCSS = useMemo(() => {
    const cardKeyframes = floatingCards.map((_, index) => `
      @keyframes floatUp${index} {
        0% { transform: translateY(0) translateZ(0); }
        100% { transform: translateY(-150vh) translateZ(0); }
      }
    `).join('\n');

    const msgKeyframes = floatingMessages.map((_, index) => `
      @keyframes floatMsg${index} {
        0% { transform: translateY(0) rotate(-3deg) translateZ(0); opacity: 0.6; }
        50% { opacity: 0.8; }
        100% { transform: translateY(-150vh) rotate(3deg) translateZ(0); opacity: 0.4; }
      }
    `).join('\n');

    return cardKeyframes + msgKeyframes;
  }, [floatingCards.length, floatingMessages.length]);

  if (floatingCards.length === 0 && floatingMessages.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'auto',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {floatingCards.map((card, index) => (
        <div
          key={card.id}
          onClick={() => window.location.href = `/fid/${card.fid}`}
          style={{
            position: 'absolute',
            width: '140px',
            height: '196px',
            cursor: 'pointer',
            left: `${card.x}%`,
            marginLeft: '-70px',
            top: 'calc(100% + 220px)', // Sempre começa abaixo da tela
            backgroundColor: '#0a0a0a',
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: index + 1,
            willChange: 'transform',
            animation: `floatUp${index} ${card.duration}s linear ${card.delay}s infinite`,
          }}
        >
          <img
            src={card.imageUrl}
            alt=""
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              filter: 'brightness(0.35)',
              transition: 'filter 0.3s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLImageElement).style.filter = 'brightness(0.6)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLImageElement).style.filter = 'brightness(0.35)';
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      ))}

      {/* Floating VibeMail Messages */}
      {floatingMessages.map((msg, index) => (
        <div
          key={msg.id}
          onClick={() => onMessageClick ? onMessageClick() : null}
          style={{
            position: 'absolute',
            maxWidth: '180px',
            padding: '10px 14px',
            cursor: 'pointer',
            left: `${msg.x}%`,
            marginLeft: '-90px',
            top: 'calc(100% + 100px)',
            backgroundColor: 'rgba(212, 175, 55, 0.15)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '16px',
            zIndex: 50 + index,
            willChange: 'transform, opacity',
            animation: `floatMsg${index} ${msg.duration}s linear ${msg.delay}s infinite`,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '16px' }}>💌</span>
            <span style={{
              color: 'rgba(212, 175, 55, 0.7)',
              fontSize: '12px',
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {msg.message}
            </span>
          </div>
        </div>
      ))}

      <style jsx global>{`
        ${keyframesCSS}
      `}</style>
    </div>
  );
}

export default FloatingCardsBackground;
