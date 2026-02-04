import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BattleResults } from '@/app/(game)/components/battle/BattleResults';

describe('BattleResults', () => {
  it('renders nothing when phase is not result', () => {
    const { container } = render(
      <BattleResults
        result="You Win!"
        battlePhase="clash"
        battleMode="normal"
        winLabel="You Win!"
        loseLabel="You Lose!"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when result is empty', () => {
    const { container } = render(
      <BattleResults
        result=""
        battlePhase="result"
        battleMode="normal"
        winLabel="You Win!"
        loseLabel="You Lose!"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows green text for win', () => {
    render(
      <BattleResults
        result="You Win!"
        battlePhase="result"
        battleMode="normal"
        winLabel="You Win!"
        loseLabel="You Lose!"
      />
    );
    const el = screen.getByText('You Win!');
    expect(el.className).toContain('text-green-400');
  });

  it('shows red text for loss', () => {
    render(
      <BattleResults
        result="You Lose!"
        battlePhase="result"
        battleMode="normal"
        winLabel="You Win!"
        loseLabel="You Lose!"
      />
    );
    const el = screen.getByText('You Lose!');
    expect(el.className).toContain('text-red-400');
  });

  it('shows elimination round text', () => {
    render(
      <BattleResults
        result="You Win!"
        battlePhase="result"
        battleMode="elimination"
        currentRound={2}
        winLabel="You Win!"
        loseLabel="You Lose!"
      />
    );
    expect(screen.getByText(/ROUND WIN/)).toBeInTheDocument();
  });
});
