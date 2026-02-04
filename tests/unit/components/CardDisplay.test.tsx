import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardDisplay } from '@/components/cards/CardDisplay';

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

describe('CardDisplay', () => {
  const baseCard = {
    imageUrl: 'https://example.com/card.png',
    tokenId: '123',
    name: 'Test Card',
    power: 100,
    collection: 'vibe',
  };

  it('renders card image and power', () => {
    render(<CardDisplay card={baseCard} />);
    const img = screen.getByAltText('Test Card');
    expect(img).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument(); // vibe = 2x
  });

  it('shows selected state with checkmark', () => {
    const { container } = render(<CardDisplay card={baseCard} isSelected />);
    const button = container.querySelector('button');
    expect(button?.className).toContain('border-vintage-neon-blue');
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<CardDisplay card={baseCard} onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('hides power when showPower is false', () => {
    render(<CardDisplay card={baseCard} showPower={false} />);
    expect(screen.queryByText('200')).not.toBeInTheDocument();
  });

  it('shows fallback when no imageUrl', () => {
    render(<CardDisplay card={{ power: 10 }} />);
    expect(screen.getByText('No img')).toBeInTheDocument();
  });
});
