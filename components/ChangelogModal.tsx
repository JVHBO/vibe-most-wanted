'use client';

import { Modal } from '@/app/(game)/components/ui/Modal';

export const CHANGELOG_VERSION = '0.3.0';
export const CHANGELOG_STORAGE_KEY = 'vmw_changelog_seen';

interface ChangelogEntry {
  version: string;
  date: string;
  isNew?: boolean;
  features: { emoji: string; text: string }[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.3.0',
    date: 'Week of Mar 17, 2026',
    isNew: true,
    features: [
      { emoji: '📋', text: 'Changelog modal — stay updated on new features' },
      { emoji: '🐛', text: 'Bug report system with screenshot & auto device info' },
      { emoji: '🛡️', text: 'Security hardened — anti-exploit protection' },
      { emoji: '🔒', text: 'FID authentication improved' },
    ],
  },
  {
    version: '0.2.8',
    date: 'Week of Mar 10, 2026',
    features: [
      { emoji: '⚡', text: 'Performance improvements across all game modes' },
      { emoji: '🐛', text: 'Fixed quest claim edge cases' },
      { emoji: '💬', text: 'Vibemail stability fixes' },
    ],
  },
  {
    version: '0.2.5',
    date: 'Week of Feb 17, 2026',
    features: [
      { emoji: '📬', text: 'Vibemail — send messages to card holders' },
      { emoji: '🎯', text: 'Daily & weekly quests with VBMS rewards' },
      { emoji: '💰', text: 'Coins inbox — claim all your pending rewards' },
      { emoji: '🏆', text: 'Weekly leaderboard with automatic payouts' },
    ],
  },
  {
    version: '0.2.2',
    date: 'Week of Feb 3, 2026',
    features: [
      { emoji: '🌐', text: 'Arbitrum chain support added' },
      { emoji: '🃏', text: 'Defense Deck system for PvP meta' },
      { emoji: '📊', text: 'Aura leaderboard revamped' },
    ],
  },
  {
    version: '0.2.0',
    date: 'Week of Jan 20, 2026',
    features: [
      { emoji: '⚔️', text: 'Raid Boss — cooperative battles with power bonuses' },
      { emoji: '🎰', text: 'Baccarat casino with VBMS wagering' },
      { emoji: '🤺', text: 'PvP Poker Battle with entry fees' },
    ],
  },
  {
    version: '0.1.5',
    date: 'Week of Dec 9, 2025',
    features: [
      { emoji: '🃏', text: 'Vibe Clash TCG — 54 unique cards, 6 turns, 3 lanes' },
      { emoji: '✨', text: 'Combo & synergy system for card pairs' },
      { emoji: '🔊', text: 'AI voice combo callouts' },
    ],
  },
  {
    version: '0.1.0',
    date: 'Week of Nov 25, 2025',
    features: [
      { emoji: '🚀', text: 'Vibe Most Wanted officially launched' },
      { emoji: '🔗', text: 'Farcaster miniapp integration' },
      { emoji: '🌍', text: '10 language support' },
      { emoji: '🎮', text: 'PvE battle mode vs CPU' },
    ],
  },
];

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: any) => string;
}

export function ChangelogModal({ isOpen, onClose, t }: ChangelogModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md" zIndex={200}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <h2 className="font-display font-bold text-vintage-gold text-xl">
              {t('changelogTitle')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-vintage-gold/60 hover:text-vintage-gold text-xl leading-none transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Entries */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {CHANGELOG.map((entry) => (
            <div
              key={entry.version}
              className="bg-vintage-black/50 rounded-xl border border-vintage-gold/20 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="font-display font-bold text-vintage-gold text-sm">
                  v{entry.version}
                </span>
                <span className="text-vintage-gold/40 text-xs">•</span>
                <span className="text-vintage-gold/60 text-xs">{entry.date}</span>
                {entry.isNew && (
                  <span className="ml-auto text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/40 rounded px-2 py-0.5 uppercase tracking-wide">
                    {t('changelogNew')}
                  </span>
                )}
              </div>
              <ul className="space-y-1.5">
                {entry.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-vintage-gold/80">
                    <span className="shrink-0 mt-0.5">{f.emoji}</span>
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2.5 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-display font-bold text-sm transition-all"
        >
          {t('changelogClose')}
        </button>
      </div>
    </Modal>
  );
}
