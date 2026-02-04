import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PowerDisplay } from '@/app/(game)/components/battle/PowerDisplay';

describe('PowerDisplay', () => {
  it('renders power value', () => {
    const { container } = render(<PowerDisplay power={1500} color="blue" battlePhase="cards" />);
    const p = container.querySelector('p');
    expect(p?.textContent).toBe((1500).toLocaleString());
  });

  it('applies blue color class', () => {
    const { container } = render(
      <PowerDisplay power={100} color="blue" battlePhase="cards" />
    );
    const p = container.querySelector('p');
    expect(p?.className).toContain('text-vintage-neon-blue');
  });

  it('applies red color class', () => {
    const { container } = render(
      <PowerDisplay power={100} color="red" battlePhase="cards" />
    );
    const p = container.querySelector('p');
    expect(p?.className).toContain('text-red-400');
  });

  it('shows label when provided', () => {
    render(<PowerDisplay power={200} color="blue" battlePhase="cards" label="Total Power" />);
    expect(screen.getByText('Total Power')).toBeInTheDocument();
  });

  it('renders zero power', () => {
    render(<PowerDisplay power={0} color="blue" battlePhase="cards" />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
