'use client';

import Link from 'next/link';
import { LanguageSelect } from '@/components/SettingsModal';

export default function RouletteQuestGuidePage() {

  return (
    <div
      className="flex flex-col h-screen text-vintage-ice"
      style={{ background: 'linear-gradient(to bottom, #1A1A1A, #121212)' }}
    >

      {/* Fixed Header */}
      <div
        className="shrink-0 z-20 border-b border-vintage-gold/30 px-3 py-2.5 flex items-center justify-between"
        style={{ background: '#1a1a1a' }}
      >
        <h1 className="text-sm font-display font-bold text-vintage-ice tracking-widest uppercase">
          🎰 Roulette Quest
        </h1>
        <LanguageSelect />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">

        {/* ARB banner */}
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-3 flex items-center gap-2">
          <span className="text-xl">🟠</span>
          <div>
            <p className="text-amber-400 font-bold text-xs">ARB Mode — Extra Bonuses</p>
            <p className="text-vintage-ice/60 text-[11px]">+1 free spin · 2x quest rewards · +1 free pack/day</p>
          </div>
        </div>

        {/* Steps compact */}
        <div className="bg-vintage-charcoal/50 border border-vintage-gold/20 rounded-xl overflow-hidden divide-y divide-vintage-gold/10">

          {[
            { n: '1', title: 'Spin the roulette', desc: 'Tap SPIN on the home screen. 1–4 free spins/day depending on your cards.' },
            { n: '2', title: 'Claim on-chain', desc: 'After spinning, tap Claim and confirm the TX in your wallet (Base or ARB).' },
            { n: '✓', title: 'Quest verified', desc: 'The platform detects your on-chain TX automatically.', green: true },
          ].map((step) => (
            <div key={step.n} className={`flex gap-3 p-3 ${step.green ? 'bg-green-500/5' : ''}`}>
              <div className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${step.green ? 'bg-green-500 text-black' : 'bg-vintage-gold text-vintage-black'}`}>
                {step.n}
              </div>
              <div>
                <p className={`font-bold text-xs ${step.green ? 'text-green-400' : 'text-vintage-ice'}`}>{step.title}</p>
                <p className="text-vintage-ice/55 text-[11px] mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}

        </div>

        {/* FAQ compact */}
        <div className="bg-vintage-charcoal/40 border border-vintage-gold/15 rounded-xl p-3 space-y-2">
          <p className="text-vintage-gold font-bold text-[10px] uppercase tracking-wider">FAQ</p>
          <div className="grid grid-cols-1 gap-2">
            <div>
              <p className="text-vintage-ice/80 text-[11px] font-bold">Which chain counts?</p>
              <p className="text-vintage-ice/45 text-[11px]">Both Base and Arbitrum. ARB gives extra bonuses.</p>
            </div>
            <div>
              <p className="text-vintage-ice/80 text-[11px] font-bold">Spun but didn't claim — does it count?</p>
              <p className="text-vintage-ice/45 text-[11px]">No. You must confirm the on-chain claim TX.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Fixed bottom CTA */}
      <div className="shrink-0 px-3 py-4 border-t border-vintage-gold/20" style={{ background: '#0c0c0c' }}>
        <Link
          href="/"
          className="block w-full py-6 bg-gradient-to-b from-vintage-gold to-vintage-burnt-gold text-vintage-black font-display font-black text-center rounded-2xl shadow-[0_6px_0_rgba(0,0,0,0.5)] hover:shadow-[0_2px_0_rgba(0,0,0,0.5)] hover:translate-y-[4px] transition-all text-3xl uppercase tracking-widest"
        >
          🎰 SPIN
        </Link>
      </div>

    </div>
  );
}
