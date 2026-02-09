'use client';

import Link from 'next/link';

const SAMPLE_CARDS = [
  'https://ipfs.filebase.io/ipfs/QmfHk64Kwd9Qnn7MwaBcTuXZiMDMubsoBqbQ9NpJ7QkdzW',
  'https://ipfs.filebase.io/ipfs/QmSUye2194NvSzk4Q6iQ35jHzFQn8yceKrP1ACD69i6zmw',
  'https://ipfs.filebase.io/ipfs/QmdLjTGh1f8jtqqHxU5B2Z4zcTezCeV9NpVeWmNXUMQd3M',
];

export default function HowToCompletePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-vintage-black via-vintage-charcoal to-vintage-black text-white p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-vintage text-vintage-gold mb-2 drop-shadow-lg">
            VibeFID Quest
          </h1>
          <p className="text-vintage-gold/70 text-lg">
            Mint your Farcaster identity card
          </p>
        </div>

        {/* Sample Cards with Videos */}
        <div className="flex justify-center gap-4 mb-8 overflow-hidden">
          {SAMPLE_CARDS.map((url, i) => (
            <div
              key={i}
              className="relative w-32 h-44 rounded-lg overflow-hidden border-2 border-vintage-gold/30 shadow-gold hover:scale-105 transition-transform"
              style={{ transform: `rotate(${(i - 1) * 8}deg)` }}
            >
              <video
                src={url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Main Card */}
        <div className="bg-gradient-to-br from-vintage-charcoal to-vintage-deep-black rounded-2xl p-8 border border-vintage-gold/40 shadow-gold-lg">
          <h2 className="text-2xl font-vintage text-vintage-gold mb-4 flex items-center gap-3">
            <span className="text-3xl">🎴</span>
            Mint a VibeFID Card
          </h2>

          <p className="text-gray-300 mb-6 text-lg leading-relaxed">
            VibeFID is your unique <span className="text-vintage-gold font-bold">Farcaster identity card</span> on Base chain.
            Each card displays your Neynar social score and a unique criminal backstory.
          </p>

          <Link
            href="https://farcaster.xyz/miniapps/aisYLhjuH5_G/vibefid"
            target="_blank"
            className="bg-gradient-to-r from-vintage-gold to-vintage-gold-dark text-vintage-black px-8 py-4 rounded-xl font-bold text-xl hover:shadow-gold-lg transition-all transform hover:scale-105"
          >
            Mint VibeFID →
          </Link>
        </div>

        {/* Info */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            ✓ Once you mint, the quest will auto-verify using your connected wallet
          </p>
        </div>
      </div>
    </div>
  );
}
