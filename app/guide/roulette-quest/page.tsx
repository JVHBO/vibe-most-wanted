'use client';

import Link from 'next/link';

export default function RouletteQuestGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black text-vintage-ice p-4 sm:p-6">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎰</div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-vintage-gold tracking-wider uppercase">
            Roulette Quest
          </h1>
          <p className="text-vintage-ice/60 text-sm mt-1">
            Vibe Most Wanted — ARB Mode
          </p>
        </div>

        {/* What is this */}
        <div className="bg-vintage-charcoal/50 border border-vintage-gold/30 rounded-xl p-4 mb-4">
          <h2 className="text-vintage-gold font-bold text-sm uppercase tracking-wider mb-2">
            What is this quest?
          </h2>
          <p className="text-vintage-ice/80 text-sm leading-relaxed">
            Spin the roulette on <span className="text-vintage-gold font-bold">Vibe Most Wanted</span> and
            claim your prize on-chain. The quest verifies your transaction on Base or Arbitrum automatically.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-4">
          <h2 className="text-vintage-gold font-bold text-sm uppercase tracking-wider">
            How to complete
          </h2>

          {/* Step 1 */}
          <div className="flex gap-3 bg-vintage-charcoal/40 border border-vintage-gold/20 rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-vintage-gold text-vintage-black font-bold text-sm flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <p className="text-vintage-ice font-bold text-sm">Open the miniapp</p>
              <p className="text-vintage-ice/60 text-xs mt-0.5">
                Go to <span className="text-vintage-gold">vibemostwanted.xyz</span> or open it inside Farcaster/Warpcast.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3 bg-vintage-charcoal/40 border border-vintage-gold/20 rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-vintage-gold text-vintage-black font-bold text-sm flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <p className="text-vintage-ice font-bold text-sm">Activate ARB Mode (optional but recommended)</p>
              <p className="text-vintage-ice/60 text-xs mt-0.5">
                Tap the <span className="text-amber-400 font-bold">ARB</span> toggle on the home screen or in Settings.
                ARB mode gives you <span className="text-amber-400 font-bold">+1 extra free spin</span> and <span className="text-amber-400 font-bold">2x quest rewards</span>.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3 bg-vintage-charcoal/40 border border-vintage-gold/20 rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-vintage-gold text-vintage-black font-bold text-sm flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <p className="text-vintage-ice font-bold text-sm">Spin the roulette</p>
              <p className="text-vintage-ice/60 text-xs mt-0.5">
                Tap <span className="text-vintage-gold font-bold">SPIN</span> on the home screen. You get at least
                1 free spin per day. VibeFID holders get up to 3 spins.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-3 bg-vintage-charcoal/40 border border-vintage-gold/20 rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-vintage-gold text-vintage-black font-bold text-sm flex items-center justify-center shrink-0">
              4
            </div>
            <div>
              <p className="text-vintage-ice font-bold text-sm">Claim your prize on-chain</p>
              <p className="text-vintage-ice/60 text-xs mt-0.5">
                After spinning, tap <span className="text-vintage-gold font-bold">Claim</span> and confirm the transaction
                in your wallet. This creates the on-chain TX that verifies the quest.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-3 bg-green-500/10 border border-green-500/30 rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-green-500 text-black font-bold text-sm flex items-center justify-center shrink-0">
              ✓
            </div>
            <div>
              <p className="text-green-400 font-bold text-sm">Quest completes automatically</p>
              <p className="text-vintage-ice/60 text-xs mt-0.5">
                The platform verifies your wallet&apos;s on-chain roulette TX. No need to submit proof manually.
              </p>
            </div>
          </div>
        </div>

        {/* ARB Bonus box */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🟠</span>
            <h3 className="text-amber-400 font-bold text-sm uppercase tracking-wider">ARB Mode Bonuses</h3>
          </div>
          <ul className="space-y-1 text-xs text-vintage-ice/80">
            <li>• <span className="text-amber-400 font-bold">+1 free roulette spin</span> per day</li>
            <li>• <span className="text-amber-400 font-bold">2x coins</span> on all missions & quests</li>
            <li>• <span className="text-amber-400 font-bold">+1 free pack</span> per day in the Shop</li>
            <li>• Cheaper VibeFID mint on Arbitrum</li>
          </ul>
        </div>

        {/* CTA */}
        <Link
          href="https://vibemostwanted.xyz"
          target="_blank"
          className="block w-full py-4 bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black font-display font-bold text-center rounded-xl transition-all shadow-[0_4px_0_rgba(0,0,0,0.4)] hover:shadow-[0_2px_0_rgba(0,0,0,0.4)] hover:translate-y-[2px] text-sm uppercase tracking-wider"
        >
          🎰 Open Vibe Most Wanted
        </Link>

        <p className="text-center text-vintage-ice/30 text-xs mt-4">
          vibemostwanted.xyz · Base & Arbitrum
        </p>
      </div>
    </div>
  );
}
