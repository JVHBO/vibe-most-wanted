import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BattleArena } from '@/app/(game)/components/battle/BattleArena';

// Mock CardMedia and FoilCardEffect
vi.mock('@/components/CardMedia', () => ({
  CardMedia: (props: any) => <img src={props.src} alt={props.alt || ''} />,
}));
vi.mock('@/components/FoilCardEffect', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

const baseProps = {
  isOpen: true,
  battleMode: 'normal' as const,
  battlePhase: 'cards',
  playerCards: [
    { tokenId: '1', imageUrl: '/p1.png', power: 100, collection: 'vibe' },
    { tokenId: '2', imageUrl: '/p2.png', power: 50, collection: 'vibe' },
  ],
  opponentCards: [
    { tokenId: '3', imageUrl: '/o1.png', power: 80, collection: 'vibe' },
    { tokenId: '4', imageUrl: '/o2.png', power: 60, collection: 'vibe' },
  ],
  playerPower: 300,
  opponentPower: 280,
  player: { name: 'Player1', pfp: null, fallbackInitials: 'PL' },
  opponent: { name: 'Mecha Bot', pfp: null, fallbackInitials: 'ME' },
  result: '',
  winLabel: 'You Win!',
  loseLabel: 'You Lose!',
  currentRound: 1,
  roundResults: [] as ('win' | 'loss' | 'tie')[],
  eliminationPlayerScore: 0,
  eliminationOpponentScore: 0,
  orderedPlayerCards: [],
  orderedOpponentCards: [],
  battleTitle: 'BATTLE',
};

describe('BattleArena', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<BattleArena {...baseProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders player and opponent names', () => {
    render(<BattleArena {...baseProps} />);
    expect(screen.getByText('Player1')).toBeInTheDocument();
    expect(screen.getByText('Mecha Bot')).toBeInTheDocument();
  });

  it('renders battle title in normal mode', () => {
    render(<BattleArena {...baseProps} />);
    expect(screen.getByText('BATTLE')).toBeInTheDocument();
  });

  it('renders elimination mode header', () => {
    render(<BattleArena {...baseProps} battleMode="elimination" />);
    expect(screen.getByText(/ELIMINATION MODE/)).toBeInTheDocument();
    expect(screen.getByText(/Round 1\/5/)).toBeInTheDocument();
  });

  it('shows result when battlePhase is result', () => {
    render(<BattleArena {...baseProps} battlePhase="result" result="You Win!" />);
    expect(screen.getByText('You Win!')).toBeInTheDocument();
  });
});
