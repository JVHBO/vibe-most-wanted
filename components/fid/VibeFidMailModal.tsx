'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/fid/convex-generated/api';
import { CardMedia } from '@/components/fid/CardMedia';
import FoilCardEffect from '@/components/fid/FoilCardEffect';
import { VibeMailInbox } from '@/components/fid/VibeMail';
import { VibeFIDConvexProvider } from '@/contexts/VibeFIDConvexProvider';

interface VibeFidMailModalProps {
  fid: number;
  username?: string;
  onClose: () => void;
}

const RARITY_BASE_POWER: Record<string, number> = { Common: 10, Rare: 20, Epic: 50, Legendary: 100, Mythic: 600 };
const WEAR_MULT: Record<string, number> = { Pristine: 1.8, Mint: 1.4, 'Lightly Played': 1.0, 'Moderately Played': 1.0, 'Heavily Played': 1.0 };
const FOIL_MULT: Record<string, number> = { Prize: 6.0, Standard: 2.0, None: 1.0 };

function calcPower(rarity: string, wear: string, foil: string) {
  return Math.round((RARITY_BASE_POWER[rarity] || 5) * (WEAR_MULT[wear] || 1) * (FOIL_MULT[foil] || 1));
}

function ModalInner({ fid, username, onClose }: VibeFidMailModalProps) {
  const [mobilePanel, setMobilePanel] = useState<'card' | 'mail'>('mail');
  const router = useRouter();
  const fidCards = useQuery(api.farcasterCards.getFarcasterCardsByFid, { fid });
  const card = fidCards?.[0];
  const power = card ? calcPower(card.rarity, card.wear, card.foil) : 0;

  return (
    <div className="fixed inset-0 z-[600] bg-black/85 flex items-end sm:items-center justify-center">
      <div
        className="w-full sm:max-w-2xl border-4 border-black shadow-[8px_8px_0px_#FFD700] flex flex-col"
        style={{ height: '92dvh', background: '#0a0a0a' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b-4 border-black flex-shrink-0" style={{ background: '#FFD700' }}>
          <span className="font-black text-black text-sm uppercase tracking-widest">VibeFID Mail</span>
          {/* Mobile tabs */}
          <div className="flex gap-1 sm:hidden">
            <button
              onClick={() => setMobilePanel('card')}
              className={`px-3 py-1 text-xs font-black border-2 border-black transition-all ${mobilePanel === 'card' ? 'bg-black text-[#FFD700]' : 'bg-white text-black'}`}
            >Card</button>
            <button
              onClick={() => setMobilePanel('mail')}
              className={`px-3 py-1 text-xs font-black border-2 border-black transition-all ${mobilePanel === 'mail' ? 'bg-black text-[#FFD700]' : 'bg-white text-black'}`}
            >Mail</button>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-black text-[#FFD700] font-black border-2 border-black hover:bg-[#222] flex items-center justify-center flex-shrink-0"
          >X</button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Card panel */}
          <div className={`w-44 flex-shrink-0 border-r-4 border-black bg-[#111] flex-col items-center gap-3 p-3 overflow-y-auto ${mobilePanel === 'mail' ? 'hidden sm:flex' : 'flex'}`}>
            {card ? (
              <>
                <FoilCardEffect
                  foilType={card.foil === 'None' ? null : (card.foil as 'Standard' | 'Prize' | null)}
                  className="w-full shadow-[4px_4px_0px_#000] overflow-hidden"
                >
                  <CardMedia src={card.imageUrl || card.pfpUrl} alt={card.username} className="w-full" />
                </FoilCardEffect>
                <div className="w-full space-y-2 text-xs">
                  <p className="text-[#FFD700] font-black truncate">@{card.username}</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="bg-[#333] border border-[#555] px-1.5 py-0.5 text-white/70 text-[10px]">{card.rarity}</span>
                    {card.foil && card.foil !== 'None' && (
                      <span className="bg-blue-900/50 border border-blue-500/50 px-1.5 py-0.5 text-blue-300 text-[10px]">{card.foil}</span>
                    )}
                  </div>
                  <p className="text-[#FFD700] font-bold">⚡ {power.toLocaleString()}</p>
                  <div className="bg-black/60 border border-[#333] p-2 space-y-0.5">
                    <p className="text-white/40 text-[10px] uppercase tracking-wider">Neynar Score</p>
                    <p className="text-white font-black text-xl leading-none">{card.neynarScore?.toFixed(3)}</p>
                    <p className="text-[#FFD700] text-[10px]">{card.rarity}</p>
                  </div>
                  <p className="text-white/30">♥ {card.votes || 0} vibes</p>
                  <p className="text-white/20 text-[10px]">FID #{card.fid}</p>
                </div>
              </>
            ) : fidCards === undefined ? (
              <p className="text-white/40 text-xs animate-pulse text-center pt-4">Loading...</p>
            ) : (
              <div className="flex flex-col items-center gap-3 pt-4 text-center">
                <p className="text-white/40 text-xs">No VibeFID card yet</p>
                <button
                  onClick={() => { onClose(); router.push('/fid'); }}
                  className="w-full py-2 bg-[#FFD700] border-2 border-black shadow-[3px_3px_0px_#000] text-black font-black text-xs uppercase tracking-wide hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  Mint Now
                </button>
              </div>
            )}
          </div>

          {/* Right: VibeMail inbox */}
          <div className={`flex-1 overflow-y-auto ${mobilePanel === 'card' ? 'hidden sm:block' : 'block'}`}>
            <VibeMailInbox
              cardFid={fid}
              username={card?.username || username}
              onClose={onClose}
              asPage={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function VibeFidMailModal(props: VibeFidMailModalProps) {
  return (
    <VibeFIDConvexProvider>
      <ModalInner {...props} />
    </VibeFIDConvexProvider>
  );
}
