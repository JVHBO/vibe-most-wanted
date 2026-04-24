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
              VibeFID Card
            </h2>
            <p className="text-vintage-cream/80 mb-4">
              VibeFID é seu card de identidade único no Farcaster na Base chain.
              O mint foi encerrado — todos os 572 cards foram mintados.
            </p>
            <span className="inline-block bg-zinc-700 text-zinc-400 px-6 py-3 rounded-lg font-bold text-lg cursor-not-allowed">
              🔒 Mint Encerrado
            </span>
          </section>

          <div className="border-t border-vintage-gold/20 pt-6">
            <p className="text-vintage-cream/70 text-sm">
              Se você já tem um VibeFID, a quest será verificada automaticamente pela sua wallet conectada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
