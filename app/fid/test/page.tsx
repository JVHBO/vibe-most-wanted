'use client';

import { useState } from 'react';
import { generateFarcasterCardImage } from '@/lib/generateFarcasterCard';
import { getFidTraits } from '@/lib/fidTraits';
import { generateCardVideo } from '@/lib/generateCardVideo';
import { VIBEFID_POWER_CONFIG } from '@/lib/utils/card-power';
import FoilCardEffect from '@/components/FoilCardEffect';

export default function FidTestPage() {
  const [fid, setFid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardData, setCardData] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!fid || isNaN(Number(fid))) {
      setError('Digite um FID válido');
      return;
    }

    setLoading(true);
    setError(null);
    setCardData(null);
    setVideoUrl(null);

    try {
      const fidNumber = Number(fid);

      // Fetch Neynar data
      const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fidNumber}`, {
        headers: {
          'api_key': process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '',
        },
      });

      if (!response.ok) {
        throw new Error('FID não encontrado no Neynar');
      }

      const data = await response.json();
      const userData = data.users[0];

      // Generate FID traits
      const traits = getFidTraits(fidNumber);

      // Calculate power
      const score = userData.experimental?.neynar_user_score || 0;
      const rarity = score >= 0.9 ? 'Mythic' :
                     score >= 0.7 ? 'Legendary' :
                     score >= 0.5 ? 'Epic' :
                     score >= 0.3 ? 'Rare' : 'Common';

      const rarityKey = rarity.toLowerCase() as 'mythic' | 'legendary' | 'epic' | 'rare' | 'common';
      const basePower = VIBEFID_POWER_CONFIG.rarityBase[rarityKey];

      const wearKey = traits.wear.toLowerCase().replace(' ', '') as 'pristine' | 'mint';
      const wearMult = VIBEFID_POWER_CONFIG.wearMultiplier[wearKey] || VIBEFID_POWER_CONFIG.wearMultiplier.default;

      const foilKey = traits.foil.toLowerCase() as 'prize' | 'standard' | 'none';
      const foilMult = VIBEFID_POWER_CONFIG.foilMultiplier[foilKey];

      const power = Math.round(basePower * wearMult * foilMult);

      // Random card values
      const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
      const suit = suits[Math.floor(Math.random() * suits.length)] as any;
      const suitSymbols: any = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
      const suitSymbol = suitSymbols[suit];
      const color = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
      const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const rank = ranks[Math.floor(Math.random() * ranks.length)] as any;

      // Generate card image
      const cardImageDataUrl = await generateFarcasterCardImage({
        fid: fidNumber,
        username: userData.username,
        displayName: userData.display_name,
        pfpUrl: userData.pfp_url,
        bio: userData.profile?.bio?.text || "",
        neynarScore: score,
        suit,
        suitSymbol,
        rank,
        color,
        rarity,
        bounty: power * 10,
      });

      // Generate video with foil effect
      setError('Gerando vídeo com efeito foil...');
      const videoBlob = await generateCardVideo({
        cardImageDataUrl,
        foilType: traits.foil as 'None' | 'Standard' | 'Prize',
        duration: 8,
        fps: 30,
      });

      const videoObjectUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(videoObjectUrl);

      setCardData({
        fid: fidNumber,
        username: userData.username,
        displayName: userData.display_name,
        pfpUrl: userData.pfp_url,
        rarity,
        foil: traits.foil,
        wear: traits.wear,
        power,
        suit,
        rank,
        suitSymbol,
        color,
        cardImage: cardImageDataUrl,
      });

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar carta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-display font-bold text-vintage-gold mb-8 text-center">
          🧪 VibeFID Test Generator
        </h1>

        {/* Input */}
        <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-6 mb-8">
          <div className="flex gap-4">
            <input
              type="number"
              value={fid}
              onChange={(e) => setFid(e.target.value)}
              placeholder="Digite o FID (ex: 2, 214746, 5000)"
              className="flex-1 px-4 py-3 bg-vintage-charcoal border-2 border-vintage-gold/30 rounded-lg text-vintage-ice focus:outline-none focus:border-vintage-gold"
            />
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-8 py-3 bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Gerando...' : 'Gerar'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="mt-4 text-vintage-ice/70 text-sm">
            <p><strong>FIDs para testar:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>FID ≤ 5,000: 100% Prize Foil + Pristine</li>
              <li>FID 5,001-20,000: 75% Prize, 20% Standard</li>
              <li>FID 20,001-100,000: 15% Prize, 50% Standard</li>
              <li>FID 100,001-250,000: 8% Prize, 45% Standard</li>
              <li>FID 250,001+: Mostly None</li>
            </ul>
          </div>
        </div>

        {/* Card Display */}
        {cardData && (
          <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Static PNG with CSS Foil Effect */}
              <div>
                <h3 className="text-xl font-bold text-vintage-gold mb-4 text-center">
                  PNG + CSS Foil Effect
                </h3>
                <FoilCardEffect
                  foilType={cardData.foil === 'None' ? null : (cardData.foil as 'Standard' | 'Prize')}
                  className="w-full rounded-lg shadow-2xl border-4 border-vintage-gold overflow-hidden"
                >
                  <img
                    src={cardData.cardImage}
                    alt="Card Preview"
                    className="w-full"
                  />
                </FoilCardEffect>
                <p className="text-vintage-ice/70 text-sm text-center mt-2">
                  (Como aparece no site com FoilCardEffect wrapper)
                </p>
              </div>

              {/* Video with Rendered Foil */}
              <div>
                <h3 className="text-xl font-bold text-vintage-gold mb-4 text-center">
                  Vídeo IPFS (efeito renderizado)
                </h3>
                {videoUrl ? (
                  <>
                    <video
                      src={videoUrl}
                      loop
                      muted
                      autoPlay
                      playsInline
                      className="w-full rounded-lg shadow-2xl border-4 border-vintage-gold"
                    />
                    <p className="text-vintage-ice/70 text-sm text-center mt-2">
                      (Como vai aparecer no IPFS/OpenSea)
                    </p>
                  </>
                ) : (
                  <div className="w-full aspect-[5/7] bg-vintage-charcoal/50 rounded-lg border-4 border-vintage-gold/30 flex items-center justify-center">
                    <span className="text-vintage-ice/50">Gerando vídeo...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-8 bg-vintage-charcoal/80 rounded-lg border border-vintage-gold/30 p-6">
              <h3 className="text-xl font-bold text-vintage-gold mb-4 text-center">
                Card Stats
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-vintage-burnt-gold font-semibold text-sm">FID</div>
                  <div className="text-vintage-ice font-bold text-lg">{cardData.fid}</div>
                </div>
                <div>
                  <div className="text-vintage-burnt-gold font-semibold text-sm">Card</div>
                  <div className={`font-bold text-lg ${cardData.color === 'red' ? 'text-red-500' : 'text-white'}`}>
                    {cardData.rank}{cardData.suitSymbol}
                  </div>
                </div>
                <div>
                  <div className="text-vintage-burnt-gold font-semibold text-sm">Rarity</div>
                  <div className="text-vintage-ice font-bold text-lg">{cardData.rarity}</div>
                </div>
                <div>
                  <div className="text-vintage-burnt-gold font-semibold text-sm">Power</div>
                  <div className="text-vintage-gold font-bold text-lg">{cardData.power}</div>
                </div>
                <div>
                  <div className="text-vintage-burnt-gold font-semibold text-sm">Foil</div>
                  <div className={`font-bold text-lg ${
                    cardData.foil === 'Prize' ? 'text-purple-400' :
                    cardData.foil === 'Standard' ? 'text-blue-400' :
                    'text-vintage-ice'
                  }`}>
                    {cardData.foil}
                  </div>
                </div>
                <div>
                  <div className="text-vintage-burnt-gold font-semibold text-sm">Wear</div>
                  <div className="text-vintage-ice font-bold text-lg">{cardData.wear}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-vintage-burnt-gold font-semibold text-sm">Username</div>
                  <div className="text-vintage-ice font-bold text-lg">@{cardData.username}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
