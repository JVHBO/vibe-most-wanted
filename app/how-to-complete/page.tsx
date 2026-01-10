'use client';

import Link from 'next/link';

export default function HowToCompletePage() {
  return (
    <div className="min-h-screen bg-vintage-dark text-vintage-cream p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-wanted text-vintage-gold mb-6">
          How to Complete the Quest
        </h1>

        <div className="bg-vintage-charcoal/50 rounded-xl p-6 border border-vintage-gold/30 space-y-6">
          <section>
            <h2 className="text-xl font-bold text-vintage-gold mb-3">
              Mint a VibeFID Card
            </h2>
            <p className="text-vintage-cream/80 mb-4">
              VibeFID is your unique Farcaster identity card on Base chain.
              Each card shows your Neynar social score and criminal backstory.
            </p>
            <Link
              href="https://farcaster.xyz/miniapps/aisYLhjuH5_G/vibefid"
              target="_blank"
              className="inline-block bg-vintage-gold text-vintage-dark px-6 py-3 rounded-lg font-bold hover:bg-vintage-gold/80 transition text-lg"
            >
              Mint VibeFID
            </Link>
          </section>

          <div className="border-t border-vintage-gold/20 pt-6">
            <p className="text-vintage-cream/70 text-sm">
              Once you mint your VibeFID, the quest will auto-verify using your connected wallet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
