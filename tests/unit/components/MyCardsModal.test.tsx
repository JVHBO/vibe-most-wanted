import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyCardsModal } from '@/app/(game)/components/modals/MyCardsModal';

vi.mock('@/components/CardMedia', () => ({
  CardMedia: (props: any) => <img src={props.src} alt={props.alt || ''} />,
}));
vi.mock('@/lib/audio-manager', () => ({
  AudioManager: { buttonClick: vi.fn() },
}));

const mockNfts = [
  { tokenId: '1', imageUrl: '/c1.png', name: 'Card 1', rarity: 'Common', collection: 'vibe' },
  { tokenId: '2', imageUrl: '/c2.png', name: 'Card 2', rarity: 'Legendary', collection: 'vibe' },
];

describe('MyCardsModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <MyCardsModal isOpen={false} onClose={() => {}} nfts={mockNfts} soundEnabled={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders card count in title', () => {
    render(<MyCardsModal isOpen={true} onClose={() => {}} nfts={mockNfts} soundEnabled={false} />);
    expect(screen.getByText('My Cards (2)')).toBeInTheDocument();
  });

  it('renders card images', () => {
    render(<MyCardsModal isOpen={true} onClose={() => {}} nfts={mockNfts} soundEnabled={false} />);
    expect(screen.getByAltText('Card 1')).toBeInTheDocument();
    expect(screen.getByAltText('Card 2')).toBeInTheDocument();
  });

  it('shows empty state when no cards', () => {
    render(<MyCardsModal isOpen={true} onClose={() => {}} nfts={[]} soundEnabled={false} />);
    expect(screen.getByText('No cards yet')).toBeInTheDocument();
    expect(screen.getByText('Get Cards')).toBeInTheDocument();
  });

  it('applies rarity border colors', () => {
    const { container } = render(
      <MyCardsModal isOpen={true} onClose={() => {}} nfts={mockNfts} soundEnabled={false} />
    );
    const cards = container.querySelectorAll('.aspect-\\[2\\/3\\]');
    expect(cards[0].className).toContain('border-vintage-gold/30');
    expect(cards[1].className).toContain('border-yellow-400');
  });
});
