import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardSelector } from '@/components/game/CardSelector';

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

function makeCards(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    tokenId: `token-${i}`,
    name: `Card ${i}`,
    imageUrl: `https://example.com/${i}.png`,
    power: (i + 1) * 10,
    collection: 'vibe',
  }));
}

describe('CardSelector', () => {
  it('renders all cards', () => {
    const cards = makeCards(3);
    render(
      <CardSelector
        cards={cards}
        selectedCards={[]}
        onSelectionChange={() => {}}
        maxSelection={5}
      />
    );
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('calls onSelectionChange when card clicked', () => {
    const cards = makeCards(2);
    const onChange = vi.fn();
    render(
      <CardSelector
        cards={cards}
        selectedCards={[]}
        onSelectionChange={onChange}
        maxSelection={5}
      />
    );
    fireEvent.click(screen.getByAltText('Card 0'));
    expect(onChange).toHaveBeenCalledWith([cards[0]]);
  });

  it('removes card from selection on second click', () => {
    const cards = makeCards(2);
    const onChange = vi.fn();
    render(
      <CardSelector
        cards={cards}
        selectedCards={[cards[0]]}
        onSelectionChange={onChange}
        maxSelection={5}
      />
    );
    fireEvent.click(screen.getByAltText('Card 0'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('does not exceed maxSelection', () => {
    const cards = makeCards(3);
    const onChange = vi.fn();
    render(
      <CardSelector
        cards={cards}
        selectedCards={[cards[0], cards[1]]}
        onSelectionChange={onChange}
        maxSelection={2}
      />
    );
    fireEvent.click(screen.getByAltText('Card 2'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows selection count and total power', () => {
    const cards = makeCards(3);
    render(
      <CardSelector
        cards={cards}
        selectedCards={[cards[0], cards[1]]}
        onSelectionChange={() => {}}
        maxSelection={5}
      />
    );
    expect(screen.getByText('2/5 selected')).toBeInTheDocument();
    // Card 0: power 10 * 2x vibe = 20, Card 1: power 20 * 2x = 40 → 60
    expect(screen.getByText(/Power: 60/)).toBeInTheDocument();
  });
});
